// 更新分发：检查 → 下载 → 校验 → 交给用户安装。
//
// 为什么不用 electron-updater 的静默自更新：macOS 的 Squirrel 自更新要求 app 必须有 Developer ID 签名，
// 未签名的包会在校验签名时失败。这套流程对签名与否都成立——签了名体验一样，没签名也能用，
// 区别只是最后一步是用户把新版本拖进「应用程序」，而不是应用自己替换自己。
//
// Feed 是一个 JSON（放 GitHub Releases / OSS / 任意静态服务器都行）：
//   {
//     "version": "0.6.0",
//     "pubDate": "2026-09-20T10:00:00Z",
//     "notes": "成片流水线；偏好设置里能填密钥",
//     "minVersion": "0.4.0",              // 可选：低于这个版本必须更新
//     "mac": {
//       "arm64": { "url": "https://…/导演台-0.6.0-arm64.dmg", "sha256": "…", "size": 128974848 },
//       "x64":   { "url": "https://…/导演台-0.6.0-x64.dmg",   "sha256": "…", "size": 133169152 }
//     }
//   }
// 用 tools/make-update-manifest.mjs 从构建产物直接生成，sha256 与体积都算好。
import { app, dialog, shell, BrowserWindow, Notification } from "electron";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

// 没有默认更新源：发一版的时候把地址填进「偏好设置 → 更新」（或在这里写死）。
// 与其塞一个占位 URL 让每次启动都 404，不如没配就不查。
export const DEFAULT_FEED = "";
const SIX_HOURS = 6 * 60 * 60 * 1000;

// "0.10.2" > "0.9.9"：按段比数字，不做字典序
export function isNewer(a, b) {
  const parse = (v) => String(v || "0").split("-")[0].split(".").map((n) => Number(n) || 0);
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  }
  return false;
}

