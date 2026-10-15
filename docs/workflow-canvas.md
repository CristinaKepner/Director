# 主页面画布与节点工作流

## 当前实现（0.9.19）

删除 0.9.18 的 journey/workflow 独立界面和入口。主页面中央默认显示创作概览（创作目标、素材参照、镜头计划），节点编排作为同一工作区内的辅助视图。镜头卡片使用原有 shot.select 进入预演，新增镜头复用 camera/shot 操作；素材通过原素材库和 creation.media 进入节点。沿用原产品的左侧素材、右侧 Agent、模型选择、生成抽屉、底部镜头与剪辑工具。镜头预演在同一工作区切换，可返回创作；没有复制 MossCreate 的应用壳、第二份素材状态或第二个 Agent 对话。

每个空工程（没有实体、镜头、素材、节点、参考或创作目标）自动弹出原生 modal dialog 引导：一句话生成 / 依赖参照生成。弹窗支持关闭、Escape 和从概览重新打开；同一工程关闭后不因状态刷新反复弹出。每次新建工程重置表单、关闭状态与选择，不使用“只显示一次”的标记。参照可上传图片/视频或填写 HTTP(S) 链接；上传复用现有后端，50 MB 上限。起步选择记录到 `project.creation`，参照同时注册到 `assets`，节点以 `assetId` 关联。题材探索、参考复刻、A/B 内测是规划方向，不代表已经完成评估实验。

基础节点视图由 `creation-ui/` 的 React Flow 实现，经构建输出到 `web/vendor/creation/`。`web/js/creation-*` 是原生页面与操作层的适配；`core/creation*` 管理起步、媒体入库和当前内容摘要。支持节点拖动、端口连接、双击删除连线、编辑参数、媒体预览、保存和撤销。用户选择为蓝色，Agent 最近的工作流操作标记为绿色。没有碰撞处理和自动排版。

HTML 节点在不含 same-origin 权限的 sandbox iframe 内执行内联 HTML/CSS/JS，CSP 禁止外部网络；时间滑杆调用约定的 `window.film.frame(t)`。这不是任意网页浏览器或成片导出器。

主创作区发起的 Agent 请求只发送当前工程摘要和节点/素材，不携带旧对话；右侧仍显示本工程操作记录。内置规则仅支持原有命令，开放式规划需要配置可用模型。节点图由 Agent 规划，用户确认生成次数预算后可运行；运行与原镜头生成入口并存，候选不自动采用到成片。执行行为见下方“节点运行器”。

旧工程的 Table、Image Generation、Image Editing、Video、Semantic If/Loop 等领域节点和操作保留可读兼容；删掉的是旧界面。人设预处理可在确认后执行；Loop 内部限定为图像修复与复查。

## 状态和操作契约

权威数据保存在 `project.workflow`，包含 `version: 1`、`nodes`、`edges`。节点含 id、type、label、x/y（画布像素）、params；边含 id、from、to、branch（next/true/false）。旧工程没有此字段时视为空图，无需改写原文件。保存、加载与撤销使用现有工程快照系统。全新或切换工程时清除选择与未完成连线。

所有写操作都通过 `core/actions.js` 注册的 `workflow.*` 操作进入；界面、HTTP 与 CLI 使用同一操作层。校验失败不提交克隆图。删除节点同步删除其所有入边和出边。拒绝不存在的节点、自连、重复连线和图环；Loop 表达节点内部受限重复处理，不通过环形边实现。

`workflow.update` 修改名称、坐标、参数；阈值在 0–1，循环次数为 1–10 整数。`workflow.read` 返回图副本。工作流摘要进入 `context.scene`，Agent 可再读取完整图。规划与执行分离：历史回放和撤销不产生模型请求。

实现：`core/workflow.js`、`core/workflow-actions.js`、`core/workflow-compose.js`；界面：`web/js/creation-*`、`creation-ui/src`。领域回归：`tests/workflow.test.mjs`、`tests/workflow-agent.test.mjs`。

## Agent Runtime 的最小接入

沿用已有 Director Agent 和终端操作集即可让外部 Codex / Claude Code 读取工程、添加和规划节点；本版没有自动检测、嵌套或启动这些外部程序，也没有新增 MCP 服务。外部 Agent 在项目目录启动时可发现 `.agents/skills`；Claude Code 是否自动发现该目录取决于其配置，不做自动发现承诺。

```sh
node server/bin/director.mjs workflow.read --project /path/to/project.json --json
node server/bin/director.mjs workflow.template --project /path/to/project.json --json
node server/bin/director.mjs workflow.add --type light --project /path/to/project.json --json
node server/bin/director.mjs workflow.read --remote http://127.0.0.1:5175 --json
```

