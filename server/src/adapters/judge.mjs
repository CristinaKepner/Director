// 自动验收：改完重新生成之后，回答两个问题 ——
//   1. 要改的改了吗？
//   2. 说好不动的，动了吗？
//
// 做法是抽帧 + 多模态模型对比，而不是像素差：像素差对生成视频毫无意义（每一帧都是重画的），
// 它分不出「机位右移了 15 cm」和「换了一个人」。
//
// 判定结果永远只是建议：它进的是 Take 的评审记录，不自动通过也不自动打回。
// 生成模型不可靠，判定模型同样不可靠，最后拍板的是导演。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const FRAME_TIMES = [0.1, 0.5, 0.9]; // 首 / 中 / 尾，按时长比例

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const c = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    c.stderr.on("data", (b) => (err += b.toString().slice(-2000)));
    c.on("error", reject);
    c.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${err.slice(-300)}`))));
  });
}

async function probeDuration(ffprobe, file) {
  return new Promise((resolve) => {
    const c = spawn(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    c.stdout.on("data", (b) => (out += b));
    c.on("exit", () => resolve(Number(out.trim()) || 0));
    c.on("error", () => resolve(0));
  });
}

/**
 * @param opts { apiKey, baseUrl, model, ffmpeg, mediaDir, resolveLocal, log }
 */
export function createJudge(opts = {}) {
  const apiKey = opts.apiKey;
  const base = (opts.baseUrl || "https://aigw.sotatts.online/v1").replace(/\/$/, "");
  const model = opts.model || "gemini-3.1-pro-preview"; // 需要能看图的模型
  const ffmpeg = opts.ffmpeg;
  const ffprobe = ffmpeg ? path.join(path.dirname(ffmpeg), "ffprobe") : null;
  const mediaDir = opts.mediaDir;
  const log = opts.log || (() => {});

  const resolveLocal = (ref) => {
    if (!ref) return null;
    const m = String(ref).match(/\/media\/([^/?#]+)/);
    const p = m ? path.join(mediaDir, path.basename(m[1])) : path.isAbsolute(ref) ? ref : null;
    return p && fs.existsSync(p) ? p : null;
  };

  // 视频 → 3 张 jpg（base64）。图片素材直接读。
  async function framesOf(ref, work, tag) {
    if (!ref) return [];
    if (String(ref).startsWith("data:")) return [String(ref)];
    const file = resolveLocal(ref);
    if (!file) return [];
    if (/\.(jpg|jpeg|png|webp)$/i.test(file)) return [`data:image/jpeg;base64,${fs.readFileSync(file).toString("base64")}`];
    if (!ffmpeg) return [];
    const dur = (await probeDuration(ffprobe, file)) || 4;
    const out = [];
    for (const [i, r] of FRAME_TIMES.entries()) {
      const jpg = path.join(work, `${tag}_${i}.jpg`);
      try {
        await run(ffmpeg, ["-y", "-ss", String(Math.max(0.05, dur * r)), "-i", file, "-frames:v", "1", "-vf", "scale=768:-2", jpg]);
        out.push(`data:image/jpeg;base64,${fs.readFileSync(jpg).toString("base64")}`);
      } catch (err) {
        log(`judge: 抽帧失败 ${path.basename(file)} @${r} — ${err.message}`);
      }
    }
    return out;
  }

  async function ask(messages) {
    const body = { model, messages, max_tokens: 2000, response_format: { type: "json_object" } };
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    if (!r.ok) throw Object.assign(new Error((await r.text()).slice(0, 300)), { code: `HTTP_${r.status}` });
    const d = await r.json();
    const text = d.choices?.[0]?.message?.content || "";
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw Object.assign(new Error("判定模型没有返回 JSON"), { code: "BAD_VERDICT" });
    return { verdict: JSON.parse(m[0]), usage: d.usage };
  }

  return {
    name: "judge",
    ready: !!apiKey && !!ffmpeg,
    model,

    /**
     * @param task { request, locks:[{aspect,zh,keep}], before, after, shotTitle, expectedMove }
     * @returns { ok, applied, drift:[{aspect,changed,severity,note}], summary, frames }
     */
    async verify(task) {
      if (!apiKey) return { ok: false, error: "NO_JUDGE_KEY", hint: "验收要一个能看图的模型：启动时带 --llm-key-file" };
      if (!ffmpeg) return { ok: false, error: "FFMPEG_NOT_FOUND", hint: "抽帧要 ffmpeg：brew install ffmpeg" };
      const work = fs.mkdtempSync(path.join(os.tmpdir(), "director-judge-"));
      try {
        const before = await framesOf(task.before, work, "before");
        const after = await framesOf(task.after, work, "after");
        if (!after.length) return { ok: false, error: "NO_FRAMES", hint: "新生成的结果取不到画面" };
        if (!before.length) return { ok: false, error: "NO_BASELINE", hint: "没有可对比的基准版本：先 shot.lock 记下满意的那一版" };

        const lockList = (task.locks || []).map((l) => `- ${l.aspect}（${l.zh}）：${l.keepZh || l.keep}`).join("\n") || "（没有锁定项）";
        const sys = `你是影视后期的验收员。给你同一个镜头的两组画面：前 ${before.length} 张是【已批准的旧版】，后 ${after.length} 张是【改动后的新版】，各自按首/中/尾取帧。