export function createUpdater({ prefs, savePrefs, getWindow, log = () => {} }) {
  let checking = false;
  let timer = null;

  const feed = () => prefs.updateFeed || DEFAULT_FEED;
  const configured = () => !!feed();
  const win = () => getWindow?.() || BrowserWindow.getAllWindows()[0] || null;

  async function fetchManifest() {
    const url = `${feed()}${feed().includes("?") ? "&" : "?"}t=${Date.now()}`; // 绕开 CDN 缓存
    const r = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "cache-control": "no-cache" } });
    if (!r.ok) throw Object.assign(new Error(`更新源返回 HTTP ${r.status}`), { code: "FEED_HTTP" });
    const m = await r.json();
    if (!m?.version) throw Object.assign(new Error("更新源格式不对：缺 version"), { code: "FEED_SHAPE" });
    return m;
  }

  function assetFor(manifest) {
    const arch = process.arch === "arm64" ? "arm64" : "x64";
    return manifest.mac?.[arch] || manifest.mac?.universal || null;
  }

  /**
   * @param opts { silent } — silent: 只在有更新时打扰，用于启动后和定时检查
   */
  async function check(opts = {}) {
    if (!configured()) {
      if (!opts.silent) await dialog.showMessageBox(win(), { type: "info", message: "还没有配置更新源", detail: "在「偏好设置 → 更新」里填更新源地址；发版流程见 docs/distribution.md。", buttons: ["好"] });
      return { ok: false, error: "NO_FEED" };
    }
    if (checking) return { ok: false, error: "BUSY" };
    checking = true;
    try {
      const manifest = await fetchManifest();
      const current = app.getVersion();
      if (!isNewer(manifest.version, current)) {
        log(`update: 已是最新 ${current}（源上是 ${manifest.version}）`);
        if (!opts.silent) await dialog.showMessageBox(win(), { type: "info", message: `已经是最新版本 ${current}`, detail: `更新源：${feed()}`, buttons: ["好"] });
        return { ok: true, upToDate: true, version: current };
      }
      // 用户跳过过这个版本，就别再烦他——除非是强制更新
      const forced = manifest.minVersion && isNewer(manifest.minVersion, current);
      if (opts.silent && prefs.skipVersion === manifest.version && !forced) return { ok: true, skipped: manifest.version };

      const asset = assetFor(manifest);
      if (!asset?.url) {
        if (!opts.silent) dialog.showErrorBox("无法更新", `更新源里没有适用于 ${process.arch} 的安装包。`);
        return { ok: false, error: "NO_ASSET" };
      }

      const buttons = forced ? ["下载并安装", "退出"] : ["下载并安装", "稍后", "跳过这个版本"];
      const r = await dialog.showMessageBox(win(), {
        type: "info",
        title: "有新版本",
        message: `导演台 ${manifest.version} 可以更新了（当前 ${current}）`,
        detail: [manifest.notes || "", forced ? "\n这是一个必须安装的版本。" : "", asset.size ? `\n下载体积约 ${(asset.size / 1e6).toFixed(0)} MB` : ""].filter(Boolean).join("\n"),
        buttons,
        defaultId: 0,
        cancelId: forced ? 1 : 1,
      });
      if (r.response === 2) { prefs.skipVersion = manifest.version; savePrefs(); return { ok: true, skipped: manifest.version }; }
      if (r.response === 1) { if (forced) app.quit(); return { ok: true, deferred: true }; }
      return await download(manifest, asset);
    } catch (err) {
      log(`update check failed: ${err.message}`);
      if (!opts.silent) dialog.showErrorBox("检查更新失败", `${err.message}\n\n更新源：${feed()}`);
      return { ok: false, error: err.code || "CHECK_FAILED", message: err.message };
    } finally {
      checking = false;
    }
  }

  async function download(manifest, asset) {
    const w = win();
    const name = decodeURIComponent(path.basename(new URL(asset.url).pathname)) || `director-${manifest.version}.dmg`;
    const dest = path.join(app.getPath("downloads"), name);
    const part = `${dest}.part`;
    try {
      const res = await fetch(asset.url, { signal: AbortSignal.timeout(30 * 60 * 1000) });
      if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}`);
      const total = Number(res.headers.get("content-length") || asset.size || 0);
      let got = 0;
      const hash = crypto.createHash("sha256");
      const body = Readable.fromWeb(res.body);
      body.on("data", (chunk) => {
        got += chunk.length;
        hash.update(chunk);
        if (total && w && !w.isDestroyed()) {
          w.setProgressBar(got / total);
          w.setTitle(`下载更新 ${Math.round((got / total) * 100)}% — 导演台`);
        }
      });
      await pipeline(body, fs.createWriteStream(part));
      if (w && !w.isDestroyed()) { w.setProgressBar(-1); w.setTitle("导演台"); }

      // 校验：下错了或被中间人换掉了，不给用户装
      if (asset.sha256) {
        const got256 = hash.digest("hex");
        if (got256.toLowerCase() !== String(asset.sha256).toLowerCase()) {
          fs.rmSync(part, { force: true });
          dialog.showErrorBox("更新包校验失败", `下载到的文件和更新源声明的 sha256 不一致，已删除。\n\n期望 ${asset.sha256}\n实际 ${got256}`);
          return { ok: false, error: "CHECKSUM_MISMATCH" };
        }
      }
      fs.rmSync(dest, { force: true });
      fs.renameSync(part, dest);
      log(`update: 已下载 ${dest}`);

      if (Notification.isSupported()) new Notification({ title: "更新已下载", body: `导演台 ${manifest.version} · 打开安装包完成安装` }).show();
      const r = await dialog.showMessageBox(w, {
        type: "info",
        title: "更新已下载",
        message: `导演台 ${manifest.version} 已下载完成`,
        detail: `${dest}\n\n点「打开安装包」后，把「导演台」拖进「应用程序」覆盖旧版本，然后重新打开。\n（工程与媒体都在用户数据目录里，不会被覆盖。）`,
        buttons: ["打开安装包", "在访达中显示", "稍后"],
        defaultId: 0,
        cancelId: 2,
      });
      if (r.response === 0) { shell.openPath(dest); app.quit(); }
      else if (r.response === 1) shell.showItemInFolder(dest);
      return { ok: true, downloaded: dest, version: manifest.version };
    } catch (err) {
      fs.rmSync(part, { force: true });
      if (w && !w.isDestroyed()) { w.setProgressBar(-1); w.setTitle("导演台"); }
      log(`update download failed: ${err.message}`);
      dialog.showErrorBox("下载更新失败", err.message);
      return { ok: false, error: "DOWNLOAD_FAILED", message: err.message };
    }
  }

  // 启动后 8 秒检查一次（别和首屏抢带宽），之后每 6 小时一次。关掉就完全不联网检查。
  function startAutoCheck() {
    stopAutoCheck();
    if (prefs.autoUpdate === false || !configured()) return;
    setTimeout(() => check({ silent: true }), 8000).unref?.();
    timer = setInterval(() => check({ silent: true }), SIX_HOURS);
    timer.unref?.();
  }
  function stopAutoCheck() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return { check, startAutoCheck, stopAutoCheck, feed, isNewer };
}