桌面程序的本地端口由宿主分配，连接桌面工程时应使用实际端口和现有 token 配置，不假定固定为 5175。对正在打开的工程使用 HTTP 模式，避免离线 CLI 和应用同时覆盖同一个工程文件。

## Agent 节点规划与运行器

Agent 的工具白名单已包含 `workflow.compose/add/update/connect/disconnect/remove/read/template`。此前模型生成的这些操作会被过滤，是节点规划无效的根因。`workflow.compose` 用计划内唯一临时 ID 表达新节点及连线；提交时映射真实 ID，可连到已有节点，完整验证后一次性追加，失败不修改工程。现有节点用 update 调整。Agent 读取当前 `creation` 摘要，不依赖旧对话。图形入口包含五类媒体资产、三视图/光照/运镜、图像生成/编辑、Seedance 视频、If/Loop。Agent 最近操作用事件 targetIds 定位绿色标记，用户选择独立显示蓝色。

`workflow.execute {confirm:true,maxGenerations:1..20}` 启动一次运行；界面“运行节点”先确认次数及模型费用。执行操作不在 LLM 规划白名单内，规划不会自动计费。外部 Codex/Claude 可通过已有终端 HTTP 操作集读图和提交规划，无需新建 MCP 或嵌套 shell。尚未实现本地 CLI 自动探测。

运行器位于 `server/src/workflow-service.mjs`、`workflow-runner.mjs`、`workflow-routing.mjs`、`workflow-steps.mjs`；真实生成映射位于 `workflow-generation.mjs`。沿用现有 Ark/MossHub adapter，不声称已有 MOSS Create 共享实现。普通节点输出 next，If 的 true/false 为独立端口；执行前拒绝缺失节点、未知类型、非法分支和图环。未选分支跳过，合流只消费活动分支；不相关的运镜输入不能重新激活被跳过的条件链。

Text/Table 和参考节点将文本约束传入下游；三视图是可编辑的提示约束，不是几何重建或 ControlNet。图像生成有参考图时使用 i2i；图像编辑必须有图片；视频节点有视频时用 v2v、有图片时用 i2v、无媒体时用 t2v。i2v 单张关键帧不代表整段视频参考，多张参考图保留为 reference images。多图参考需先导入本地工程；超过五图/一个视频、不支持的模式、音频参考和 HTML 自动导出会明确失败，不丢弃输入后继续。模型、时长及公网可达性沿用供应商配置检查，不做未经确认的模型替换。

## Semantic If / Loop：真实判断、有限修复

视觉任务通过 `workflow-judge.mjs` 和既有 judge adapter 发起独立多模态请求，只包含当前输入图片、创作目标及上游约束，不复制历史聊天。只读取工程 `/media/` 内的 PNG/JPEG/WebP，远端图先导入工程。返回 `conditionSatisfied`、`confidence`、`reason`、`judgeVersion` 与 usage；缺失、非有限或低于 threshold 的判断停在 needs-review。threshold 是判定置信度下限，不是脸部质量分。没有伪造专用人脸评分模型。旧的 `inspectCondition` 人工 score 预览保留兼容，但不参与自动执行。

If 条件成立走 true（例如面部修复），不成立走 false（跳过修复）。Loop 的 condition 描述“仍需修复的问题”，prompt 指定修复动作，最多 1–10 次；每次针对最新候选重新判断，条件不成立沿 false 出口继续，达到上限则 needs-review，不自动放行。修复次数同时占用本次生成上限，判断次数受图节点数与 Loop 上限约束。遇到失败或不确定不进入下游生成。

`project.workflowRun` 保存当前运行状态、图签名、预算占用、证据、节点记录与候选；生成 job 保存在原 jobs 中并标记 workflowRunId。预算在外部提交前预留，即使提交失败仍占本次名额，避免不确定重试超额。输出预览回到节点卡片；运行结束后可手动把候选加入素材与节点，不自动替换成片。每次运行都是新执行，不自动复用缓存或重试旧生成。通用 generation.retry 禁止重提节点任务。

停止、图修改或工程切换中止后续调度；迟到回调不写入新工程。已提交任务可能继续在供应商计费，本机停止不承诺远端取消。应用重启发现 running 记录会标记 needs-review，不自动重提。暂未实现恢复查询、跨运行缓存、自动采用、专用人脸模型和音频生成。先核对远端任务再确认新运行。

验证对应：`tests/workflow-agent.test.mjs` 覆盖工具过滤、原子规划和光标；`tests/workflow-runner.test.mjs` 覆盖分支合流、低置信度、预算、循环与图环；`tests/workflow-service.test.mjs` 覆盖真实适配器输入契约、并发、取消、持久化与跨工程隔离。模型边界使用替身，测试不会产生真实费用。`npm run check:workflow` 包含新增模块/测试函数行数、前端严格类型和打包检查。

