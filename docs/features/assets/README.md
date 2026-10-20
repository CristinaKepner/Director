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
