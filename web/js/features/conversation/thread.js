// Agent 线程的分组：哪些消息该收成一张卡。纯函数，不碰 DOM —— 所以能在 node 里测。
//
// 规矩只有三条：
//   · 连着执行的步骤（tool）收成一组
//   · 连着出片的消息（带 jobId 和 media 的 agent 消息）收成一排
//   · 紧跟在步骤组后面的「完成 N/N 步。」是同一件事说两遍，全成了就不再重复
export function threadItems(messages) {
  const out = [];
  for (const m of messages) {
    const last = out.at(-1);
    if (m.role === "tool") {
      if (last?.kind === "tools") last.items.push(m);
      else out.push({ kind: "tools", id: `g_${m.id}`, items: [m] });
    } else if (m.role === "agent" && m.jobId && m.media?.url) {
      if (last?.kind === "media") last.items.push(m);
      else out.push({ kind: "media", id: `v_${m.id}`, items: [m] });
    } else if (m.role === "agent" && last?.kind === "tools" && /^完成 \d+\/\d+ 步。?/.test(m.text || "")) {
      // 「改了 3 处」下面紧跟一句「完成 3/3 步。」是同一件事说两遍。
      // 全成了就不再重复；后面还跟着别的话（比如「没听懂哪一句」）才留，而且只留那部分。
      const rest = String(m.text).replace(/^完成 \d+\/\d+ 步。?\s*/, "").trim();
      if (rest) out.push({ kind: "msg", m: { ...m, text: rest } });
    } else out.push({ kind: "msg", m });
  }
  return out;
}

