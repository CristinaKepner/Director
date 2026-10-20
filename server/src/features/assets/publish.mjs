// Media publisher: turns a local /media file into a web-reachable URL for providers that only accept URLs
// (Ark's reference_video). Providers:
//   feishu — upload to the user's own Feishu Drive (user access token from a file), then ask for a temporary,
//            unauthenticated download link (Feishu: valid for a limited time; re-published on demand).
// No third-party public hosts: media only goes to infrastructure the user owns.
import fs from "node:fs";
import path from "node:path";

export function createPublisher(opts = {}) {
  const kind = opts.kind || "none";
  const log = opts.log || (() => {});
  const cache = new Map(); // abs path + mtime → { url, at }
  const TTL = (opts.ttlMinutes || 20) * 60 * 1000;

  async function feishuToken() {
    const file = opts.feishuTokenFile;
    const t = (process.env.FEISHU_TOKEN || (file && fs.existsSync(file) && fs.readFileSync(file, "utf8")) || "").trim();
    if (!t) throw Object.assign(new Error("no Feishu user token (FEISHU_TOKEN or --feishu-token-file)"), { code: "NO_FEISHU_TOKEN" });
    return t;
  }

  async function publishFeishu(abs) {
    const token = await feishuToken();
    const name = path.basename(abs);
    const buf = fs.readFileSync(abs);
    const form = new FormData();
    form.append("file_name", name);
    form.append("parent_type", opts.feishuParentType || "docx_file");
    form.append("parent_node", opts.feishuParentNode || "");
    form.append("size", String(buf.length));
    form.append("file", new Blob([buf], { type: name.endsWith(".mp4") ? "video/mp4" : name.endsWith(".webm") ? "video/webm" : "application/octet-stream" }), name);
    const up = await (await fetch("https://open.feishu.cn/open-apis/drive/v1/medias/upload_all", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form })).json();
    if (up.code !== 0) throw Object.assign(new Error(`feishu upload: ${up.msg}`), { code: `FEISHU_${up.code}` });
    const ft = up.data.file_token;
    const dl = await (await fetch(`https://open.feishu.cn/open-apis/drive/v1/medias/batch_get_tmp_download_url?file_tokens=${ft}`, { headers: { authorization: `Bearer ${token}` } })).json();
    if (dl.code !== 0) throw Object.assign(new Error(`feishu tmp url: ${dl.msg}`), { code: `FEISHU_${dl.code}` });
    const url = dl.data.tmp_download_urls?.[0]?.tmp_download_url;
    if (!url) throw Object.assign(new Error("feishu returned no tmp_download_url"), { code: "FEISHU_NO_URL" });
    return { url, fileToken: ft };
  }

  return {
    kind,
    enabled: kind !== "none",
    /** absolute local path → { url } reachable from the internet (cached while fresh) */
    async publish(abs) {
      if (kind === "none") throw Object.assign(new Error("no media publisher configured"), { code: "NO_PUBLISHER" });
      const key = `${abs}:${fs.statSync(abs).mtimeMs}`;
      const hit = cache.get(key);
      if (hit && Date.now() - hit.at < TTL) return hit;
      const out = kind === "feishu" ? await publishFeishu(abs) : (() => { throw Object.assign(new Error(`unknown publisher ${kind}`), { code: "BAD_PUBLISHER" }); })();
      const rec = { ...out, at: Date.now() };
      cache.set(key, rec);
      log(`published ${path.basename(abs)} via ${kind}`);
      return rec;
    },
  };
}
