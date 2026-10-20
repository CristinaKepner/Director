# Director 功能文档

按当前 0.9.19 已有能力拆分，源码与文档使用相同功能标识。每个文件夹含功能说明和实际实现清单；原始综合文档保留作设计背景，旧 UI 描述不代表当前入口。

| 功能 | 内容 |
| --- | --- |
| [工程管理与保存](projects/README.md) | 创建、命名、加载、导出工程，设置画幅/帧率，撤销与重做。 |
| [空工程引导与创作主页面](creation/README.md) | 一句话/参照起步，创作目标、素材和镜头计划在主页面组合。 |
| [节点编排与运行](workflow/README.md) | 资产 Text/Table/Image/Video/Audio，三视图/光照/运镜参考，图像生成/编辑、视频、If/Loop、HTML 预览。 |
| [Agent 规划与任务协作](agent/README.md) | 自然语言计划、协作确认、逐步执行和任务进度；规则规划与配置后的 LLM 共存。 |
| [当前对话与历史版本](conversation/README.md) | 当前消息分组、历史检查点/整合档案、对话导出、版本选择和只读气泡。 |
| [素材、身份参考与公网媒体](assets/README.md) | 素材登记/批准、实体关联、网页媒体获取、公网媒体发布与隧道。 |
| [复刻参照](reference-replication/README.md) | 抽样帧分析、主体/机位/光照/运镜描述，参考结果编译为可编辑场景计划。 |
| [角色库](character-library/README.md) | 角色卡、定妆生成、批准参考、身份用途与出场镜头。 |
| [模板推荐](template-recommendations/README.md) | 自动推荐理由、镜头/工程固定模板、撤销与提示词结构。 |
| [3D 舞台、实体、相机与灯光](stage/README.md) | Three.js 舞台，自由/Program/对照视图，实体变换、姿态、走位、机位和灯光控制。 |
| [分镜、运镜、故事版与 Take](shots/README.md) | 镜头创建/修改/复制/排序/拆分，帧区间与运动关键帧，白模 Take 和故事版。 |
| [提示词、图像与视频生成](generation/README.md) | 提示词编译，Ark/MossHub 适配器、模型目录、任务提交/查询/重试与版本候选。 |
| [创作分支与音画预演](journey/README.md) | 检查点、分支选择/恢复、分镜草图、临时配音与配乐预演。 |
| [时间线、字幕、声音与成片导出](editing/README.md) | 镜头裁切/速度/排序，字幕、原声静音/音量，独立旁白/音乐/音效片段，FFmpeg 导出。 |
| [检查、证据与有预算修复](quality/README.md) | 镜头约束检查、抽样视觉判定、验收运行、问题定位、修复候选、复查与采用。 |
| [桌面宿主、设置与更新](desktop/README.md) | Electron 启动后端、原生菜单/文件对话框、偏好设置、客户端更新和 DMG 分发。 |
| [创作 Skills 与题材模板](skills/README.md) | 项目开发 skill、133 个 Flova 创作技能、Lemo-Opuscar 和提示词模板。 |
| [运行时、HTTP/CLI 与共享装配](platform/README.md) | 统一 Action、共享 store/schema、HTTP/SSE、CLI、前端同步和应用装配。 |

## 代码组织

- `core/features/<功能>/`：共享领域逻辑与功能操作。
- `server/src/features/<功能>/`：Node 服务与供应商适配。
- `web/js/features/<功能>/`：浏览器界面与交互。
- `creation-ui/src/`：节点视图的现有独立构建单元，仍由 workflow 功能拥有。
- `desktop/` 与 `.agents/skills/`：已独立的宿主和技能目录。
- `core/index.js`、统一 store/schema/Action、server host/api、web main/client/ui 保留原路径作为共享装配。

不要把各层重复的功能名称理解成多个产品：浏览器和 Node 有不同依赖边界，工程状态仍是同一份。

## 迁移与维护

[迁移说明及验证](migration.md) · [机器可读清单](catalog.json)

新增功能先更新清单，再补功能规则、源码和测试链接。不要把规划内容写成已上线功能；不要复制个人工程、密钥或用户对话作为示例。

操作归属以 `catalog.json` 的 `actionNames` 精确匹配优先，其次 `actionPrefixes`；例如 `generation.reference` 属于角色库，其他生成操作属于生成功能。
