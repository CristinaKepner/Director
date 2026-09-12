# Harness 系统设计 · 人、CLI 和 Agent 操作同一台导演台

> 这份文档说明 Director Console 的 **harness**：把一个可编辑的 3D 影视工程包成一层「谁来操作都一样、每一步都可审计可撤销」的系统。
> 对照：`docs/backend-api.md`（线上契约）、`PRODUCT.md`（产品取舍）、`README.md`（怎么跑）。

## 1. 问题

生成式影视预演有三类操作者：**人**（点界面）、**脚本 / CLI**（批处理）、**Agent**（自然语言→动作）。
天真的做法是各给一套入口：界面直接改 React/Three 状态、脚本直接改 JSON、Agent 直接写代码。结果是三份真相、三套 bug、没人能回答「这个镜头为什么变了」。

harness 的职责就是**只留一个入口**，并保证这个入口上的每一次调用都是：有契约的、可校验的、可观测的、可撤销的。

## 2. 分层

```
Shell      web/（浏览器） · desktop/（macOS 客户端） · server/bin/director.mjs（CLI） · curl / 外部 Agent
              ↓ 只发 Action，只持有视图状态（选中、视口、播放头、Tab）
Host       server/src/host.mjs      权威运行时 · 自动保存 · SSE 广播 · 媒体存储 · 录制看门狗
              ↓ 同一个 registry
Runtime    core/                    Source of Truth（store）· Action Registry · 状态机 · 事件日志 · 撤销栈
              ↓ hooks（运行时只声明契约，不关心谁实现）
Adapters   ark.mjs 生成 · llm.mjs 规划 · film.mjs 拼片 · publish.mjs 外发 · viewport.js 录制与抓帧
```

四条不可违反的边界：

| 边界 | 规则 | 为什么 |
|---|---|---|
| Shell → Runtime | **只能发 Action**，不能改 store | 否则事件日志漏记，撤销就不可信 |
| Runtime → 环境 | core **不 import DOM、不 import node:** | 同一份 core 要能在页面、后端、CLI、测试里跑 |
| Runtime → 能力 | 通过 `hooks`，不直接调 | 录制只有浏览器能做、ffmpeg 只有后端有，运行时不该知道 |
| Host → Shell | 后端推**完整快照**，不推增量 | 多客户端同屏时不需要做冲突合并 |

## 3. 唯一入口：Action Registry

`core/actions.js` 里 100 个左右的 Action，每个都是一份完整契约：

```js
register("camera.transform", {
  doc: "移动机位",                    // Agent 的工具说明，也是 /api/capabilities 的输出
  params: { id: "string", height: "number", … },
  required: ["id"],
  validate: (payload, state) => …,   // 引用完整性：id 存在吗、枚举合法吗
  undoable: true,                    // 进撤销栈
  handler: (payload, meta) => …,     // 唯一允许 store.patch 的地方
});
```

`dispatch(name, payload, meta)` 依次做：状态机许可 → 幂等键去重 → 必填检查 → 校验 → `--dry-run` 短路 → 压撤销栈 → 执行 → 记事件（source / actorId / before / after / ms / ok）。

**这条路径是同步的**。慢操作（生成、拼片）一律是「建任务 → 立刻返回 id → 适配器异步推进 → 进度写回任务记录 → SSE 广播」。`generation.submit` 和 `film.export` 都是这个形状；新加的慢能力也必须是。

## 4. 状态机是权限闸，不是装饰

`EDIT → BLOCKING → REHEARSAL → ARMED → RECORDING → REVIEW → GENERATING → APPROVED`

每个 Action 声明自己在哪些状态下合法（`capabilities()` 里的 `allowedIn`）。录制中不能删演员、不能改焦距——不是靠界面把按钮灰掉，而是 dispatch 直接拒绝。界面灰按钮只是同一事实的第二次表达。

这条对 Agent 尤其重要：Agent 不看界面，它只能撞到这堵墙。

## 5. 事件日志与撤销

