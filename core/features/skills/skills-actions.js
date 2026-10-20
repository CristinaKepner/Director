const specs = {
  list: {
    doc: "检索技能库；query 可用英文题材、技能 ID 或分组，分页返回技能与参考库",
    params: { query: "string?", offset: "number?", limit: "1..30?" },
  },
  files: {
    doc: "列出指定技能的参考文件，可按相对路径关键字过滤",
    params: {
      id: "string",
      query: "string?",
      offset: "number?",
      limit: "1..50?",
    },
    required: ["id"],
  },
  read: {
    doc: "分页读取技能或参考文件；nextOffset 非空需继续读取，不执行代码",
    params: {
      id: "string",
      path: "string?",
      offset: "number?",
      limit: "1..24000?",
    },
    required: ["id"],
  },
  invoke: {
    doc: "调用技能 Harness：返回技能正文、主参考与真实可用操作供 Agent 规划，不执行生成或脚本",
    params: { id: "string", goal: "string?" },
    required: ["id"],
  },
};
const unavailable = { ok: false, error: "SKILL_LIBRARY_UNAVAILABLE" };
export function registerSkillActions({ register, hooks }) {
  for (const [method, spec] of Object.entries(specs)) {
    register(`skills.${method}`, {
      ...spec,
      undoable: false,
      handler: (input) => hooks.skills?.[method](input) || { ...unavailable },
    });
  }
}
