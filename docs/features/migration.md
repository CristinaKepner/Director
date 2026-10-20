# 功能目录迁移与验证

[功能索引](README.md)

## 本次调整

在当前 Director 0.9.19 上把 69 个领域、服务和浏览器模块实际移动到 13 个同名功能分组，并整理 16 个功能文档文件夹。桌面宿主、Skills 和共享平台也有完整说明，沿用各自已独立的源码目录。

完整旧路径 → 新路径见 [catalog.json](catalog.json) 的 moves。没有复制两份实现，也没有在旧私有路径留转发壳。项目内部引用、测试引用、生成脚本、lint 范围和已有文档链接随迁移更新。

## 保持的契约

- `npm run dev`、`npm start`、`npm run cli` 和桌面 `npm start` 的入口不变。
- 公开聚合入口 `core/index.js`、Action 名称/参数、HTTP/SSE 协议、工程字段保持不变。
- `core/store.js`、`core/schema.js`、`core/actions.js` 仍负责唯一状态、共享校验和注册；server host/api、web main/client/ui 继续组合功能，不将它们复制到每个目录。
- `creation-ui` 的构建目标仍是 `web/vendor/creation`。模型的相对 vendor 路径已跟随 viewport 迁移调整。
- 静态构建递归复制 core/web，Electron 递归打包 core/web/server；新功能子目录仍在这些资源根下。
- 没有修改模型费用确认、生成预算、素材批准、分支判定、历史对话只读或用户工程数据。
- 本次以迁移为主，历史大函数不借机重写；新验证代码仍按项目行数约束检查。

## 原文与新文档的关系

各功能 README 描述当前能力、操作流程、数据和限制；implementation.md 列出真实源码/测试和 capabilities 中的操作。原有综合文档保留详细设计与历史案例，功能页明确标注旧 UI 与当前能力的差别。不要把旧验收报告或路线图当作当前质量结论。

## 验证方式

```bash
npm run test:features           # 文件归属、文档链接、Action 覆盖和资源根
npm test                       # 核心回归与递归浏览器导入检查
npm run test:all                # 完整核心/后端/媒体回归
npm run check:workflow          # 功能目录 lint、节点严格类型和构建
npm run build:web               # 静态资源组装
```

独立 Electron 和打包资源启动检查与单测分别记录。真实付费生成不用于目录迁移验证。

## 本轮结果

2026-10-20，本轮核对结果：

- 迁移前完整回归：239 项中 238 通过，背景混音用例阻塞；结束该测试 FFmpeg 子进程后记录为失败。
- 迁移后完整回归：244 项中 243 通过，同一个背景混音用例阻塞后记录为失败，没有新增失败。没有将全套媒体回归记为通过。
- 新增 5 项目录/文档/Action/打包资源检查通过；171 个 Action 的完整 capabilities 与迁移前深比较一致。
- 原有核心 172 项通过，浏览器具名导入检查已递归覆盖功能子目录。
- `npm run check:workflow` 的 lint、严格 TypeScript 和节点视图构建通过；新增目录测试格式化与行数检查通过。
- `npm run build:web` 通过，CLI 原入口能够读取隔离测试工程。
- 独立 Electron：引导、节点类别、8 节点模板、true/false 端口与标签、无模型错误反馈、Agent 标记通过。
- macOS arm64 应用目录构建通过；从打包资源启动隔离后端，重复上述 Electron 检查通过。没有覆盖已安装应用，没有发布新 DMG，没有调用真实付费生成。

已知阻塞位置：`server/tests/film-edit.test.mjs` 中背景音乐混入静音片段的用例；迁移没有改动混音实现。
