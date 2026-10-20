import { dispatch, client } from "../../client.js";
import { store } from "../../../../core/store.js";
import { shotSourceSpan } from "../../../../core/actions.js";
import { REPLICATE_MODES } from "../../../../core/features/reference-replication/reference-plan.js";

export function createReferencePanel({
  esc,
  badge,
  report,
  toast,
  selectedGeneration,
  openDrawer,
  showPreview,
}) {
  const $ = (id) => document.getElementById(id);
  let refMode = "motion";
  let refKey = "";
  return renderRefPanel;
  function renderRefPanel(d, active) {
    const el = $("refPanel");
    const jobs = (d.jobs || [])
      .filter((j) =>
        ["replicate", "reference-fetch", "reference-read"].includes(j.kind),
      )
      .slice()
      .reverse();
    const running = jobs.find((j) => ["queued", "running"].includes(j.status));
    const cur = d.project.reference,
      a = cur?.analysis;
    const shot = d.shots.find((s) => s.id === d.project.currentShotId);
    const seg = shot ? shotSourceSpan(d, shot) : null;
    if ($("refState"))
      $("refState").textContent = running
        ? `${running.progress || 0}%`
        : cur
          ? "已读"
          : "";
    // 面板没开的时候，轨道上的图标替它报进度：读参照要一两分钟，人不会一直开着这一栏
    const rb = $("refBadge");
    if (rb) {
      rb.textContent = running ? `${running.progress || 0}` : "";
      rb.classList.toggle("on", !!running);
    }
    if (!el || !active) {
      refKey = "";
      return;
    }
    const plan = jobs.find(
      (j) => j.kind === "replicate" && j.result?.steps?.length,
    )?.result;
    const key = JSON.stringify([
      jobs
        .slice(0, 8)
        .map((j) => [
          j.id,
          j.status,
          j.progress,
          j.note,
          (j.phases || []).map((p) => p.state + (p.note || "")),
        ]),
      cur?.ref,
      cur?.model,
      a?.brief || a?.summary,
      d.shots.length,
      shot?.id,
      seg,
      d.scene.pads?.length,
      refMode,
      plan?.summary,
    ]);
    if (key === refKey && el.firstChild) return;
    refKey = key;
    const keep = {
      url: $("refUrl")?.value || "",
      hint: $("refHint")?.value || "",
      focus: el.contains(document.activeElement)
        ? document.activeElement.id
        : null,
      open: [...el.querySelectorAll("details[data-k]")]
        .filter((x) => x.open)
        .map((x) => x.dataset.k),
    };
    const dis = running ? "disabled" : "";
    const rows = a
      ? [
          ["景别", `${a.camera?.shotSize || "—"} · ${a.camera?.angle || "—"}`],
          [
            "机位",
            `${a.camera?.heightMeters ?? "—"} m · ${a.camera?.focalMm ?? "—"} mm · f/${a.camera?.aperture ?? "—"}`,
          ],
          ["构图", a.camera?.framing || "—"],
          [
            "光",
            `${a.lighting?.keyDirection || "—"} · ${a.lighting?.ratio || "—"} · ${a.lighting?.colorTemp || "—"}`,
          ],
          [
            "运镜",
            `${a.motion?.type || "—"}${a.motion?.description ? " · " + a.motion.description : ""}`,
          ],
          [
            "主体",
            (a.subjects || []).map((x) => x.displayName).join("、") || "—",
          ],
          [
            "拍",
            (a.beats || [])
              .map((b, i) => `${i + 1}) ${b.seconds}s ${b.text}`)
              .join("　") || "—",
          ],
        ]
      : [];
    el.innerHTML = `
    <div class="ref-in">
      <input id="refUrl" type="url" placeholder="贴一条视频链接：抖音 / B站 / YouTube…" spellcheck="false" ${dis}>
      <div class="rep-row">
        <select id="refMode" title="复刻它的哪一部分" ${dis}>${Object.entries(
          REPLICATE_MODES,
        )
          .map(
            ([k, v]) =>
              `<option value="${k}"${k === refMode ? " selected" : ""}>${esc(v.zh)}</option>`,
          )
          .join(
            "",
          )}<option value=""${refMode ? "" : " selected"}>先问我</option></select>
        <button id="refGo" class="primary" ${dis}>复刻</button>
      </div>
      <input id="refHint" type="text" placeholder="另外补充（可留空，例：主体换成一罐冷萃咖啡）" spellcheck="false" ${dis}>
      <div class="ref-drop" id="refDrop"><input type="file" id="refFile" accept="image/*,video/*" hidden><span>或把本地图片 / 视频拖进来</span></div>
      ${running ? `<div class="ref-live">${(running.phases || []).map((ph) => `<div class="fr-step ${ph.state === "run" ? "run" : ph.state}"><span>${ph.state === "done" ? "✓" : ph.state === "run" ? "◠" : ph.state === "fail" ? "✗" : "·"}</span><b>${esc(ph.label)}</b><i>${esc(ph.note || (ph.state === "run" ? (running.progress || 0) + "%" : ""))}</i></div>`).join("") || `<div class="fr-step run"><span>◠</span><b>${esc(running.note || "处理中")}</b><i>${running.progress || 0}%</i></div>`}</div>` : ""}
    </div>
    ${
      a
        ? `<div class="ref-read">
      <div class="ref-head"><b>读到的参照</b><span>${esc(cur.model || "")} · ${cur.frames || 1} 帧${cur.from != null ? ` · ${cur.from}s–${cur.to ?? "末"}s` : ""}${d.scene.pads?.length ? ` · ${d.scene.pads.length} 场` : ""}</span></div>
      <p class="ref-brief">${esc(a.brief || a.summary || "")}</p>
      <dl class="ref-kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
      ${seg ? `<div class="rep-note">这一镜取原片 ${seg.from}–${seg.to}s</div>` : ""}
      <div class="ref-paths">
        <div class="ref-path">
          <b>先走草片</b><span>在 3D 里把机位走位搭出来，和原片并排对齐，改到满意再花钱生成。</span>
          <div class="actions"><button id="refRebuild" class="primary">按这份参数建场</button>${d.shots.length ? `<button id="refCompare">和原片并排</button>` : ""}</div>
        </div>
        <div class="ref-path">
          <b>直接照着原片生成</b><span>整条原片当参考视频交给 Seedance，主体换成已批准的定妆照。快，计费；运镜是原片的。</span>
          <div class="actions"><button id="refDirect" ${d.shots.length ? "" : "disabled title='先建场，才有镜头可生成'"}>用原片生成这一镜</button>${cur.ref ? `<button data-preview="${esc(cur.ref)}" data-kind="video">看原片</button>` : ""}</div>
        </div>
      </div>
      ${shot ? `<button id="refCov" class="ref-cov" data-tip="多机位覆盖" data-tip-sub="一条素材，同一瞬间换 N 个机位再拍一遍，原声不动">多机位覆盖这一镜</button>` : ""}
    </div>`
        : `<div class="ref-empty">还没读过参照。贴条链接或拖个文件进来，它会读出机位、光和节奏，再把场建出来。</div>`
    }
    ${
      plan
        ? `<details class="ref-plan" data-k="plan"><summary>这一场是怎么建出来的 · ${esc(plan.summary || "")}</summary>
      <ol>${plan.steps.map((st) => `<li><code>${esc(st.action)}</code><span>${esc(st.why || "")}</span></li>`).join("")}</ol>
      ${(plan.warnings || []).length ? `<div class="ref-warn">${plan.warnings.map((w) => `<div>⚠ ${esc(w)}</div>`).join("")}</div>` : ""}
      ${plan.refined ? `<div class="ref-warn"><div>${plan.refined.ok ? `按你的补充又调了 ${plan.refined.steps} 步` : `补充那句没调动：${esc(plan.refined.reply || "")}`}</div></div>` : ""}
    </details>`
        : ""
    }
    ${
      jobs.length
        ? `<details class="ref-plan" data-k="jobs"><summary>最近 ${Math.min(8, jobs.length)} 次读参照</summary>
      <div class="ref-jobs">${jobs
        .slice(0, 8)
        .map(
          (j) =>
            `<div class="ref-job"><span title="${esc(j.prompt || "")}">${esc((j.inputs?.title || j.prompt || j.id).slice(0, 40))}</span>${badge(j.status)}${j.status === "running" ? ` ${j.progress || 0}%` : ""}<i>${esc(j.result?.shots ? j.result.shots + " 个镜头" : j.result?.url ? "素材已就位" : j.hint || j.error || j.note || "")}</i>${j.result?.ref || j.result?.url ? `<button data-preview="${esc(j.result.ref || j.result.url)}" data-kind="video">看</button>` : ""}</div>`,
        )
        .join("")}</div>
    </details>`
        : ""
    }`;

    const urlIn = $("refUrl"),
      hintIn = $("refHint");
    urlIn.value = keep.url;
    hintIn.value = keep.hint;
    for (const k of keep.open)
      el.querySelector(`details[data-k="${k}"]`)?.setAttribute("open", "");
    if (keep.focus && $(keep.focus) && !$(keep.focus).disabled)
      $(keep.focus).focus();
    $("refMode").onchange = (ev) => {
      refMode = ev.target.value;
    };
    const go = () => {
      const u = urlIn.value.trim();
      if (!u) return toast("先贴一条链接", true);
      urlIn.value = "";
      report(
        dispatch("reference.replicate", {
          url: u,
          mode: refMode || undefined,
          hint: hintIn.value.trim() || undefined,
        }),
      );
    };
    $("refGo").onclick = go;
    urlIn.onkeydown = (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        go();
      }
    };
    const drop = $("refDrop"),
      file = $("refFile");
    drop.onclick = () => file.click();
    file.onchange = () =>
      file.files[0] && uploadRef(file.files[0], hintIn.value.trim(), refMode);
    drop.ondragover = (ev) => {
      ev.preventDefault();
      drop.classList.add("over");
    };
    drop.ondragleave = () => drop.classList.remove("over");
    drop.ondrop = (ev) => {
      ev.preventDefault();
      drop.classList.remove("over");
      const t =
        ev.dataTransfer?.getData("text/uri-list") ||
        ev.dataTransfer?.getData("text/plain");
      const f = ev.dataTransfer?.files?.[0];
      if (f) return uploadRef(f, hintIn.value.trim(), refMode);
      if (t && /^https?:\/\//i.test(t.trim())) {
        urlIn.value = t.trim();
        go();
      }
    };
    $("refRebuild")?.addEventListener("click", () =>
      report(
        dispatch("reference.replicate", {
          ref: cur.ref,
          from: cur.from ?? undefined,
          to: cur.to ?? undefined,
          mode: refMode || undefined,
          hint: hintIn.value.trim() || undefined,
        }),
      ),
    );
    $("refCompare")?.addEventListener("click", () =>
      dispatch("project.set-view", { mode: "compare" }),
    );
    $("refDirect")?.addEventListener("click", () =>
      report(
        dispatch("generation.submit", {
          mode: "v2v",
          provider: selectedGeneration(store.get(), "video"),
          reference: "origin",
        }),
      ),
    );
    $("refCov")?.addEventListener("click", async () => {
      const r = await dispatch("shot.coverage", { shotId: shot.id });
      report(r);
      if (r.ok) {
        await dispatch("generation.prompt", { shotId: shot.id });
        toast(`排了 ${r.count} 个机位，在生成面板里看`);
        openDrawer("gen");
      }
    });
    el.querySelectorAll("[data-preview]").forEach(
      (n) =>
        (n.onclick = () =>
          showPreview(n.dataset.preview, n.dataset.kind, "参照")),
    );
  }

  async function uploadRef(f, hint, mode) {
    const kind = f.type.startsWith("video")
      ? "video"
      : f.type.startsWith("image")
        ? "image"
        : null;
    if (!kind) return toast("只认图片和视频", true);
    if (!client.base) return toast("要连上后端才能读参照", true);
    toast(`上传 ${f.name}…`);
    try {
      const r = await fetch(new URL(`upload?label=${kind}`, client.base), {
        method: "POST",
        headers: { "content-type": f.type },
        body: f,
      });
      const out = await r.json();
      if (!out.ok) throw new Error(out.error || "上传失败");
      report(
        dispatch("reference.replicate", {
          ref: out.url,
          mode: mode || undefined,
          hint: hint || undefined,
        }),
      );
    } catch (err) {
      toast(String(err.message || err), true);
    }
  }
}
