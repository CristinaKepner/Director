# 能力实测：Seedance 2.5 的时长、并行与长镜头（2026-09-12）

全部是对火山 Ark 真实调用的结果，不是文档抄来的。探测用的任务提交后立即 DELETE，只为拿准入判断。

## 1. 单条时长边界

逐秒探测 `contents/generations/tasks` 的 `--duration`：

| 模型 | 可用区间 | 备注 |
|---|---|---|
| `doubao-seedance-2-5` | **4 – 30 秒** | 31 / 35 / 40 / 45 / 50 / 60 全部 `InvalidParameter`；1 / 2 / 3 秒也被拒 |
| `doubao-seedance-2-0` | **4 – 12 秒** | 20 / 30 秒被拒 |

两件事因此被纠正了：

- 之前我把上限按错误信息猜成 12 秒并写死在适配器里。**那是错的**，2.5 能出到 30 秒，写死会把一个 30 秒的镜头悄悄截成 12 秒。现在按模型分别取边界（`ARK_DEFAULTS.videoSeconds`），要的比上限长会在日志里说清楚。
- 低于 4 秒的镜头（剪辑里完全合法）按 4 秒出，再由成片拼接按镜头真实时长裁回。

## 2. 一分钟长镜头：单条做不到

**60 秒一镜到底不可能在一次调用里完成**，上限是 30 秒。所以只有两条路：

- 两个 30 秒片段**硬接** —— 接缝处主体、光线、运动都会跳，不是长镜头。
- **分段续拍**：用上一段的尾帧当下一段的首帧（i2v），让模型接着演。

做了后者：`shot.chain`。

```bash
director shot.chain --shotId shot_03 --provider seedance-2.5
→ 分 2 段串行续拍，每段 30.0s
```

- 段数 = `ceil(镜头时长 / 供应商上限)`，每段等分（60s → 2×30s；用 2.0 则是 5×12s）。
- 第一段有故事版关键帧就走 i2v，否则 t2v；**之后每段都是 i2v，首帧取自上一段的尾帧**。
- 尾帧取的是**倒数第二帧**（`beforeEnd: 0.08s`）——末帧常有压缩伪影，拿它当首帧会把瑕疵带进下一段。
- 每段的提示词追加 `segment k of n … continue seamlessly from the provided first frame, same subject, same lighting, same lens, no cut, no reset. The camera keeps moving in the same direction at the same speed`。
- 全部出完后交给 ffmpeg 拼接器统一画幅帧率并 concat。

**这条链天然是串行的**：第 N+1 段要等第 N 段出完才有首帧。想快就用 `renderShots` 并行出多个独立镜头——两者解决的不是同一个问题，别混。

### 真机验证

拿一个中性场景（暖光棚里一只陶瓷碗）跑 8 秒 = 2×4 秒的真实链路：

```
running 第 1/2 段 | 1:t2v:running85
running 第 2/2 段 | 1:t2v:done100 2:i2v:running73
done                | 1:t2v:done100 2:i2v:done100 | /media/chain_btz1hgom.mp4
```

产物 1920×1080 / 24fps / **8.000s**。在接缝 4.0 秒前后各取两帧（3.7 / 3.9 / 4.1 / 4.3s）：碗的形状、木纹、投影方向、画面比例完全连续，**看不出接缝**，运镜也是接着走而不是重新起幅。

一次踩到的坑：先用 city-edge 示例跑，第一段直接被 Ark 拒了——

```
OutputVideoSensitiveContentDetected.PolicyViolation:
the output video may be related to copyright restrictions
```

那个示例是霓虹街头 + 手枪的黑色电影场景。**内容策略会拦，而且是在出片之后才拦**，所以长链里任何一段被拦都会让整条前功尽弃。这一点在做长内容时要算进成本。

## 3. 并行

**可以，而且没撞到限流。**

- 真实批次：MAISON TVC 一次提交 **10 条 i2v**，全部被接受，9 条在 5 分半内完成（唯一失败的那条是时长参数问题，不是并发）。
- 准入测试：同一瞬间并发提交 **12 条**，12 条全部返回 task id，没有 429、没有排队拒绝。

所以吞吐策略很清楚：

| 目标 | 做法 | 特性 |
|---|---|---|
| 多个独立镜头 | `renderShots` 并行提交 | 快，10 条 ≈ 5 分半 |
| 一个长镜头 | `shot.chain` 串行续拍 | 慢（N 段串起来），但接得上 |

一分钟长镜头用 2.5 = 2 段 × 30 秒，串行，按单段约 3–5 分钟估，**大约 6–10 分钟**。

## 3.5 规划模型：gpt-6-astra 不适合大计划

想用 gpt-6-astra 做「脚本 + 分镜」，实测**它在完整建场任务上跑不完**：

| 任务 | gpt-6-astra | gpt-5.6-sol |
|---|---|---|
| 小改动（改焦段、改运镜、改姿态，7 步） | 28 s ✓ | ~10 s ✓ |
| 4k token 系统提示词 + 简单 JSON | 首字 4 s，流式正常 ✓ | ✓ |
| 30 个元素的大 JSON 数组 | 34 s ✓ | ✓ |
| **完整建场（35 步 + 拆拍）** | **15 分钟零输出** ✗ | **64 s，35 步全成** ✓ |

不是连接挂了：小提示词流式正常、大提示词首字 4 s。问题是 astra 在复杂任务上**先长时间推理再吐第一个 token**，而它又不外传推理文本（只给 `reasoning_tokens` 计数），所以在客户端看就是一条完全安静的连接——既看不到进度，也判断不了它是在想还是死了。

两个因此暴露的真问题都修了：

- **超时 90 s 太短**。原来的默认值会把正常规划掐断，然后回退到规则规划器，输出一堆「没听懂『做一条 90 秒的一镜到底品牌短片』」——**这比多等一会儿糟得多**。改成默认 300 s，可用 `--llm-timeout` 调。
- **参数协商的重试共用了一个 deadline**。适配器为了摸清 `max_completion_tokens` / 固定 temperature 会先撞两次 400，这两次原本吃掉真正那次规划的时限。改成每次尝试独立计时。

结论：**astra 用来做小步修改和推理型判断，建整条片子用 gpt-5.6-sol。** 这条差异不该让用户自己踩，应该按任务规模自动选模型——还没做。

## 4. 配音：现在接不了

`资产库 → 声音` 需要 TTS。两个网关都探过：

```
POST https://aigw.sotatts.online/v1/audio/speech   → 404 Not Found
POST https://ark.cn-beijing.volces.com/api/v3/audio/speech → 404
```

AIGW 的模型清单里有 `gemini-3.1-flash-tts-preview`，但**没有开放 audio 端点**，拿不到音频。所以配音要么让网关开 `/v1/audio/speech`，要么单独接一家 TTS（火山语音合成、MiniMax speech 都行）。

在那之前，架构位已经留好了：配音是 `asset` 的一种（`kind: "voice"`，绑在角色实体上，和定妆照同一套批准流程），生成入口是 `generation.reference` 的兄弟动作。等端点到位，接的是适配器，不动运行时。