每个 Action 产出一条事件：`{id, action, source, actorId, targetIds, before, after, ok, ms}`。

- `source`：human / agent / system / cli —— 「谁改的」
- `actorId`：Agent 的子代理角色（scene-builder / cinematography / motion / lighting / continuity / storyboard / generation / review）—— 「哪个角色改的」
- `before` / `after`：受影响对象的快照 —— 「改成了什么」

撤销用**快照式**（`pushHistory` 存整份可持久化工程），不是命令反演。代价是内存（上限 80 步），换来的是「任何 handler 都不用自己实现 undo」——这是让 Action 数量能长到 100 个的关键取舍。`project.undo-to <eventId>` 让「把 Agent 刚才那一串全撤了」变成一个动作。

## 6. Agent 的约束面

Agent 不是特权用户，是**受限用户**：

1. **工具白名单**：`llm.mjs` 的 `PLANNABLE` 正则决定哪些 Action 能进计划。`project.new`、批量删除这类不给。
2. **只出计划，不出代码**：模型返回 `{steps:[{action,payload,label}], notes, reply, needsConfirm}`。每一步照样走 `dispatch`，校验、状态机、事件日志一个不少。
3. **不认识的 Action 被丢掉**并记进 `notes`，不静默执行。
4. **确认闸**：大改（清场、批量生成）`needsConfirm=true` → `agent.confirm` / `agent.cancel`。
5. **降级**：网关不可用或返回不可解析 JSON → 回退到内置规则规划器，产品不停摆。
6. **参数协商**：网关前面挂着多家厂商，参数拼法不一致（`max_tokens` vs `max_completion_tokens`、固定 temperature、不支持 `json_object`）。适配器不维护模型表——第一次 400 时按错误信息**就地协商并记住这个模型的写法**，最多三次，然后照常工作。新模型（如 gpt-6-astra）不改代码就能用。

系统提示词里写死了两条产品语义，因为模型默认会猜错：
- 「给出分镜表」是**建场请求**不是提问——必须把镜头建进工程，不能只写文字。
- 信息不全（没给品牌名、产品品类）用占位建出来、把假设写进 `notes`，不要停下来反问。

## 6.5 把模型的思考过程显示出来

规划要几十秒，中间一片空白是最差的体验。所以规划走**流式**，一边出一边推给所有页面：

```
llm.mjs   stream:true → 解析 SSE delta → 累积两路可见内容 → onDelta（350 ms 节流）
host.mjs  emitThinking() → SSE 侧信道帧 {seq, thinking}
          —— 不进工程状态、不进撤销栈、不 bump version，纯展示
ui.js     规划中：.msg.thinking.live 实时滚动；结束后收成一条可折叠的「思考过程」
```

两路可见内容，取决于模型给不给：

| 模型 | 看到什么 |
|---|---|
| DeepSeek V4（吐 `reasoning_content`） | 真实推理文本，逐字流出来 |
| GPT-5.6 / GPT-6 astra（只给 reasoning_tokens，不给文本） | 它正在写的计划——从流里实时抽 `"label"` 字段，一步步显示「正在规划第几步、写到哪一步」 |

第二种不是退而求其次的假象：那就是模型此刻真的在产出的东西。收尾时把推理文本、完整步骤、notes、token 用量存成一条 `role: "thinking"` 的对话消息，默认折叠，随时能回看这一轮它是怎么想的。

## 6.6 工具卡片：Diff / Shot Card / 逐条批准

Agent 每执行一步都留一张卡片。卡片要回答三个问题，而不是把 JSON 甩出来：

- **改了什么（Diff）** —— 事件日志本来就存了受影响对象的 `before` / `after` 快照，所以直接对出来就行。往下钻两层拿叶子字段说话（机位的位置在 `pose.position`、焦段在 `lens.focalLength`），折叠状态下就显示一行「位置 [-1.86, 1.49, 3.01] → [-1.86, 2.4, 3.01]」，展开是对照表，原始参数收在「原始参数」按钮后面。
- **动的是哪一镜（Shot Card）** —— 动作打到某个 shot 上时，卡片带一张镜头卡：镜号 · 标题 · 时长 · 机位 · 焦段 · 运镜 · 状态，加一个「跳到该镜」。
- **要不要执行（逐条批准）** —— collaborative 模式下的方案不再是要么全收要么全退：每步一个勾选框，`agent.confirm { skip: [下标] }` 只执行勾上的。全不勾就等于取消，不产生改动。

