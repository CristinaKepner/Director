// Blockout → film pipeline, driven from the page (the only place a Program frame actually renders).
//
//   runBlockout()  每镜：选镜 → take.record（MediaRecorder 录 Program 画面）→ 等收尾上传 → 抓关键帧进故事版 → Circle
//   renderShots()  每镜：generation.prompt → generation.submit（Seedance / Seedream；已批准的参考资产自动随行）
//   exportFilm()   后端 ffmpeg 按镜头顺序拼成一条片子（blockout 白模片 或 generated 生成片）
//
// 三步都只走 Action Registry，所以浏览器、桌面端菜单、CLI、Agent 得到的是同一条流水线，每步都在事件日志里。
import { store } from "../../core/store.js";
import { PROVIDERS } from "../../core/schema.js";
import { getHooks } from "../../core/actions.js";
import { dispatch } from "./client.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const D = () => store.get();
const secondsOf = (shot, fps) => (shot.range.outFrame - shot.range.inFrame) / fps;

async function waitFor(test, { timeout = 120000, every = 250 } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const v = test();
    if (v) return v;
    if (Date.now() > deadline) return null;
    await sleep(every);
  }
}


// 这一镜放不放得进供应商的单条上限。放不下就得分段续拍 —— 那是一镜之内的技术动作，
// 不是剪辑决定，所以这里替用户把路走对，而不是让 generation.submit 把 45 秒悄悄截成 30 秒。
function chainPlan(shot, provider, fps) {
  const cap = PROVIDERS[provider]?.maxSeconds || 0;
  const secs = secondsOf(shot, fps);
  if (!cap || secs <= cap + 0.05) return null;
  return { seconds: secs, cap, segments: Math.ceil(secs / cap) };
}

// 分段续拍和普通生成出来的是同一个形状（job.result.url），所以等待逻辑共用一套
async function waitJob(id, { timeout = 30 * 60 * 1000, onTick } = {}) {
  return waitFor(() => {
    const j = D().jobs.find((x) => x.id === id);
    if (j && onTick) onTick(j);
    return j && ["done", "failed", "cancelled"].includes(j.status) ? j : null;
  }, { timeout, every: 3000 });
}

/**
 * 逐镜录白模 Take。progress({phase, index, total, shotId, title, takeId})
 * @param opts { shotIds?, keyframes = true, circle = true, onProgress }
 */
export async function runBlockout(opts = {}) {
  const onProgress = opts.onProgress || (() => {});
  const d0 = D();
  const fps = d0.project.fps;
  const shots = (opts.shotIds ? opts.shotIds.map((id) => d0.shots.find((s) => s.id === id)) : d0.shots).filter(Boolean);
  if (!shots.length) return { ok: false, error: "NO_SHOTS" };

  await dispatch("project.set-view", { mode: "program" });
  const out = [];
  for (const [i, shot] of shots.entries()) {
    const label = `${String(shot.index).padStart(2, "0")} ${shot.title}`;
    onProgress({ phase: "record", index: i + 1, total: shots.length, shotId: shot.id, title: label });
    await dispatch("shot.select", { id: shot.id });
    await sleep(450); // let the viewport settle on the shot's first frame before the recorder starts

    const r = await dispatch("take.record", { shotId: shot.id });
    if (!r?.ok) {
      out.push({ shotId: shot.id, ok: false, error: r?.error || "RECORD_FAILED" });
      continue;
    }
    const secs = secondsOf(shot, fps);
    // the viewport stops the recorder at the out point; take.finish lands after the webm upload
    const take = await waitFor(() => {
      const t = D().takes.find((x) => x.id === r.id);
      return t && t.status !== "recording" ? t : null;
    }, { timeout: secs * 1000 + 60000 });
    if (!take) {
      await dispatch("take.stop", { id: r.id });
      // 录制靠的是页面真的在出帧：窗口被最小化 / 完全遮挡时浏览器会停掉渲染循环，
      // 播放头不前进，录像器也就永远等不到出点。这不是超时，是画面根本没在动。
      out.push({ shotId: shot.id, ok: false, error: "RECORD_TIMEOUT", takeId: r.id, hint: "录不到画面：录制期间窗口要保持可见，别最小化或切走" });
      continue;
    }
    // the upload can complete a beat after the status flip
    const withVideo = await waitFor(() => {
      const t = D().takes.find((x) => x.id === r.id);
      return t?.videoUrl ? t : null;
    }, { timeout: 30000 }) || take;

    if (opts.keyframes !== false) {
      onProgress({ phase: "keyframe", index: i + 1, total: shots.length, shotId: shot.id, title: label });
      const cap = getHooks().capture;
      const frame = cap ? await cap() : null;
      await dispatch("storyboard.add", { shotId: shot.id, takeId: r.id, keyframes: frame ? [frame] : [] });
    }
    if (opts.circle !== false) await dispatch("take.review", { id: r.id, status: "circle" });

    out.push({ shotId: shot.id, ok: true, takeId: r.id, video: withVideo.videoUrl, frames: withVideo.capturedFrames || null, seconds: secs });
  }
  const ok = out.filter((x) => x.ok).length;
  onProgress({ phase: "done", index: shots.length, total: shots.length, recorded: ok });
  const firstHint = out.find((x) => !x.ok && x.hint)?.hint;
  return { ok: ok > 0, recorded: ok, of: shots.length, takes: out, error: ok ? undefined : out[0]?.error, hint: firstHint };
}