## 项目 skills

`.agents/skills/moss-desktop-development` 完整保留用户提供的开发 skill。133 个 `flova-*` 目录将用户提供的 Markdown 包装为可发现的项目 skill，保留 `reference.md`、作者与封面；清单在 `docs/flova-skills.json`。Flova 的工具名仍是原平台术语，入口说明要求先映射真实可用能力，不伪造调用。skills 也随 DMG 复制到 `Resources/app-src/.agents/skills`。

现有应用保持原生 ES modules / Node tests / 静态 CSS，仅节点视图使用严格 TypeScript 与 React Flow。新增模块通过 `npm run check:creation` 检查函数上限、类型和打包；领域回归通过 `npm run test:all`。新增领域测试在 `tests/creation.test.mjs`；既有 workflow 测试继续保护连线、图校验与撤销。既有 ui.js、host.mjs 和 actions.js 大函数仅做必要接线，未做全仓重构。

## 0.9.19 验证边界

新增起步与参照校验先用失败测试复现，再实现；后端延迟规划跨工程写入同样先复现再修复。`tests/creation-agent.test.mjs` 验证当前工程上下文不含旧对话、切换工程后拒绝旧结果。新模块通过严格类型、格式化后函数行数检查；既有领域/后端 211 项测试通过。真实 Electron 发布包检查主页面引导、节点选择/拖拽/连线、图片上传与预览、镜头预演切换和反复新建；模型生成与语义条件自动执行不属于这次验证范围。DMG 为 Apple Silicon 未签名构建。

导演台与 `/Users/cristinak/Downloads/MossCreate` 是两个独立产品。此处 0.9.19 DMG 只交付导演台；MossCreate 是独立 Base 迭代目录，品牌小字删除属于它的界面。不要把 Base 应用壳直接复制进导演台。

### 主页面重设计的再次验证

弹窗关闭/重开、每次新建重置、两种起步选择、概览镜头创建、进入原预演、节点切换已在源码 Electron 和 0.9.19 发布包中通过。144 项核心测试、严格类型与函数行数检查通过，studio DMG 完整性校验通过。本次全量回归的既有背景音混合测试在 FFmpeg 中持续阻塞；安装版与固定打包二进制均复现，已结束测试子进程。媒体代码未修改，不将本次全量媒体回归记为通过。

### 0.9.19 节点运行修复验证

新增回归先复现 workflow 操作被过滤、缺少原子规划、分支调度和 Agent 光标失效，再修复。核心回归与新增测试通过；全量回归 224 项通过，既有 `film-edit.test.mjs` 的 FFmpeg 背景混音再次阻塞，被结束后记为失败，不声称全量通过。隔离 Electron 检查节点分类、条件端口、分支标签、运行按钮和无模型错误状态；没有调用真实付费模型。生成质量与供应商线上完整链路仍需用户配置后验收。

### 规划摘要截断与只读续接修复

LLM 工程上下文不再对序列化 JSON 做 6,000 字符硬截断；否则位于摘要末尾的 creation 节点、连线和媒体会消失，甚至产生残缺 JSON。creation.media 摘要保留 approved、entityId 和 role，已批准与待批准素材不混淆。

`server/src/planner-reads.mjs` 对纯只读计划执行允许的读取操作，将真实结果放回 `summary.toolResults` 后继续原始请求。最多三次规划（两次补读），达到上限明确报告未产生修改；不自动执行混合写计划或模型生成。用户明确的待确认方案仍走原有确认流程。每次规划和读取前核对工程身份，防止跨工程写入。回归 `tests/planner-context.test.mjs` 覆盖长摘要、只读续接、次数上限、写操作隔离、工程切换和宿主完整调用链；模型均为测试替身，未产生真实费用。

### 历史对话档案
工程菜单的「历史对话 · 按版本查看」只读展示 `project.conversationArchive.versions`；旧工程没有档案时从 `journey.nodes[].agentMessages` 读取实际检查点记录。按版本保留原文和来源，各检查点可能重复；不声称恢复已丢失的聊天。档案随工程保存，但不注入实时 Agent 消息、不执行历史操作、不恢复旧镜头状态。文本通过 textContent 呈现，不执行 HTML。实现：core/conversation-archive.js、web/js/conversation-archive.js；测试：tests/conversation-archive.test.mjs。用户的私人档案和整合工程只保存在本地，不进 Git 或通用 DMG。

「跟它说」顶部的对话版本选择器可直接调取检查点/整合档案原文。历史模式隐藏当前对话和输入框，旧审批按钮不会渲染为可执行控件；选择「当前对话」返回实时消息和待确认计划。切换工程重置选择。查看历史不向模型发送内容，不恢复工程快照。
