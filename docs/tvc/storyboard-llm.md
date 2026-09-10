# Maison · 60 s TVC —— Agent 生成的分镜（gpt-5.6-sol，78757 ms，9565 tokens）

> 输入 brief：为高端时尚品牌制作一条 60 秒 TVC 品牌短片，参考 Apple 的极简产品质感和 CHANEL 的经典优雅调性，要有故事创意和产品展示，适合信息流广告投放，画幅 16:9。
> 通过 `POST /api/agent`（lead 模式）一次完成：23 个 Action 全部成功，随后在 Director Console 里用白模预演、逐镜录 Take、生成故事版。

已规划一条“穿越光影，遇见经典”的 60 秒原创品牌短片：以极简建筑留白承载产品质感，以女性主角从发现、触碰、选择到携带产品的动作形成完整故事线，并提炼极简科技产品摄影与经典法式优雅的特征，而不复制具体品牌资产。

| 镜号 | 时长 | 景别 / 焦距 | 运镜 | 画面内容 | 产品展示 |
|---|---:|---|---|---|---|
| 01《光中初见》 | 6s | ECU / 100mm | 微距缓慢推进 | 黑场被细光切开，手袋从阴影中显现 | 锁扣高光、完整包型，前 2 秒建立产品钩子 |
| 02《步入留白》 | 7s | WS / 35mm | 轻微升降前移 | 缪斯穿过黑色门廊，沿光带走向展台 | 产品作为景深终点，持续保持轮廓识别 |
| 03《触碰材质》 | 6s | CU / 85mm | 克制推近 | 指尖沿提手触碰包身 | 展示皮革颗粒、边油、提手与触感 |
| 04《选择时刻》 | 7s | MS / 50mm | 55° 环绕 | 主角拿起手袋并转身面向光线 | 展示拿取动作、正侧面包型及人物比例 |
| 05《工艺签名》 | 6s | ECU / 100mm | 微距横移 | 高光依次掠过锁扣、针脚与包角 | 集中呈现五金、走线和皮革曲面 |
| 06《与她同行》 | 7s | WS / 35mm | 平行跟随 | 主角携包穿过极简艺廊 | 展示手袋上身效果、动态摆幅与色彩对比 |
| 07《从容凝视》 | 6s | CU / 85mm | 缓慢推进 | 主角在镜墙前停步凝视镜头 | 腰侧携包比例与人物气质同框 |
| 08《双重经典》 | 7s | MS / 50mm | 镜面横移 | 实体与倒影交替重合，眼神和锁扣同轴 | 双角度展示包型，强化金色锁扣记忆点 |
| 09《Maison 永恒定格》 | 8s | ECU / 100mm | 极缓推进 | 产品回到纯净展台，人物剪影离场，右侧留文案安全区 | 完整英雄包型、品牌落版与 CTA 空间 |
| **合计** | **60s** | 4 个机位 | — | 完整的发现—选择—同行—定格叙事 | 产品在全部 9 镜中直接或间接出现 |

确认后将一次性创建场景、5 个语义实体、4 个机位和 9 个镜头。

## Agent 备注

- 这是批量建场景、创建实体、机位与 9 个镜头的大幅工程改动，需要确认后执行。
- 当前产品设定为原创象牙白结构手袋代理体；如有真实 SKU、Logo、包装、材质色卡或 GLB 资产，可后续替换代理并保持镜头引用。
- 本计划完成 60 秒预演分镜搭建，不包含成片生成、配乐、旁白、字幕排版和媒体投放版本裁切。

## 执行的 Action