/**
 * 逐镜真实生成。mode "auto" = 有故事版关键帧走 i2v，否则 t2v；白模视频做 v2v 参考需要后端能被 Ark 访问。
 * @param opts { shotIds?, provider = "seedance-2.5", mode = "auto", lang = "en", wait = true, onProgress }
 */
export async function renderShots(opts = {}) {
  const onProgress = opts.onProgress || (() => {});
  const provider = opts.provider || "seedance-2.5";
  const d0 = D();
  const shots = (opts.shotIds ? opts.shotIds.map((id) => d0.shots.find((s) => s.id === id)) : d0.shots).filter(Boolean);
  if (!shots.length) return { ok: false, error: "NO_SHOTS" };

  const submitted = [];
  for (const [i, shot] of shots.entries()) {
    const label = `${String(shot.index).padStart(2, "0")} ${shot.title}`;
    const card = D().storyboard.find((c) => c.shotId === shot.id);
    const mode = opts.mode && opts.mode !== "auto" ? opts.mode : card?.keyframes?.[0] ? "i2v" : "t2v";
    await dispatch("generation.prompt", { shotId: shot.id, mode: "video" });

    const long = chainPlan(shot, provider, d0.project.fps);
    if (long) {
      onProgress({ phase: "submit", index: i + 1, total: shots.length, shotId: shot.id, title: label, mode: "chain", segments: long.segments });
      const c = await dispatch("shot.chain", { shotId: shot.id, provider, lang: opts.lang || "en" });
      submitted.push({ shotId: shot.id, title: label, mode: "chain", segments: long.segments, ok: !!c?.ok, jobId: c?.id, error: c?.error, hint: c?.hint });
      continue;
    }

    onProgress({ phase: "submit", index: i + 1, total: shots.length, shotId: shot.id, title: label, mode });
    const r = await dispatch("generation.submit", { shotId: shot.id, mode, provider, lang: opts.lang || "en" });
    submitted.push({ shotId: shot.id, title: label, mode, ok: !!r?.ok, jobId: r?.id, error: r?.error, hint: r?.hint });
  }
  if (opts.wait === false) return { ok: true, submitted };

  const ids = submitted.filter((s) => s.ok).map((s) => s.jobId);
  const finished = await waitFor(() => {
    const jobs = D().jobs.filter((j) => ids.includes(j.id));
    const settled = jobs.filter((j) => ["done", "failed", "cancelled"].includes(j.status));
    onProgress({ phase: "generate", done: settled.length, total: ids.length, running: jobs.filter((j) => j.status === "running").map((j) => j.progress) });
    return settled.length === ids.length ? jobs : null;
  }, { timeout: opts.timeout || 30 * 60 * 1000, every: 3000 });

  const jobs = finished || D().jobs.filter((j) => ids.includes(j.id));
  return {
    ok: jobs.some((j) => j.status === "done"),
    submitted,
    results: jobs.map((j) => ({ id: j.id, shotId: j.shotId, mode: j.mode, status: j.status, url: j.result?.url || null, error: j.error })),
  };
}

/**
 * 改完只重做这一镜 —— 对照那一屏的闭环。
 *
 * 顺序是有讲究的：先重录白模。导演刚才在 3D 里改的是机位 / 走位 / 光，
 * 不重录的话左边还是旧构图，右边却按新构图出，对照就骗人了。
 * 白模重录完再抓关键帧、重编译提示词，最后才花钱生成这一镜。
 *
 * @param opts { shotId, provider, mode, reblock = true, verify = true, onProgress }
 */
