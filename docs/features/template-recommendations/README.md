# 模板推荐

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

模板推荐根据当前镜头的题材、主体、台词与运动信号选择提示词结构，显示推荐理由；用户可以为当前镜头或整个工程固定模板，也可以清除固定选择回到自动推荐。

模板和来源元数据由 `seedance-library.js` 提供；`seedance.js` 负责选择、标题、本地化清单、时间轴与提示词说明。`tools/sync-seedance.mjs` 同步生成数据，保留上游来源和许可证。它与项目 Skills 库不同：本功能提供可直接编译的结构模板，Skills 提供 Agent 创作上下文。

持久化选择保存在 `project.promptTemplate` 或镜头的 `promptTemplate`。优先级为镜头指定、工程指定、自动推荐。无效模板返回 NOT_FOUND，无效镜头返回 NO_SHOT；选择可撤销。面板再次点选当前镜头已固定模板会清除它，然后调用 `generation.prompt` 刷新提示词，不提交媒体生成。

提示词编译器依赖本功能导出的时间轴/模板逻辑，具体生成任务仍由生成功能处理。公开 `core/index.js` 导出和 `context.templates` / `prompt.template` 操作契约保持不变。

验证：`tests/seedance.test.mjs` 覆盖自动推荐信号、手选/撤销、时长分配、约束顺序和来源许可。