| # | Action | payload |
|---|---|---|
| 1 | `scene.create` | `{"id": "scene_maison_gallery", "name": "Maison 极简光影艺廊", "environment": {"bg": "#F2F0EC", "fog": 0.006, "ambient": 0.3, "sky": "#F7F5F1", "ground": "#D8D4CD", "e` |
| 2 | `project.set-style` | `{"style": "Minimalist luxury fashion commercial, architectural negative space, sculptural product cinematography, restrained monochrome palette, ivory leather a` |
| 3 | `scene.preset` | `{"preset": "cold-studio", "keepPractical": true}` |
| 4 | `project.set-aspect` | `{"aspect": "16:9"}` |
| 5 | `entity.create` | `{"id": "ent_muse", "type": "character", "displayName": "品牌缪斯", "proxy": "capsule", "color": "#171717", "dimensions": [0.5, 1.78, 0.36], "position": [0, 0, 1], "` |
| 6 | `entity.create` | `{"id": "ent_hero_bag", "type": "prop", "displayName": "Maison 标志手袋", "proxy": "box", "color": "#E9E3D8", "dimensions": [0.38, 0.25, 0.14], "position": [1.35, 1.` |
| 7 | `entity.create` | `{"id": "ent_plinth", "type": "prop", "displayName": "石灰岩产品台", "proxy": "cylinder", "color": "#CFCBC3", "dimensions": [0.85, 1.05, 0.85], "position": [1.35, 0, 2` |
| 8 | `entity.create` | `{"id": "ent_portal", "type": "building", "displayName": "黑色拱形门廊", "proxy": "box", "color": "#111111", "dimensions": [4.2, 4.3, 0.45], "position": [0, 0, 5.2], "` |
| 9 | `entity.create` | `{"id": "ent_reflection_wall", "type": "environment", "displayName": "镜面反射墙", "proxy": "box", "color": "#A9ADB1", "dimensions": [0.12, 3.5, 6], "position": [-2.8` |
| 10 | `entity.create` | `{"id": "ent_light_strip", "type": "lamp", "displayName": "地面光带装置", "proxy": "box", "color": "#F4EBDD", "dimensions": [0.08, 0.02, 7], "position": [0, 0, 1.4], "` |
| 11 | `camera.create` | `{"id": "cam_gallery_ws", "name": "艺廊广角主机位", "type": "cine", "focalLength": 35, "aperture": 4, "sensorWidth": 36, "position": [0, 1.55, -7.5], "target": "ent_mus` |
| 12 | `camera.create` | `{"id": "cam_muse_ms", "name": "缪斯中景侧机位", "type": "cine", "focalLength": 50, "aperture": 2.8, "sensorWidth": 36, "position": [-4.2, 1.5, -1.5], "target": "ent_mu` |
| 13 | `camera.create` | `{"id": "cam_portrait_cu", "name": "人物优雅近景机位", "type": "cine", "focalLength": 85, "aperture": 2, "sensorWidth": 36, "position": [2.8, 1.6, -0.6], "target": "ent_` |
| 14 | `camera.create` | `{"id": "cam_product_ecu", "name": "产品微距英雄机位", "type": "cine", "focalLength": 100, "aperture": 4, "sensorWidth": 36, "position": [1.35, 1.28, -1.2], "target": "e` |
| 15 | `shot.create` | `{"id": "shot_01", "title": "光中初见", "description": "黑场被一束细光切开，象牙白手袋从阴影中显现；先见金色锁扣高光，再逐步读出完整包型。开场两秒即建立产品识别与奢华质感。", "cameraId": "cam_product_ecu", "duration": 6, "m` |
| 16 | `shot.create` | `{"id": "shot_02", "title": "步入留白", "description": "品牌缪斯从黑色门廊步入明亮艺廊，地面光带引向远处展台；大面积留白衬托黑色礼服，手袋在景深尽头保持可辨识轮廓。", "cameraId": "cam_gallery_ws", "duration": 7, "motion` |
| 17 | `shot.create` | `{"id": "shot_03", "title": "触碰材质", "description": "主角停在展台前，指尖沿提手轻触至包身；浅景深把注意力落在皮革颗粒、整齐边油和手部动作上。", "cameraId": "cam_portrait_cu", "duration": 6, "motion": {"type` |
| 18 | `shot.create` | `{"id": "shot_04", "title": "选择时刻", "description": "主角从展台拿起手袋并转身面向光带，镜头绕行形成从人物侧影到正面的优雅揭示；产品始终位于构图视觉中心。", "cameraId": "cam_muse_ms", "duration": 7, "motion": {"ty` |
| 19 | `shot.create` | `{"id": "shot_05", "title": "工艺签名", "description": "连续英雄特写聚焦拉丝金色锁扣、针脚、包角和皮革曲面，受控高光缓慢滑过材质，形成可供信息流截帧使用的产品资产画面。", "cameraId": "cam_product_ecu", "duration": 6, "mot` |
| 20 | `shot.create` | `{"id": "shot_06", "title": "与她同行", "description": "主角携包沿光带穿过极简空间，裙摆与手袋产生克制摆动；镜头平行跟随，黑色服装和象牙白产品形成强烈识别对比。", "cameraId": "cam_gallery_ws", "duration": 7, "motion":` |
| 21 | `shot.create` | `{"id": "shot_07", "title": "从容凝视", "description": "主角在烟灰镜墙前停步并看向镜头，手袋自然置于腰侧；真实人物与镜中倒影共同框住产品，表现自信、克制与经典优雅。", "cameraId": "cam_portrait_cu", "duration": 6, "motio` |
| 22 | `shot.create` | `{"id": "shot_08", "title": "双重经典", "description": "镜头沿镜墙缓慢滑动，主角与手袋的实体和倒影交替重合；最终锁扣高光与主角眼神落在同一视觉轴线上。", "cameraId": "cam_muse_ms", "duration": 7, "motion": {"type"` |
| 23 | `shot.create` | `{"id": "shot_09", "title": "Maison 永恒定格", "description": "手袋回到纯净产品台成为最终英雄画面，主角化作背景中的黑色剪影离场；镜头极缓推进，预留右侧品牌名、核心文案与行动按钮安全区。", "cameraId": "cam_product_ecu", "durati` |