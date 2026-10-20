# 复刻参照

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

复刻参照接收网络视频链接、本地上传或已有媒体地址，下载素材、抽帧分析主体/机位/光照/运镜，再编译为可编辑场景和镜头。也可以只分析，不建场；读过的同一媒体片段可复用分析结果。

`project.reference` 保存当前参照与分析，`jobs` 保存下载/分析/建场阶段。浏览器面板只持有当前模式和重绘缓存；后端 reader 与 fetcher 由共享宿主注入。缺少配置时返回 NO_READER / READER_NOT_READY / FETCHER_NOT_READY 等明确错误，不伪造分析结果。

`reference.replicate` 建场阶段通过共享 `batch` / `dispatch` 执行编译计划，失败操作会汇总；没有建出镜头时报告 BUILD_EMPTY。自由文字补充仅在 planner 就绪时进一步调整。`reference.use` 可恢复已有任务的分析，无需再次读片。

面板保留读参照、按参数建场、并排对比、视频参考生成和多机位覆盖入口。i2v 关键帧不等价于整段视频参考；估计的焦段和光照不是物理重建。生成仍交给原 Action/供应商链路。旧的手动首屏向导 `web/js/firstrun.js` 是兼容调用者，不替换当前空工程弹窗。

验证：`tests/reference-plan.test.mjs` 覆盖模式、场次、相机、目标和建场；`server/tests/reference-video.test.mjs` 覆盖抽帧与多模态输入。此次保持原有异步处理行为，未新增后台任务取消或跨工程隔离保证。