一个坑记在这：方案里有 `quiet` 步骤（不显示给人看），所以**复选框必须带未过滤的真实下标**，否则取消勾选第二条会跳掉另一步。`agent.run-step` 走的是过滤后的下标，两边不能混。

> 关于 assistant-ui：它要 React + 打包，而 `web/` 是有意零构建的原生 ES 模块，所以这一轮只借它的卡片形态，没有引入依赖。真要接的话，runtime 选 **ExternalStoreRuntime** —— 对话、工具卡片、撤销都在 Action Registry 和事件日志里，后端已经是 Source of Truth，前端不该另存一份。默认的 AI SDK runtime 会让 Agent 直接和 OpenAI 对话，绕开状态机和事件日志，等于放弃这套 harness 的全部约束。

## 7. hooks：能力在哪一层实现

运行时声明契约，宿主注入实现。目前四个：

| hook | 谁实现 | 契约 |
|---|---|---|
| `capture` | 浏览器 viewport | `() → dataURL`，抓一帧 Program 画面 |
| `recorder` | 浏览器 viewport | `start(take, shot)` / `stop(id)`，MediaRecorder 录代理视频 |
| `generation` | `adapters/ark.mjs` | `submit(job, update)`，真实供应商；不认识的 provider 落回模拟队列 |
| `film` | `server/src/film.mjs` | `assemble(edit, update) → {url, bytes, seconds}`，ffmpeg 拼片 |

规则：**hook 缺席时产品降级但不报错**。没有 ark key → 模拟队列照样能演完整流程；没有 ffmpeg → `film.export` 返回带安装建议的错误而不是崩；没有浏览器 → `take.record` 无头完成，只留快照。

## 8. Shell 契约

- **后端是 Source of Truth**。Shell 只拥有视图状态（选中项、视口模式、播放头、Tab、Gizmo），后端快照不覆盖这些。
- **后端不可达时自动降级**为单机模式：同一份 core 在页面里跑，工程存 localStorage，顶栏挂明显标记，每 10 秒重试。
- **桌面端不是第二个产品**。`desktop/main.mjs` 起同一个后端、装同一个 `web/`，只把浏览器的凑合替换成原生的：菜单、保存面板、Dock 进度条、通知、跑片时拦住误关窗口。桌面端**没有**自己的业务逻辑——菜单项全部落到 `web/js/film.js` 和 Action Registry。

## 9. 一致性控制（跨镜头的身份）

生成模型每次调用都是无记忆的，所以一致性必须由 harness 维护：

```
generation.reference {entityId}      → Seedream 出定妆照 / 产品图，落成 asset（未批准）
asset.approve {id}                   → 导演拍板
generation.submit {shotId}           → referencesForShot() 把该镜出现的实体的已批准参考
                                       自动塞进 job.inputs.references，随提示词一起提交
```

关键设计：**参考绑在实体上，不绑在镜头上**。演员 A 的定妆照批准一次，之后 A 出现的每个镜头自动带上，导演不用记得。换 GLB、换保真度都不影响——`semanticType` / `id` / `continuity` 不变。

## 10. 成片流水线（本次新增）

```
runBlockout()   逐镜：shot.select → take.record（页面 MediaRecorder 录 Program 画面）
                    → 等 take.finish（webm 上传到后端 /media/）→ 抓关键帧进故事版 → Circle
renderShots()   逐镜：generation.prompt → generation.submit（Seedance 2.5；已批准参考自动随行）
film.export     后端 ffmpeg：每镜取一段素材 → 统一画幅/帧率/像素格式 → concat 成一条片子
```

