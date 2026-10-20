# 3D 舞台、实体、相机与灯光：实现清单

[功能说明](README.md)

## 源码入口

- [core/features/stage/spatial.js](../../../core/features/stage/spatial.js)
- [core/features/stage/coverage.js](../../../core/features/stage/coverage.js)
- [web/js/features/stage/viewport.js](../../../web/js/features/stage/viewport.js)
- [web/js/features/stage/phys.js](../../../web/js/features/stage/phys.js)
- [web/js/features/stage/spatial-panel.js](../../../web/js/features/stage/spatial-panel.js)
- [web/js/features/stage/stage-workspace.js](../../../web/js/features/stage/stage-workspace.js)
- [web/js/features/stage/stage-result.js](../../../web/js/features/stage/stage-result.js)
- [web/js/features/stage/eval-panel.js](../../../web/js/features/stage/eval-panel.js)

跨运行环境按同名功能目录关联；共享 Action 注册、全局 UI 和宿主装配未复制进功能目录。

## 实际注册操作

| 操作 | 用途 | 必填参数 | 可撤销标记 |
| --- | --- | --- | --- |
| `camera.create` | 创建摄影机。focalLength 焦距 mm、position、target 实体 ID、rig、preset 景别 | — | 是 |
| `camera.delete` | 删除机位 | id | 是 |
| `camera.frame` | 按景别与覆盖角自动放置机位。size: ECU/CU/MCU/MS/MLS/WS/ELS；angle: front/front_left/front_right/profile_left/profile_right/rear_left/rear_right/back/low/overhead | id | 是 |
| `camera.lens` | 设置镜头：focalLength 焦距、aperture 光圈、focusDistance 对焦距离、sensorWidth | id | 是 |
| `camera.look-at` | 机位看向某个实体（null 取消） | id | 是 |
| `camera.nudge` | 相对微调机位（机位自身坐标系，米）：right 画面右 / up 画面上 / forward 推近。保持 look-at 与焦段不变 —— 是平移不是摇镜。amount 词表：一点点/一点/一些/明显/大幅 | — | 是 |
| `camera.pilot` | 把该机位设为 Program（拍摄机）并切到 Program 视图 | id | 否 |
| `camera.rig` | 设置 Rig：free/handheld/dolly/rail/crane/jib/follow/orbit/drone/steadicam | id, rig | 是 |
| `camera.transform` | 移动机位。position 绝对 / delta 相对 / height 只改高度 | id | 是 |
| `camera.update` | 更新机位名称/类型/景别 | id | 是 |
| `entity.create` | 创建语义物体。type: character/vehicle/prop/weapon/building/tree/flower/lamp/environment/smoke；proxy 几何 box/sphere/cylinder/capsule/cone/pyramid/plane；model: 模型库键；assetRef: 任意 glb 地址（本地导入的走 /media/…glb）；position=接地点 | — | 是 |
| `entity.delete` | 删除物体（并清理机位目标、镜头引用） | id | 是 |
| `entity.duplicate` | 复制物体 | id | 是 |
| `entity.path` | 设置物体动线关键帧 [{frame, position, yaw}]；clear=true 清除（只在不给 keyframes 时生效） | id | 是 |
| `entity.pose` | 设置人物姿态。pose: idle/walk/run/drive/sit/aim/crouch/wave/point/fall；joints 覆盖单个关节（弧度）：headYaw,headPitch,spine,lShoulder,rShoulder,lElbow,rElbow,lHip,rHip,lKnee,rKnee | id | 是 |
| `entity.replace-proxy` | 用资产替换代理体（保留语义 ID、变换、镜头引用）。model: 模型库 person/humanoid/character/robot/tree/bush/rock/house/fence/box/chair/table/sofa；asset: 任意 glb URL；asset=null 回到白模 | id | 是 |
| `entity.transform` | 移动/旋转/缩放。position 绝对，delta 相对，yaw 弧度（物体正面朝 +Z） | id | 是 |
| `entity.update` | 更新语义字段：displayName/role/aliases/continuity(合并)/remember(追加备注)/color/dimensions/assetRef | id | 是 |
| `entity.walk` | 走位：waypoints [[x,z]/[x,y,z]…] + durations [每段秒数]（同一点重复 = 原地停留）；自动朝向行进方向。startFrame 默认镜头入点或 0；clear=true 清除 | id | 是 |
| `light.create` | 创建灯光。type: directional/spot/point/area/hemisphere；group: key/fill/rim/neon/practical；attachTo 跟随实体；target 可为坐标或实体 ID | — | 是 |
| `light.delete` | 删除灯光 | id | 是 |
| `light.keyframe` | 灯光强度关键帧 {frame,intensity}；clear 清除（只在不给 frame 时生效） | id | 是 |
| `light.toggle` | 开关灯 | id | 是 |
| `light.update` | 更新灯光字段（color/intensity/position/target/angle/group/enabled/attachTo/castShadow/width/height/name） | id | 是 |
| `scene.create` | 设定场次（名称、环境）。clear=true 时清空现有物体/机位/灯光/镜头 | — | 是 |
| `scene.demo` | 载入示例工程：city-edge / fast-pursuit | name | 否 |
| `scene.environment` | 修改环境：bg 背景色, fog 雾密度, ambient 环境光, sky/ground 半球色, exposure 曝光, wet 湿地面 | — | 是 |
| `scene.pad-select` | 切到某一块台（场景）：视口只画这块、自检和 Agent 上下文只看这块。id 省略 / null = 整台 | — | 否 |
| `scene.pads` | 把台面分成几块（每块一个场景）：pads=[{id,name,index,x,z,w,d}]；clear=true 拆掉分块。1/3/6/9 宫格由 core/features/reference/reference-plan.js 的 padGrid 算 | — | 是 |
| `scene.preset` | 套用灯光预设：softbox-studio/hard-side/noon-daylight/night-neon/sunset/cold-studio/silhouette/three-point/moonlight/noir/daylight。替换预设灯，保留 practical 灯 | preset | 是 |
| `scene.room` | 摄影棚房间：width/depth/height 米，pattern standard/plain/calibration（棋盘 / 纯白 / 校准图案），spacing 格距，walls 后墙+侧墙，cyc 圆角回幕；clear=true 拆掉 | — | 是 |

操作清单来自迁移时的 `core/index.js` capabilities；执行仍须经过状态机、预算、配置与权限校验。这里只展示注册声明，不替代服务端前置条件。
