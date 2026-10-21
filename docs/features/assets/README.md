# 素材、身份参考与公网媒体

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

## 已有能力

素材登记/批准、实体关联、网页媒体获取、公网媒体发布与隧道。

## 用户流程

上传或获取媒体 → 登记素材与实体关系 → 用户批准 → 镜头/节点引用 → 必要时发布媒体供供应商读取。

## 业务规则

批准状态与素材记录一同保留，不能把待批准当已批准。文件访问限定媒体目录；隧道仅提供媒体读取，不公开控制 API。

## 数据归属

assets、entity 参考、/media 文件；服务持有媒体目录和隧道生命周期。

## 依赖与边界

公网可达性受网络/代理影响；本地有 URL 不代表供应商可读取。模板不等于已经安装供应商服务。

## 验证

- [server/tests/fetch.test.mjs](../../../server/tests/fetch.test.mjs)
- [server/tests/tunnel.test.mjs](../../../server/tests/tunnel.test.mjs)
- [tests/runtime.test.mjs](../../../tests/runtime.test.mjs)

以上是关联测试入口，不代表本轮均已通过；本轮实际结果见 [迁移与验证记录](../migration.md)。

## 相关原文

- [docs/backend-api.md](../../backend-api.md)
- [docs/revision.md](../../revision.md)

## 0.9.20 修复与验证边界

[v2v 媒体准备、隧道依赖与发布说明](../../releases/0.9.20.md)。

## 参考图片 / 视频上传（0.9.21）

主页面「素材与参照」支持拖拽和多选，按文件顺序上传，展示进度、取消、重试、图片与视频预览。单张图片上限 20 MiB（PNG/JPEG/WebP），单段视频上限 200 MiB（MP4/MOV/WebM）。引导弹窗和节点导入中的图片/视频复用同一接口；音频和 Take 的原上传协议保持兼容。

`POST /api/reference-media?projectId=...&name=...&requestId=...` 接收文件原始字节，Content-Type 为实际媒体类型；沿用 API 的 Bearer token 认证。返回 `{ok, asset}`，asset 含 `id,url,posterUrl,width,height,seconds,bytes,mime,mediaKind,approved:false`。客户端为每个文件生成 requestId，手动重试沿用该标识；同工程已完成的请求返回原资产，不重复登记。素材及缩略图写入媒体目录，工程仅存引用。

服务先检查工程、格式和大小，流式写入临时目录，检查文件签名并由 FFmpeg 解码首帧，再检查工程与取消状态，最后调用 `asset.import` 原子登记资产。失败或中断清理临时文件及未登记的媒体。取消发生在登记完成后时，已经导入的资产保留；界面会说明这一点。切换工程会取消当前界面队列，后端独立阻止旧工程的上传落入新工程。撤销登记不删除媒体文件，确保重做和已有引用不失效。

导入不批准身份参考、不触发 Agent 或生成。加入节点复用 assetId；「用于复刻」只把素材填入复刻面板，用户再次点击后才分析。视频原文件完整保留；v2v 在真正提交前另做规格规范化与公网读取检查。

**本地上传不等于公网托管。** 本版本仍依赖启用的公网隧道或已配置的媒体发布服务，Ark key 本身不能把本机素材变为公网 URL。没有产品自有上传服务地址与部署环境时，不能承诺只填 key 就能跨网络稳定分发。素材上传界面明确提示该区别，不将本地导入显示为「模型可读取」。

参考 OpenFilm `53156ac5818d8bad3f2c356043b376b3eebd95ba` 的 [MediaPool](https://github.com/openfilm/openfilm/blob/53156ac5818d8bad3f2c356043b376b3eebd95ba/packages/openfilm/studio/ui/src/components/MediaPool.tsx) 与 [files](https://github.com/openfilm/openfilm/blob/53156ac5818d8bad3f2c356043b376b3eebd95ba/packages/openfilm/studio/server/files.mjs)：借鉴主工作区媒体池、逐文件进度和临时文件提交方式，使用 Director 的原生模块与共享 Action 独立实现，没有复制其 React 应用壳。

验证入口：[参考上传测试](../../../server/tests/reference-upload.test.mjs)，`npm run check:uploads`。