`film.plan` / `film.export` 的 `source` 三档，是这条流水线的核心取舍：

| source | 每镜取什么 | 用途 |
|---|---|---|
| `blockout` | 该镜圈选的 Take 白模视频 | 先看剪辑节奏对不对，零成本 |
| `generated` | 该镜最后一个成功的生成任务 | 成片 |
| `auto`（默认） | 有生成用生成，没有的用白模顶上 | **半成片也能整条播** —— 生成是逐镜推进的，不该等全齐了才能看 |

素材长度不一致由拼接器兜底：每段先按镜头真实时长 `-t` 裁剪，再统一到工程画幅和帧率。所以 Seedance 最短只出 4 s、而镜头是 3 s，也能正确入片。

## 11. 加一个能力的标准流程

1. 在 `core/actions.js` 注册 Action：`doc` / `params` / `required` / `validate` / `undoable` / 状态机。慢操作按「建任务 + 异步推进」写。
2. 要外部能力就加 hook，别在 core 里 import 环境。
3. 宿主注入实现（`server/src/host.mjs` 或 `web/js/viewport.js`）。
4. Shell 接一个入口——按钮或菜单项，落到同一个 Action。
5. `tests/` 加一条无 UI 验收；`npm test && npm run test:api` 必须绿。

不需要改的：CLI（自动从 registry 生成）、`/api/capabilities`（同上）、Agent 工具清单（同上）、事件日志、撤销。**这是这套 harness 的复利**。

## 12. 可观测与失败模式

- `GET /api/health`：后端版本、工程规模、生成适配器、规划模型、录制状态、客户端数。
- `context.events` / `context.history`：谁改了什么、撤销栈多深。
- `health.report`：fps、draw calls、命令延迟、录像器状态。
- 桌面端「运行诊断」：密钥、ffmpeg、生成适配器、规划模型一屏看完。

已知失败模式与处理：

| 现象 | 原因 | 处理 |
|---|---|---|
| `NO_PUBLIC_MEDIA_URL` | v2v 的参考视频必须是公网 URL，Ark 不吃 data URL | `--tunnel cloudflared`（只读放开 /media）或 `--public-url` / `--publish feishu`；否则用 i2v |
| `TUNNEL_UNREACHABLE` | 拿到 trycloudflare 地址但公网访问 530 —— 本机代理（Clash / Surge 的 fake-IP）截断了 cloudflared 到边缘的连接 | 给 `*.argotunnel.com` 加直连规则或临时关代理；隧道自测不过就**不会**设置 publicUrl，避免 Ark 拿到坏地址 |
| `duration is not supported` | Seedance 只接受 4–12 s | 适配器钳到区间，拼接时按真实镜长裁回 |
| 客户端录制中途关窗 | Take 卡在 RECORDING | Host 的录制看门狗收尾 |
| 网关 400 参数不支持 | 各厂商参数拼法不一（`max_completion_tokens`、固定 temperature、无 `json_object`） | 适配器按错误信息就地协商并记住该模型的写法，最多三次 |

## 13. 设计原则怎么落到 harness 上

产品侧的原则是**先清空，再按需补充**。harness 侧对应两条机制：

1. **能力按状态暴露，不按存在暴露。** `capabilities()` 里的 `allowedIn` 让界面、CLI、Agent 用同一份事实决定「现在能做什么」。桌面端菜单据此亮/灰：还没有镜头时「导出成片」是灰的，不是藏起来也不是能点了再报错。
2. **主路径三步，其余进「更多」。** 成片菜单静止状态只有 `录白模 → 按分镜生成 → 导出成片`；模式选择（i2v / v2v / t2v）、单镜重跑、分开导出白模/生成，都在「更多」里。这不是把能力砍掉，是把**发现路径**排序：必需 → 常用 → 高级。

对 Agent 同理：工具清单给全，但状态机和 `PLANNABLE` 决定此刻哪些真的能调。人和 Agent 面对的是同一套收敛规则。
