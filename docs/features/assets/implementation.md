# 素材、身份参考与公网媒体：实现清单

[功能说明](README.md)

## 源码入口

- [server/src/features/assets/fetch.mjs](../../../server/src/features/assets/fetch.mjs)
- [server/src/features/assets/publish.mjs](../../../server/src/features/assets/publish.mjs)
- [server/src/features/assets/tunnel.mjs](../../../server/src/features/assets/tunnel.mjs)
- [server/src/api.mjs](../../../server/src/api.mjs)

跨运行环境按同名功能目录关联；共享 Action 注册、全局 UI 和宿主装配未复制进功能目录。

## 实际注册操作

| 操作 | 用途 | 必填参数 | 可撤销标记 |
| --- | --- | --- | --- |
| `asset.add` | 登记一个资产（参考图 / 生成结果 / 上传）并绑定到实体：entityId + url；approved=true 后参与该实体出现的所有生成 | — | 是 |
| `asset.approve` | 批准 / 取消批准一个资产作为实体的参考（同一实体可有多张已批准参考，按顺序传给供应商，最多 4 张） | id | 是 |
| `asset.delete` | 删除资产 | id | 是 |

操作清单来自迁移时的 `core/index.js` capabilities；执行仍须经过状态机、预算、配置与权限校验。这里只展示注册声明，不替代服务端前置条件。
