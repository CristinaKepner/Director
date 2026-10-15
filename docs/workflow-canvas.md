# 主页面画布与节点工作流

## 当前实现（0.9.19）

删除 0.9.18 的 journey/workflow 独立界面和入口。主页面中央是工程创作区，沿用原产品的左侧素材、右侧 Agent、模型选择、生成抽屉、底部镜头与剪辑工具。镜头预演在同一工作区切换，可返回创作；没有复制 MossCreate 的应用壳、第二份素材状态或第二个 Agent 对话。

每个空工程（没有实体、镜头、素材、节点、参考或创作目标）显示内嵌引导：一句话生成 / 依赖参照生成。新建工程重置表单与选择，不使用“只显示一次”的标记。参照可上传图片/视频或填写 HTTP(S) 链接；上传复用现有后端，50 MB 上限。起步选择记录到 `project.creation`，参照同时注册到 `assets`，节点以 `assetId` 关联。题材探索、参考复刻、A/B 内测是规划方向，不代表已经完成评估实验。

基础节点视图由 `creation-ui/` 的 React Flow 实现，经构建输出到 `web/vendor/creation/`。`web/js/creation-*` 是原生页面与操作层的适配；`core/creation*` 管理起步、媒体入库和当前内容摘要。支持节点拖动、端口连接、双击删除连线、编辑参数、媒体预览、保存和撤销。用户选择为蓝色，Agent 最近的工作流操作标记为绿色。没有碰撞处理和自动排版。

HTML 节点在不含 same-origin 权限的 sandbox iframe 内执行内联 HTML/CSS/JS，CSP 禁止外部网络；时间滑杆调用约定的 `window.film.frame(t)`。这不是任意网页浏览器或成片导出器。

主创作区发起的 Agent 请求只发送当前工程摘要和节点/素材，不携带旧对话；右侧仍显示本工程操作记录。内置规则仅支持原有命令，开放式规划需要配置可用模型。节点图仍是可保存的规划图，不会自行运行 Semantic If/Loop、修复或收费生成。现有生成和剪辑入口继续沿用原产品流程。

旧工程的 Table、Image Generation、Image Editing、Video、Semantic If/Loop 等领域节点和操作保留可读兼容；删掉的是旧界面。人设预处理与语义循环的自动执行继续属于后续迭代。

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

现有应用保持原生 ES modules / Node tests / 静态 CSS，仅节点视图使用严格 TypeScript 与 React Flow。新增模块通过 `npm run check:creation` 检查函数上限、类型和打包；领域回归通过 `npm run test:all`。新增领域测试在 `tests/creation.test.mjs`；既有 workflow 测试继续保护连线、图校验与撤销。既有 ui.js、host.mjs 和 actions.js 大函数仅做必要接线，未做全仓重构。

## 0.9.19 验证边界

新增起步与参照校验先用失败测试复现，再实现；后端延迟规划跨工程写入同样先复现再修复。`tests/creation-agent.test.mjs` 验证当前工程上下文不含旧对话、切换工程后拒绝旧结果。新模块通过严格类型、格式化后函数行数检查；既有领域/后端 211 项测试通过。真实 Electron 发布包检查主页面引导、节点选择/拖拽/连线、图片上传与预览、镜头预演切换和反复新建；模型生成与语义条件自动执行不属于这次验证范围。DMG 为 Apple Silicon 未签名构建。
