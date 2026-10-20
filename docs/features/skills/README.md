# 创作 Skills 与题材模板

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

## 已有能力

[skills-library](../../../skills-library/README.md) 统一收录 135 个原有技能（133 个 Flova、Moss 开发技能、Lemo）与四个代码视频参考库。`installed/` 是原有技能正文和附件的维护来源；`.agents/skills/` 保留兼容发现副本。`catalog.json` 记录分类、入口、文件大小与 SHA-256，服务只读取登记文件，不扫描用户目录。

## 用户与 Agent 流程

在「跟它说」中要求使用某个题材/风格技能。已配置 LLM 的 Agent 先调用 `skills.list` 搜索，再通过 `skills.invoke` 获取正文、主参考及本应用支持的操作。只读结果回到当前轮规划上下文，Agent 随后通过原有操作层提出节点/镜头方案。明确 ID 时可直接 invoke；额外文件由 `skills.files` 搜索，`skills.read` 分页读取。

这是实际技能上下文调用，不是静态链接：HTTP、CLI 和 Agent 共用 `skills.*` Action。未配置 LLM 时仍可从 CLI 或 HTTP 读取技能，但没有新增规则规划器的自然语言技能匹配。

## 规则与边界

- `skills.invoke` 的结果是 `mode: planning-context`：返回真实内容和指导，不启动 shell、HTML、依赖安装、生成任务或验收任务。第三方工具名不自动成为本应用 API。
- list 每页最多 30 项，files 每页最多 50 项。read 默认 12,000 字符、上限 24,000；返回 `nextOffset` 时表示未读完。invoke 读取入口和主参考，每份默认 12,000 字符；不把截断内容当成全文。
- 技能读取不更改工程图、素材审批、预算或采用状态；只记录普通操作事件。离线 CLI 不因此保存或新建工程文件。
- 工作流生成仍须显式确认和预算；技能不能绕过 Semantic If/Loop 分支、无法判断暂停、候选采用及工程隔离。
- 技能服务按宿主加载 catalog；文件读取时校验摘要。目录外路径、越界符号链接、未登记文件、变更正文、非法范围均拒绝。文件缺失或目录未打包返回明确错误，不伪造调用结果。
- 只读续接沿用最多三次模型规划；工程切换后拒绝继续旧规划。需要更多文件时由后续轮次读取，不无限调用模型。
- 新技能修改后运行 `npm run skills:sync` 同步发现副本并重建清单，再重启后端。`npm run skills:index` 仅更新索引并校验副本一致，`npm run check:skills` 检查索引、副本、代码约束与行为。

## 分发

新构建的 Electron 包会将 `skills-library/` 复制到 `Resources/app-src/skills-library`，服务按模块位置查找，不依赖开发机绝对路径。原 `.agents/skills` 打包入口保留。静态网页只复用核心操作定义，正文由后端提供，不内嵌到网页产物。

## 验证

[tests/skills-harness.test.mjs](../../../tests/skills-harness.test.mjs) 覆盖真实技能读取、分页、文件校验、路径隔离、Action 调用、模型工具过滤、读取续接、工程切换与离线 CLI 无写入。模型接口使用测试替身，不代表真实出片质量或线上模型效果。

## 本次验证记录（2026-10-20）

- 接口测试先复现 `skills.*` 未注册、技能只读调用未触发规划续接，再接入实现；22 项技能 Harness 用例通过。
- `npm run check:skills`、`npm run test:features`、`npm run build:web` 通过。
- `npm run test:all`：266 项中 265 项通过。既有 `server/tests/film-edit.test.mjs` 的 FFmpeg 背景混音再次阻塞，结束对应子进程后记录 1 项失败；本次未修改媒体合成实现。
- 按 Electron extraResources 清单组装隔离副本，从另一工作目录启动后端；带认证的 HTTP 成功调用 Flova 技能并返回正文/分页，未认证请求返回 401。
- 未进行真实付费模型生成，未新建 DMG；资源组装与后端验证不等同于 Electron 窗口验收。
