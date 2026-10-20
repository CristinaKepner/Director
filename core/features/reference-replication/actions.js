import { uid } from "../../schema.js";
import {
  compileReference,
  inferReplicateMode,
  DEFAULT_REPLICATE_MODE,
  REPLICATE_MODES,
} from "./reference-plan.js";

export function registerReferenceActions({
  register,
  store,
  hooks,
  updateJob,
  batch,
  dispatch,
}) {
  const D = () => store.get();
  // 参照入口：一张图 / 一段视频 → 结构化拍摄参数 + 一句可以直接建场的 brief。
  // 这是给"想不出那句话"的人准备的入口 —— 他们手里有图，图里有最难说清的东西。
  register("reference.analyze", {
    doc: "读一张参考图或一段参考视频（可指定起止秒数），得到景别/机位/光位/主体/运镜的结构化描述，以及一句可直接建场的 brief",
    params: {
      ref: "string（/media/x.jpg、/media/x.mp4 或绝对路径）",
      from: "number（视频起始秒）",
      to: "number（视频结束秒）",
      count: "number（取几帧，默认 6）",
      hint: "string（导演补充，比如「只看人物不看背景」）",
    },
    required: ["ref"],
    undoable: false,
    handler({ ref, from, to, count, hint }, meta) {
      if (!hooks.reference)
        return {
          ok: false,
          error: "NO_READER",
          hint: "读参照在后端做；连上后端再试",
        };
      if (!hooks.reference.ready)
        return {
          ok: false,
          error: "READER_NOT_READY",
          missing: hooks.reference.missing || null,
          hint: `读参照还差：${readerMissing()}`,
        };
      const id = uid("ref");
      const job = {
        id,
        kind: "reference-read",
        shotId: null,
        mode: "analyze",
        provider: "reference",
        model: hooks.reference.model,
        prompt: String(ref),
        inputs: { ref, from: from ?? null, to: to ?? null },
        status: "queued",
        progress: 0,
        result: null,
        source: meta.source || "human",
        createdAt: new Date().toISOString(),
      };
      store.patch((d) => d.jobs.push(job));

      Promise.resolve()
        .then(() => {
          updateJob(id, { status: "running", progress: 25, note: "抽帧" });
          return hooks.reference.analyze({ ref, from, to, count, hint });
        })
        .then((r) => {
          if (!r.ok)
            return updateJob(id, {
              status: "failed",
              error: r.error,
              hint: r.hint,
            });
          updateJob(id, {
            status: "done",
            progress: 100,
            note: null,
            result: { kind: "analysis", ...r },
          });
          // 最近一次读到的参照挂在工程上：建场时 planner 要用它
          store.patch(
            (d) =>
              (d.project.reference = {
                at: new Date().toISOString(),
                ref,
                from: from ?? null,
                to: to ?? null,
                frames: r.frames,
                model: r.model,
                analysis: r.analysis,
              }),
          );
        })
        .catch((err) =>
          updateJob(id, {
            status: "failed",
            error: "READ_FAILED",
            message: String(err?.message || err),
          }),
        );

      return {
        ok: true,
        id,
        queued: true,
        hint: "读参照中；reference.result 或 SSE 看结果",
      };
    },
  });

  // 贴一个链接 → 本地素材。这是「复刻」最短的那条路：
  // 人在抖音/B站刷到一条想拍成那样的片子，说不清楚，但能把链接贴过来。
  // 落成本地文件之后，接的还是原来那条路（reference.analyze → planner 建场 → 白模 → 生成）。
  // 链接能不能用，dispatch 当场就知道 —— 没理由先建一个任务、再让它在后台失败。
  // 深一层的检查（站点认不认、要不要登录）留给适配器，那些确实得试了才知道。
  // 读参照缺什么，由适配器自己说（见 server/src/features/reference-replication/reference.mjs 的 missing）。
  // 「要网关密钥和 ffmpeg」是一句两头都可能不成立的话：缺的常常只有其中一个，
  // 人照着它去装了一个本来就有的东西，问题还在原地。
  function readerMissing() {
    const m = hooks.reference?.missing;
    return Array.isArray(m) && m.length ? m.join("、") : "网关密钥或 ffmpeg";
  }

  function badLink(url) {
    let u;
    try {
      u = new URL(String(url || "").trim());
    } catch {
      return {
        error: "BAD_URL",
        hint: "这不是一个链接。把视频页的地址整条贴进来。",
      };
    }
    if (u.protocol !== "http:" && u.protocol !== "https:")
      return {
        error: "BAD_PROTOCOL",
        hint: "只支持 http / https 链接。本地文件直接拖进来就行。",
      };
    return null;
  }

  register("reference.fetch", {
    doc: "从视频链接（B站/抖音/YouTube 等）下载一段素材到本地，作为参照。可只取其中一段",
    params: {
      url: "string（视频页地址）",
      from: "number（起始秒，可选）",
      to: "number（结束秒，可选）",
    },
    required: ["url"],
    undoable: false,
    validate: ({ url }) => badLink(url),
    handler({ url, from, to }, meta) {
      if (!hooks.fetcher)
        return {
          ok: false,
          error: "NO_FETCHER",
          hint: "下链接在后端做；连上后端再试",
        };
      if (!hooks.fetcher.ready)
        return {
          ok: false,
          error: "FETCHER_NOT_READY",
          hint: "后端没有可写的媒体目录，存不下素材",
        };
      const id = uid("fetch");
      store.patch((d) =>
        d.jobs.push({
          id,
          kind: "reference-fetch",
          shotId: null,
          mode: "fetch",
          provider: "yt-dlp",
          model: "yt-dlp",
          prompt: String(url).slice(0, 300),
          inputs: { url, from: from ?? null, to: to ?? null },
          status: "queued",
          progress: 0,
          result: null,
          source: meta.source || "human",
          createdAt: new Date().toISOString(),
        }),
      );

      Promise.resolve()
        .then(async () => {
          updateJob(id, { status: "running", progress: 1, note: "连接" });
          // 先探一下：标题和时长几秒就回来，先让人看到「下的是这条」，再开始等进度
          // 第一次贴链接时这一步可能在取下载器（机器上没有 yt-dlp），所以探测也要能报进度：
          // 界面上看到的是「准备下载器」，不是一条卡住不动的任务
          const meta2 = await hooks.fetcher.probe(url, (p) =>
            updateJob(id, { note: p.note }),
          );
          if (meta2.ok)
            updateJob(id, {
              note: meta2.title,
              inputs: {
                url,
                from: from ?? null,
                to: to ?? null,
                title: meta2.title,
                site: meta2.site,
                uploader: meta2.uploader,
                duration: meta2.duration,
                thumbnail: meta2.thumbnail,
              },
            });
          else if (meta2.error === "BAD_URL" || meta2.error === "BAD_PROTOCOL")
            return meta2;
          return hooks.fetcher.download({
            url,
            from,
            to,
            direct: meta2.direct,
            onProgress: (p) =>
              updateJob(id, {
                progress: Math.round(p.percent),
                note: p.note ? `${meta2.title || ""} · ${p.note}` : meta2.title,
              }),
          });
        })
        .then((r) => {
          if (!r.ok)
            return updateJob(id, {
              status: "failed",
              error: r.error,
              message: r.message,
              hint: r.hint,
            });
          updateJob(id, {
            status: "done",
            progress: 100,
            note: null,
            result: {
              kind: "video",
              url: r.url,
              bytes: r.bytes,
              site: r.site,
              source: r.source,
            },
          });
        })
        .catch((err) =>
          updateJob(id, {
            status: "failed",
            error: "FETCH_FAILED",
            message: String(err?.message || err),
          }),
        );

      return {
        ok: true,
        id,
        queued: true,
        hint: "下载中；SSE 或 generation.status 看进度",
      };
    },
  });

  // 复刻：一条链接 → 一个搭好的工程。
  //
  // 这个 Action 存在的理由，是「Agent 是主，工具是从」这句话要落到代码里。
  // 复刻一条片子要经手四样东西：下载器（yt-dlp）、视觉模型（读画面）、规划器（翻成 Action）、
  // 3D 运行时（建场）。如果让界面按顺序去点这四样，那就是工具在主导流程 ——
  // 换个下载器、换个视觉模型，界面就得跟着改，Agent 也没法自己跑这条链。
  //
  // 所以四样都收在 hooks 后面，这里只表达顺序和依赖。谁来下载、谁来看图、谁来规划，
  // 都是可替换的；缺哪一个就在那一步停下并说清楚，不装作做完了。
  // 人点按钮和 Agent 下指令走的是同一个入口，因为本来就该是同一件事。
  // 往对话里插一条消息。agent.js 的 say() 干的是同一件事，但 agent.js 依赖本文件，
  // 反向 import 会成环 —— 所以这里自己推，别为了复用一行代码把依赖绕成一个圈。
  function pushMessage(role, text, extra = {}) {
    store.patch((d) => {
      d.agent.messages.push({
        id: `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        role,
        text,
        at: new Date().toISOString(),
        ...extra,
      });
      d.agent.messages = d.agent.messages.slice(-120);
    });
  }

  register("reference.replicate", {
    doc: "复刻一条参照：链接（或已有素材）→ 下载 → 读出拍摄参数 → 在 3D 里把场景和分镜搭出来。之后录白模、生成由导演决定",
    params: {
      url: "string（视频页地址，和 ref 二选一）",
      ref: "string（已有素材 /media/x.mp4，和 url 二选一）",
      from: "number（起始秒）",
      to: "number（结束秒）",
      mode: `复刻什么：${Object.keys(REPLICATE_MODES).join("/")}（默认 ${DEFAULT_REPLICATE_MODE}：整条建出来，之后再换不用重读）`,
      hint: "string（导演另外补充的自由文字，会写进镜头描述；有规划器时再按它调一遍）",
      build: "boolean（默认 true；false 就只读不建场）",
    },
    undoable: false,
    validate(p) {
      if (!p.url && !p.ref)
        return {
          error: "MISSING_PARAM",
          missing: ["url|ref"],
          hint: "给一个链接，或者一个已经在 media 里的素材",
        };
      return p.url ? badLink(p.url) : null;
    },
    handler({ url, ref, from, to, mode, hint, build }, meta) {
      const wantBuild = build !== false;
      if (url && !hooks.fetcher?.ready)
        return {
          ok: false,
          error: "FETCHER_NOT_READY",
          hint: "后端没有可写的媒体目录，存不下素材。也可以把视频直接拖进来。",
        };
      if (!hooks.reference?.ready)
        return {
          ok: false,
          error: "READER_NOT_READY",
          missing: hooks.reference?.missing || null,
          hint: `把链接下下来了也读不了 —— 还差：${readerMissing()}`,
        };
      // 建场不再要规划器：空间参数是编译出来的，不是猜出来的（见 core/features/reference-replication/reference-plan.js）。
      // 规划器只在导演另外打了一句自由文字时才上场，而且是在场已经建好之后。

      const id = uid("rep");
      store.patch((d) =>
        d.jobs.push({
          id,
          kind: "replicate",
          shotId: null,
          mode: "replicate",
          provider: "director",
          model: hooks.reference.model,
          prompt: String(url || ref).slice(0, 300),
          inputs: {
            url: url || null,
            ref: ref || null,
            from: from ?? null,
            to: to ?? null,
            mode: mode || null,
            hint: hint || null,
          },
          phases: [
            ...(url
              ? [{ key: "fetch", label: "把链接下下来", state: "wait" }]
              : []),
            {
              key: "read",
              label: "读出景别 / 机位 / 光位 / 运镜",
              state: "wait",
            },
            ...(wantBuild
              ? [
                  {
                    key: "build",
                    label: "把拍摄参数编译成 Action 并执行",
                    state: "wait",
                  },
                ]
              : []),
          ],
          status: "queued",
          progress: 0,
          result: null,
          source: meta.source || "human",
          createdAt: new Date().toISOString(),
        }),
      );

      const phase = (key, state, note) =>
        store.patch((d) => {
          const j = d.jobs.find((x) => x.id === id);
          const ph = j?.phases?.find((x) => x.key === key);
          if (ph) Object.assign(ph, { state, note: note ?? ph.note });
        });

      (async () => {
        let media = ref,
          span = { from, to },
          meta2 = null;
        if (url) {
          phase("fetch", "run");
          updateJob(id, { status: "running", progress: 5, note: "连接" });
          meta2 = await hooks.fetcher.probe(url, (p) => {
            phase("fetch", "run", p.note);
            updateJob(id, { note: p.note });
          });
          if (meta2.ok) phase("fetch", "run", meta2.title);
          // 指定了起止秒就只下那一段：实测同一条片子整段 59.9 MB / 15 s，8 秒那段 2.8 MB / 3 s。
          // 之后想换一段重下一次就是了，比一开始就把整条片子拖下来划算得多。
          const got = await hooks.fetcher.download({
            url,
            from,
            to,
            direct: meta2.direct,
            onProgress: (p) =>
              updateJob(id, {
                progress: 5 + Math.round(p.percent * 0.35),
                note: p.note,
              }),
          });
          if (!got.ok) {
            phase("fetch", "fail", got.hint || got.error);
            return updateJob(id, {
              status: "failed",
              error: got.error,
              message: got.message,
              hint: got.hint,
            });
          }
          media = got.url;
          phase(
            "fetch",
            "done",
            `${(got.bytes / 1e6).toFixed(1)} MB · ${got.site}`,
          );
        }

        phase("read", "run");
        // 同一个参照、同一段，已经读过就别再读：一次 12k tokens、四十多秒。
        // 导演在选项里回答「要复刻什么」时走的正是这条路，不该为此再付一次钱。
        const had = D().project.reference;
        const cached =
          had?.ref === media &&
          had.analysis &&
          (had.from ?? null) === (span.from ?? null) &&
          (had.to ?? null) === (span.to ?? null)
            ? had
            : null;
        let an;
        if (cached) {
          an = {
            ok: true,
            analysis: cached.analysis,
            model: cached.model,
            frames: cached.frames,
          };
          updateJob(id, { progress: 60, note: "参照已经读过，直接用" });
        } else {
          updateJob(id, { progress: 45, note: "抽帧读画面" });
          // 下载时已经截过了，这里再按原片秒数截一次就截空了
          if (url) span = { from: undefined, to: undefined };
          // 整条视频：抽帧数按时长来（每两三秒一帧，最多 24），并让读取器按场景分段。
          // 只取了一小段的还是 6 帧一场。
          const whole = span.from == null && span.to == null;
          an = await hooks.reference.analyze({
            ref: media,
            from: span.from,
            to: span.to,
            count: whole ? "auto" : 6,
            scenes: true,
            hint,
          });
        }
        if (!an.ok) {
          phase("read", "fail", an.hint || an.error);
          return updateJob(id, {
            status: "failed",
            error: an.error,
            hint: an.hint,
          });
        }
        const a = an.analysis;
        const c = a.camera || {};
        phase(
          "read",
          "done",
          `${c.shotSize || ""} ${c.focalMm ? c.focalMm + "mm" : ""} · ${(a.subjects || []).length} 个主体`,
        );
        store.patch(
          (d) =>
            (d.project.reference = {
              at: new Date().toISOString(),
              ref: media,
              from: span.from ?? null,
              to: span.to ?? null,
              frames: an.frames,
              model: an.model,
              analysis: a,
            }),
        );

        if (!wantBuild)
          return updateJob(id, {
            status: "done",
            progress: 100,
            note: null,
            result: { kind: "analysis", ref: media, ...an },
          });

        // 没说要复刻什么，就整条复刻。以前这里停下来问「你要它的运镜还是它的光」——
        // 问得再具体，也是在链路中间设一道闸：导演看到的是「等你说要复刻哪一部分」，
        // 下一步录白模直接 NO_SHOTS。参照读完就存在工程里了，换个模式是一次免费重编译，
        // 所以先建出来再把选项摆在旁边，而不是建之前拦着。
        const useMode =
          mode ||
          (hint ? inferReplicateMode(hint) : null) ||
          DEFAULT_REPLICATE_MODE;
        const defaulted = !mode;

        // 建场：编译，不是让模型重猜。读取器给的 shotSize / focalMm / heightMeters /
        // motion.type / beats[].seconds 本来就是数字，翻成 Action 是一组映射和一次乘法。
        phase("build", "run");
        updateJob(id, { progress: 70, note: "编译成 Action" });
        const plan = compileReference(a, {
          mode: useMode,
          prefix: id.replace(/^rep_/, "r"),
          hint,
          seconds:
            an.span && an.span.to > an.span.from
              ? an.span.to - an.span.from
              : span.to != null && span.from != null
                ? span.to - span.from
                : undefined,
        });
        const before = D().shots.length;
        // 工程名：复刻建的是新场，工程却还叫上一个示例的名字（「City Edge」）。按参照的标题起名；没有标题就用场名。
        // 放在同一个 batch 里，撤销时整条复刻连同改名一起收回
        const title = String(
          meta2?.title || a.scene?.name || a.scene?.setting || "",
        )
          .replace(
            /\s*[-|·—]\s*(YouTube|bilibili|哔哩哔哩|抖音|TikTok|Vimeo).*$/i,
            "",
          )
          .trim()
          .slice(0, 60);
        const results = batch(
          "复刻参照",
          (m) => {
            const rs = plan.steps.map((st) => ({
              step: st,
              r: dispatch(st.action, st.payload, m),
            }));
            if (title) dispatch("project.rename", { name: title }, m);
            return rs;
          },
          {
            source: meta.source || "human",
            actorId: meta.actorId || "reference",
          },
        );
        const failed = results.filter((x) => !x.r.ok);
        const shots = D().shots.length - before;

        if (!shots) {
          // 编译出来的计划执行不动，是编译器或运行时的问题，不是"模型没听懂" —— 说得出是哪一步
          const first = failed[0];
          phase(
            "build",
            "fail",
            first
              ? `${first.step.action} → ${first.r.error}`
              : "一个镜头都没建出来",
          );
          return updateJob(id, {
            status: "failed",
            error: "BUILD_EMPTY",
            message: failed
              .map((x) => `${x.step.action}: ${x.r.error}`)
              .join("；")
              .slice(0, 300),
            hint: first
              ? `第 ${results.indexOf(first) + 1} 步「${first.step.why}」被拒了。这是编译器翻错了或者参数越界，不是参照的问题 —— 把这条报出来能直接定位。`
              : "换个参照试试",
          });
        }

        // 导演另外打了一句自由文字：场已经建好了，规划器只负责按这句话调一遍。
        // 有它更好，没有也不至于什么都拿不到 —— 这句话已经写进镜头描述，生成时会带上。
        let refined = null;
        if (hint && hooks.planner?.ready) {
          phase("build", "run", "按你的补充调整");
          updateJob(id, { progress: 88, note: "按补充调整" });
          const r = await hooks.planner
            .build(
              `工程里刚按参照建好了 ${shots} 个镜头（${plan.summary}）。现在只做一件事：按导演这句补充去调整已有的实体、机位或镜头 —— 「${hint}」。不要重建场，不要清空。改不动就说明白改不了什么。`,
              { source: meta.source || "human", actorId: meta.actorId },
            )
            .catch((err) => ({
              ok: false,
              error: String(err?.message || err),
            }));
          refined = {
            ok: !!r?.ok,
            steps: (r?.plan || []).length,
            reply: (r?.reply || "").slice(0, 200),
          };
        }

        const notes = [
          ...plan.warnings,
          ...failed.map(
            (x) => `${x.step.action} 被拒（${x.r.error}）：${x.step.why}`,
          ),
        ];
        phase(
          "build",
          "done",
          `${plan.scenes > 1 ? `${plan.scenes} 场（${plan.grid.label}）· ` : ""}${shots} 个镜头 · ${plan.steps.length - failed.length}/${plan.steps.length} 步`,
        );
        updateJob(id, {
          status: "done",
          progress: 100,
          note: null,
          result: {
            kind: "replicate",
            ref: media,
            analysis: a,
            shots,
            scenes: plan.scenes,
            pads: plan.pads,
            mode: plan.mode,
            defaulted,
            summary: plan.summary,
            steps: plan.steps.map((st) => ({ action: st.action, why: st.why })),
            warnings: notes,
            refined,
          },
        });
        if (defaulted) {
          // 建完了再摆选项：现在换模式不用重新读参照（缓存命中），也不会让人卡在中间。
          const others = Object.keys(REPLICATE_MODES).filter(
            (k) => k !== plan.mode,
          );
          pushMessage(
            "agent",
            `按整条复刻建好了：${plan.summary}。${plan.scenes > 1 ? `台面按 ${plan.scenes} 个场景分成了 ${plan.grid.label}，每场一块、各自一个机位。` : ""}只想要它的某一面的话，换一个：`,
            {
              ...(notes.length ? { notes } : {}),
              ask: [
                {
                  question: "要换成只复刻某一部分吗？（不换就直接录白模）",
                  why: "参照已经读过，换模式只是重新编译建场，不花钱也不用再等读片。",
                  options: others.map((k) => ({
                    label: REPLICATE_MODES[k].zh,
                    next: {
                      action: "reference.replicate",
                      payload: {
                        ref: media,
                        mode: k,
                        ...(span.from != null ? { from: span.from } : {}),
                        ...(span.to != null ? { to: span.to } : {}),
                      },
                    },
                  })),
                },
              ],
            },
          );
        } else if (notes.length)
          pushMessage(
            "agent",
            `复刻完成：${plan.summary}。有几处运行时做不到的，先说一声：`,
            { notes },
          );
      })().catch((err) =>
        updateJob(id, {
          status: "failed",
          error: "REPLICATE_FAILED",
          message: String(err?.message || err),
        }),
      );

      return {
        ok: true,
        id,
        queued: true,
        hint: "复刻中：下载 → 读参照 → 建场。建完录白模就能看到一条能播的片子。",
      };
    },
  });

  // referenceBrief() 曾经住在这里：把结构化分析压成一段中文散文，再交给规划器猜回 Action。
  // 它被 core/features/reference-replication/reference-plan.js 的编译器取代了 —— 留着一个没人调的导出只会让人再走一次那条路。

  register("reference.use", {
    doc: "把之前读过的一条参照换回来当前用的那条。不重新读：读一次约 20 秒、一万多 token，结果本来就存在任务里",
    params: { id: "string（当初读它的那个任务 id）" },
    required: ["id"],
    undoable: false,
    handler({ id }) {
      const j = D().jobs.find((x) => x.id === id);
      const r = j?.result;
      if (!r?.ref || !r.analysis)
        return {
          ok: false,
          error: "NOT_A_REFERENCE",
          hint: "这个任务没有留下参照分析（可能没读完）",
        };
      store.patch(
        (d) =>
          (d.project.reference = {
            at: new Date().toISOString(),
            ref: r.ref,
            from: j.inputs?.from ?? null,
            to: j.inputs?.to ?? null,
            frames: r.frames ?? null,
            model: r.model || j.model,
            analysis: r.analysis,
          }),
      );
      return { ok: true, ref: r.ref };
    },
  });

  register("reference.result", {
    doc: "读回最近一次（或指定任务）的参照分析",
    params: { id: "string" },
    undoable: false,
    handler({ id }) {
      const d = D();
      if (id) {
        const j = d.jobs.find((x) => x.id === id);
        return j
          ? {
              ok: true,
              status: j.status,
              data: j.result || null,
              error: j.error,
            }
          : { ok: false, error: "NOT_FOUND" };
      }
      return { ok: true, data: d.project.reference || null };
    },
  });
}
