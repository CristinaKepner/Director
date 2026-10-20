# 角色库

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

角色库展示工程中的角色、道具、车辆和武器，按当前场次筛选；可定位实体、跳到相关镜头、预览定妆照、批准或删除资产，以及请求新的参考图。

角色数据仍属于 `entities`，参考图属于 `assets`，生成进度属于 `jobs`。面板不维护第二份角色数据。`context.character` 将参考按 face/body/wardrobe/prop/style/voice 分组，并报告身份资料缺口及出场镜头。

`generation.reference` 负责生成请求，默认 Seedream 5，生成结果沿用共享任务回写逻辑登记为未批准资产。`asset.approve` / `asset.delete` 仍属于通用资产能力。`referencesForShot` 优先取相机目标、镜头目标，再取工程内其他角色/物品；仅收集已批准的非音频、非视频参考，按上限截取。

浏览器与 Agent 都走同一套 Action。批准不会由迁移自动触发。实体新建、姿态与场次管理仍属于舞台功能，供应商调用与任务完成回写仍属于生成能力。

验证：`tests/runtime.test.mjs` 覆盖定妆生成、未批准资产、角色卡用途分组、批准后镜头参考及状态校验。真实付费生成没有作为迁移测试。
