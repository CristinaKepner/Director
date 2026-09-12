# 内置字体

页面不连外部 CDN，所以字体随仓库分发。两款都是 SIL Open Font License 1.1，允许再分发。

| 文件 | 字体 | 用途 | 许可 |
|---|---|---|---|
| `inter-latin.woff2` / `inter-latin-ext.woff2` | [Inter](https://github.com/rsms/inter) | 正文与界面 | SIL OFL 1.1 |
| `outfit-latin.woff2` / `outfit-latin-ext.woff2` | [Outfit](https://github.com/Outfitio/Outfit-Fonts) | 标题（`--display`） | SIL OFL 1.1 |

子集只含 latin / latin-ext；中文走系统字体（PingFang SC 等），见 `web/css/app.css` 的 font stack。