只根据画面回答，不要臆测。只输出一个 JSON：
{"applied": true|false|"unclear", "appliedNote":"要改的那件事到底改了没有，一句话",
 "drift":[{"aspect":"<锁定项英文名>","changed":true|false,"severity":"none|minor|major","note":"具体看到了什么差别"}],
 "cameraMove":"none|truck-left|truck-right|pedestal|dolly-in|dolly-out|pan|tilt|zoom|unclear",
 "summary":"给导演的一句话结论"}
判定尺度：
- severity=major 指一眼能看出来、会让导演不接受的变化（换了张脸、重新打光、构图明显变了）。
- severity=minor 指生成模型固有的轻微抖动，可以接受。
- cameraMove 要区分平移和摇镜：主体在画面里横向位移、而背景透视关系跟着变，是 truck；主体位置不动而背景横扫过去，是 pan；主体变大变小是 zoom 或 dolly。这一条最容易错，看不准就写 unclear。`;
        const user = [
          { type: "text", text: `镜头：${task.shotTitle || task.shotId || ""}\n这次要求改的是：${task.request || "（未说明）"}\n${task.expectedMove ? `预期的机位变化：${task.expectedMove}` : ""}\n\n说好不许动的部分：\n${lockList}\n\n下面先是已批准的旧版：` },
          ...before.map((url) => ({ type: "image_url", image_url: { url } })),
          { type: "text", text: "下面是改动后的新版：" },
          ...after.map((url) => ({ type: "image_url", image_url: { url } })),
        ];
        const { verdict, usage } = await ask([{ role: "system", content: sys }, { role: "user", content: user }]);
        const drift = Array.isArray(verdict.drift) ? verdict.drift : [];
        const worst = drift.some((x) => x.severity === "major") ? "major" : drift.some((x) => x.severity === "minor") ? "minor" : "none";
        log(`judge ${model}: applied=${verdict.applied} drift=${worst} (${usage?.total_tokens ?? "?"} tokens)`);
        return { ok: true, model, applied: verdict.applied, appliedNote: verdict.appliedNote || "", drift, worst, cameraMove: verdict.cameraMove || "unclear", summary: verdict.summary || "", frames: { before: before.length, after: after.length }, usage };
      } catch (err) {
        log(`judge failed: ${err.message}`);
        return { ok: false, error: err.code || "JUDGE_FAILED", message: String(err.message).slice(0, 300) };
      } finally {
        fs.rmSync(work, { recursive: true, force: true });
      }
    },
  };
}