export async function regenerateShot(opts = {}) {
  const onProgress = opts.onProgress || (() => {});
  const d0 = D();
  const shot = d0.shots.find((s) => s.id === (opts.shotId || d0.project.currentShotId));
  if (!shot) return { ok: false, error: "NO_SHOT" };
  const provider = opts.provider || "seedance-2.5";

  // 旧版留着做对照与验收的基准
  const prev = d0.jobs.filter((j) => j.shotId === shot.id && j.status === "done" && j.result?.url && /\.(mp4|webm|mov)$/i.test(j.result.url)).at(-1) || null;

  if (opts.reblock !== false) {
    onProgress({ phase: "blockout", label: "重录白模，让左边反映你刚才的改动" });
    const bo = await runBlockout({ shotIds: [shot.id], onProgress: () => {} });
    if (!bo.ok) return { ok: false, error: bo.error || "REBLOCK_FAILED", hint: bo.hint, stage: "blockout" };
  }

  onProgress({ phase: "prompt", label: "按改动后的镜头重编译提示词" });
  await dispatch("generation.prompt", { shotId: shot.id, mode: "video" });

  const card = D().storyboard.find((c) => c.shotId === shot.id);
  const long = chainPlan(shot, provider, D().project.fps);
  const mode = long ? "chain" : opts.mode && opts.mode !== "auto" ? opts.mode : card?.keyframes?.[0] ? "i2v" : "t2v";

  // 长镜头整镜重跑 = 整条链重跑。用户改的是镜，段只是渲染这一镜的实现细节。
  onProgress({ phase: "submit", label: long ? `这一镜 ${long.seconds.toFixed(1)} 秒，分 ${long.segments} 段续拍` : `用 ${provider} 重新生成这一镜（${mode}）` });
  const sub = long
    ? await dispatch("shot.chain", { shotId: shot.id, provider })
    : await dispatch("generation.submit", { shotId: shot.id, mode, provider });
  if (!sub?.ok) return { ok: false, error: sub?.error || "SUBMIT_FAILED", hint: sub?.hint, stage: "submit" };

  const job = await waitJob(sub.id, {
    timeout: opts.timeout || 60 * 60 * 1000,
    onTick: (j) => onProgress({ phase: "generate", label: `${j.note || "生成中"} ${j.progress || 0}%`, progress: j.progress }),
  });

  if (job?.status !== "done" || !job.result?.url) {
    return { ok: false, error: job?.error || "GENERATE_FAILED", message: job?.message, hint: job?.hint, stage: "generate", jobId: sub.id };
  }

  // 验收：新旧两版逐项比对。这一步才是"人没变"的证据，而不是一句承诺。
  let verdict = null;
  if (opts.verify !== false && prev) {
    onProgress({ phase: "verify", label: "对比新旧两版：要改的改了没有，锁住的有没有漂" });
    const v = await dispatch("review.verify", { shotId: shot.id, jobId: sub.id, against: prev.id, request: opts.request || "" });
    if (v?.ok) {
      const vj = await waitFor(() => {
        const j = D().jobs.find((x) => x.id === v.id);
        return j && ["done", "failed"].includes(j.status) ? j : null;
      }, { timeout: 8 * 60 * 1000, every: 2500 });
      verdict = vj?.status === "done" ? vj.result : null;
    }
  }

  onProgress({ phase: "done", label: "好了" });
  return { ok: true, shotId: shot.id, jobId: sub.id, url: job.result.url, mode, previous: prev ? { id: prev.id, url: prev.result.url } : null, verdict };
}

/** 后端 ffmpeg 拼片。source: auto | blockout | generated */
export async function exportFilm(opts = {}) {
  const onProgress = opts.onProgress || (() => {});
  const r = await dispatch("film.export", { source: opts.source || "auto", name: opts.name, allowPartial: opts.allowPartial !== false });
  if (!r?.ok) return r;
  const job = await waitFor(() => {
    const j = D().jobs.find((x) => x.id === r.id);
    if (j) onProgress({ phase: "assemble", progress: j.progress, note: j.note, status: j.status });
    return j && ["done", "failed"].includes(j.status) ? j : null;
  }, { timeout: opts.timeout || 20 * 60 * 1000, every: 800 });
  if (!job) return { ok: false, error: "ASSEMBLE_TIMEOUT", id: r.id };
  if (job.status !== "done") return { ok: false, error: job.error || "ASSEMBLE_FAILED", message: job.message, hint: job.hint, id: r.id };
  return { ok: true, id: r.id, url: job.result.url, seconds: job.result.seconds, bytes: job.result.bytes, clips: job.result.clips };
}

/** 一条龙：白模 → 拼白模片 →（可选）逐镜生成 → 拼生成片 */
export async function runPipeline(opts = {}) {
  const onProgress = opts.onProgress || (() => {});
  const steps = {};
  steps.blockout = await runBlockout({ ...opts, onProgress });
  steps.blockoutFilm = await exportFilm({ source: "blockout", name: opts.blockoutName, onProgress });
  if (opts.render) {
    steps.render = await renderShots({ ...opts, onProgress });
    steps.film = await exportFilm({ source: "generated", name: opts.filmName, onProgress });
  }
  return steps;
}

export const film = { runBlockout, renderShots, exportFilm, runPipeline, regenerateShot };
