# 3D 导演台 · 接续开发包

本包是一个**可运行的浏览器端 3D 导演台**（摆位 → 编排 → 分镜），用于接续开发。

## 三步跑起来

```bash
cd tapnow-studio-replica
bun install          # 若无 bun: npm i -g bun
bun run dev          # → http://localhost:5199
```

打开后会自动载入 **15 秒样片《走廊遭遇》**（4 机位 / 6 段分镜 / 2 名演员）。点时间轴的 ▶ 播放即可看到成片；想从空场景开始，删掉 `public/sequence-15s.js` 或清空 localStorage 的 `tap-replica.project`。

## 包内容

```
tapnow-studio-replica/     工程本体（源码 + 3D 资源 + 文档）
   README.md               ← 先读这个：目录地图、数据模型、验证探针、缺口清单
   HANDOFF.md              开发日志 §1–§24：每轮加了什么、修了哪些缺陷、怎么验证的
   15s-走廊遭遇-分镜.md      样片的分镜表 / 时间表 / 微调入口
   public/models/          glTF 资产（随包，勿删）
   public/sequence-15s.js  样片编排脚本（幂等，可在控制台重跑）
docs/
   tapnow-3d-studio-界面架构.md     原站界面结构探查（还原依据）
   tapnow-3d-studio-功能面探查.md   原站功能面逐项探查
```

未包含 `node_modules/` 与 `dist/`（`bun install` / `bun run build` 自行生成）。

## 阅读顺序建议

1. `README.md` —— 概念与数据模型（走位/关键帧/镜头轨/取景视角的优先级规则）
2. 打开页面点开时间轴，按 `HANDOFF.md §22` 对照 15s 样片的分镜表 —— 先建立"数据长什么样"的直觉
3. `HANDOFF.md` 目录扫一遍，再按需细读某一节的"修复"段落 —— 里面记了踩过的坑（例如：自动保存曾漏掉关键帧、`fpView` 曾漏掉镜头轨导致机位入镜、hook 顺序 bug）
4. 改代码前看 `README.md` 末尾的**主循环顺序契约**

## 当前状态

- `bunx tsc --noEmit` 通过、`bun run build` 通过。
- **一处未跑完的验证**：故事板「按镜头轨生成」→ 分镜卡（镜号/时间码/缩略图）→ 时间码跳回 → 写说明 → 导出分镜表。代码已完成，验证清单见 `HANDOFF.md §24`。
- 验证方式以**运行时探针 + 截图**为主：`window.__studioStore` / `__studio_debug` / `__studioStage`（详见 README「自动化验证」）。

## 建议的下一步

按价值排序（README「接续开发」一节有展开）：

1. 成片导出（按镜头轨逐段录制再拼接）
2. 运镜路径可视化编辑（相机路径目前只能录制）
3. 走位曲线平滑与朝向模式
4. 取景显示辅助开关
5. 分镜表回流时间轴（Markdown → cuts）
6. 多人站位模板扩展

有任何设计取舍的疑问，优先在 `HANDOFF.md` 里搜关键词（能力名/字段名），大概率记录过当时的决策理由。
