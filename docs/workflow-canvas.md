# 主页面画布与节点工作流

## 当前实现（0.9.18）

创作画布默认显示在主页面中央区域。3D 舞台、创作路径与节点工作流共用左侧素材面板、右侧 Director 对话、工程与底部工具栏；不再把整个页面替换成独立画布，也不迁移对话 DOM。打开参考、生成和剪辑面板时可继续保留创作路径。

节点工作流是可保存的**规划图**，不是自动媒体执行器。支持新增、标题拖动、输出到输入连线、参数编辑、删除节点/连线、适合画布、撤销重做。无需碰撞处理与自动排版。资产节点保存文本、CSV 或媒体 URL；目前没有缩略图与文件上传入口，媒体素材仍可通过现有素材面板管理。

节点集：Text、Table、Image、Video、Audio；三视图、光照、运镜；Image Generation、Image Editing、Video / Seedance；Semantic If、Semantic Loop。参考参数暂用可编辑描述表达，避免尚未确定供应商契约时制造无效精细控件。

人设预处理模板追加 8 个节点：文本与三视图 → 生图 → 面部质量条件；true → 修复 → 妆造，false → 妆造；妆造与运镜 → 视频生成。插入模板不清空现有图，重复插入使用不同 ID。模板中的妆造节点是共性图像编辑节点，可改成配饰、贴画、风格或其他预处理。

## 状态和操作契约

权威数据保存在 `project.workflow`，包含 `version: 1`、`nodes`、`edges`。节点含 id、type、label、x/y（画布像素）、params；边含 id、from、to、branch（next/true/false）。旧工程没有此字段时视为空图，无需改写原文件。保存、加载与撤销使用现有工程快照系统。全新或切换工程时清除选择与未完成连线。

所有写操作都通过 `core/actions.js` 注册的 `workflow.*` 操作进入；界面、HTTP 与 CLI 使用同一操作层。校验失败不提交克隆图。删除节点同步删除其所有入边和出边。拒绝不存在的节点、自连、重复连线和图环；Loop 表达节点内部受限重复处理，不通过环形边实现。

`workflow.update` 修改名称、坐标、参数；阈值在 0–1，循环次数为 1–10 整数。`workflow.read` 返回图副本。工作流摘要进入 `context.scene`，Agent 可再读取完整图。图只表达计划，历史回放和撤销不产生模型请求。

实现：`core/workflow.js`、`core/workflow-actions.js`；界面：`web/js/workflow-editor.js`、`workflow-markup.js`、`integrated-workspace.js`。领域回归：`tests/workflow.test.mjs`。

## Agent Runtime 的最小接入

沿用已有 Director Agent 和终端操作集即可让外部 Codex / Claude Code 读取工程、添加和规划节点；本版没有自动检测、嵌套或启动这些外部程序，也没有新增 MCP 服务。外部 Agent 在项目目录启动时可发现 `.agents/skills`；Claude Code 是否自动发现该目录取决于其配置，不做自动发现承诺。

```sh
node server/bin/director.mjs workflow.read --project /path/to/project.json --json
node server/bin/director.mjs workflow.template --project /path/to/project.json --json
node server/bin/director.mjs workflow.add --type light --project /path/to/project.json --json
node server/bin/director.mjs workflow.read --remote http://127.0.0.1:5175 --json
```

桌面程序的本地端口由宿主分配，连接桌面工程时应使用实际端口和现有 token 配置，不假定固定为 5175。对正在打开的工程使用 HTTP 模式，避免离线 CLI 和应用同时覆盖同一个工程文件。

## Semantic If / Loop：判断与执行分离

当前 UI 支持调整条件、阈值、次数，并输入人工置信度预览 true/false 分支。0.7 表示“自然语言条件成立的置信度”阈值，而不是“脸越好分数越高”。输入缺失、非有限值或超出 0–1 时返回 needs-review，不默认 false。达到 Loop 上限返回 limit。当前没有自动迭代，也没有自动视觉评分。

后续接入时，判断器应只拿到当前输入媒体、角色身份约束、用户目标与本节点条件；返回结构化结果：conditionSatisfied、confidence、reason、evidenceRefs、judgeVersion。完整对话可以由主 Agent 保管，视觉子任务只读取必要上下文，避免每个判断节点复制整个上下文。

确定性问题优先使用明确指标，例如分辨率、时长、文件可读性；脸部质量可以接专用评分模型，但必须校准其分数方向和阈值。主观问题（妆容、表情、身份一致性）需要多模态判断。置信度不足时停在人工确认，不让不确定结果进入自动修复循环。

运行器还需：输入/配置/模型版本哈希、候选产物与采用产物区分、执行记录、取消、费用与次数上限、条件分支合流（只等待选中的分支）、错误暂停、变更后下游失效。Loop 应只包住一个明确修复步骤，重复后重新判断，超过上限交还用户。现有 harness 可复用预算、候选与恢复机制，但本版没有把任意规划图接到该执行器。

## Seedance / MOSS Create 接入边界

现有 `server/src/adapters/ark.mjs` / `mosshub.mjs` 继续负责真实生成。本版 Video 节点只是计划，不会自动提交任务，也不宣称已有 MOSS Create 共享调用逻辑。对接时需确认参考图/视频/音频格式与数量、上传地址和有效期、模型版本、异步任务查询、取消、幂等和计费；最终图参考应在真实提交前转换为供应商输入。

## 项目 skills

`.agents/skills/moss-desktop-development` 完整保留用户提供的开发 skill。133 个 `flova-*` 目录将用户提供的 Markdown 包装为可发现的项目 skill，保留 `reference.md`、作者与封面；清单在 `docs/flova-skills.json`。Flova 的工具名仍是原平台术语，入口说明要求先映射真实可用能力，不伪造调用。skills 也随 DMG 复制到 `Resources/app-src/.agents/skills`。

现有项目是原生 ES modules、Node test runner 和静态 CSS。本次沿用这些工具，不做 React / TypeScript / Vitest 全量迁移。新增模块保持领域与 DOM 分离；现有 `ui.js`、`journey-workspace.js`、`actions.js` 仍有历史大函数，未做全量行数整改。项目没有 TypeScript 类型检查配置，不能把 JavaScript 语法检查称作严格类型检查。
