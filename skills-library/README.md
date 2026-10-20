# 技能库 · 项目技能、代码视频与提示词

原有 135 个技能完整收录到 [`installed/`](installed/)，由 [`catalog.json`](catalog.json) 统一索引；原 `.agents/skills/` 保留为兼容发现副本。四个上游参考项目分别存放，收录时间：2026-10-20。每个目录包含中文入口、`source/` 原文与源码快照、`SOURCE.json` 来源提交和文件校验信息。

| 项目 | 适用场景 | 本地入口 | 上游 |
| --- | --- | --- | --- |
| lemo-opuscar | 选择影片风格，依据故事完成导演方案与代码样片 | [使用说明](lemo-opuscar/README.md) | [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) |
| awesome-opus5-5-videos | 查看成片、创作者提示词及 HTML/Canvas/SVG/Three.js 路线 | [使用说明](awesome-opus5-5-videos/README.md) | [yihui-dev/awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos) |
| PDoomVideo | 研究完整 MV 的分镜、章节动画、角色和渲染结构 | [使用说明](PDoomVideo/README.md) | [JohnHeibel/PDoomVideo](https://github.com/JohnHeibel/PDoomVideo) |
| opus-video-prompts | 从中文说明和可复制提示词开始试验 | [使用说明](opus-video-prompts/README.md) | [joeseesun/opus-video-prompts](https://github.com/joeseesun/opus-video-prompts) |

## 使用方式

按目标进入对应目录，再读取其中的提示词或实现文件。可让 Agent「参考 skills-library 中某个项目，为当前故事提出方案」，然后经 Director 的现有操作层应用到工程。

现有可发现的 Lemo 技能仍在 [`.agents/skills/lemo-opuscar`](../.agents/skills/lemo-opuscar/SKILL.md)。四个上游项目保留为可由 Harness 读取的案例、提示词和源码参考库；它们本身不提供模型 API。应用内 Agent 通过 `skills.list/files/read/invoke` 调用技能 Harness，新构建的桌面包包含本库。具体规则见 [功能文档](../docs/features/skills/README.md)。

## 快照范围

收录 UTF-8 文档、提示词、数据、脚本、示例源码及上游提供的许可证，保持原文。图片、字体、音频、模型二进制、GitHub 自动化及其他未收录项列在各自 `SOURCE.json` 的 `excluded` 中；样片和外部素材沿用上游链接。因此 `source/` 用于阅读研究，不保证可直接渲染原作。要复现影片，按对应上游固定提交另取完整工程和资源。

上游 `AGENTS.md`、`CLAUDE.md` 和脚本是该参考项目的材料，只有明确开展对应项目制作时才适用，不替代 Director 的工程规则。收录本身不执行下载器、安装脚本或模型调用。

## 来源与更新

`SOURCE.json` 记录完整提交 SHA、来源网址、收录文件 SHA-256 和排除清单。`.gitattributes` 保留上游源码的原始换行，确保跨平台检出后校验一致。原有技能在 `installed/` 中维护，运行 `npm run skills:sync` 更新发现副本及清单。四个参考库更新时使用新提交重新取快照，同时更新清单；不要在 `source/` 中混入项目自己的修改。保留原作者和许可证；未提供许可证的项目在本地说明中明确标记。
