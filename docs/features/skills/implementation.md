# 创作 Skills 与题材模板：实现清单

[功能说明](README.md)

## 源码与数据入口

- [skills-library/catalog.json](../../../skills-library/catalog.json)：135 个技能与四组参考的入口及文件校验清单。
- [skills-library/installed](../../../skills-library/installed)：原有技能的完整正文及附件。
- [.agents/skills](../../../.agents/skills)：外部 Agent 发现兼容副本。
- [docs/flova-skills.json](../../flova-skills.json)：Flova 名称、题材与原始出处。
- [core/features/skills/skills-actions.js](../../../core/features/skills/skills-actions.js)：共享操作定义，通过宿主 hook 调用。
- [server/src/features/skills/harness.mjs](../../../server/src/features/skills/harness.mjs)：检索、读取和调用上下文组装。
- [server/src/features/skills/library.mjs](../../../server/src/features/skills/library.mjs)：范围、路径、分页及内容校验。
- [server/src/features/agent/planner-reads.mjs](../../../server/src/features/agent/planner-reads.mjs)：技能只读结果回传规划器。
- [tools/sync-skills.mjs](../../../tools/sync-skills.mjs)：索引生成与发现副本同步校验。
- [tests/skills-harness.test.mjs](../../../tests/skills-harness.test.mjs)：行为与调用链回归。

## 实际注册操作

| 操作 | 行为 |
| --- | --- |
| `skills.list` | 按 query 搜索，offset/limit 分页返回技能或参考库元数据 |
| `skills.files` | 按 id 查询已登记文件，可按 query 搜索路径 |
| `skills.read` | 按 id、path、offset、limit 读取经过校验的文本页 |
| `skills.invoke` | 按 id、goal 返回技能指导、主参考和当前支持的操作，不执行生成 |

```sh
node server/bin/director.mjs skills.list --query flova-005 --json
node server/bin/director.mjs skills.invoke --id flova-005-ai-short-drama-one-stop-generation --goal "校园短剧" --json
node server/bin/director.mjs skills.read --id flova-005-ai-short-drama-one-stop-generation --path reference.md --offset 12000 --json
node server/bin/director.mjs --remote http://127.0.0.1:5175 skills.files --id reference-PDoomVideo --query STORYBOARD --json
```

HTTP 使用已有 `POST /api/actions`，例如 `{"action":"skills.invoke","payload":{"id":"lemo-opuscar","goal":"水墨短片"}}`。带认证的服务沿用现有 token，端口以实际宿主配置为准。
