# 分发与更新：把客户端装到别人电脑上，之后怎么推新版本

面向的问题：`导演台.app` 发给同事之后，我改了东西，**他们怎么知道有更新、怎么装上**。

## 结论先讲

客户端里已经内置了更新检查：**启动后 8 秒查一次，之后每 6 小时查一次**，发现新版本就弹窗告诉用户，用户点「下载并安装」→ 后台下载 → **校验 sha256** → 提示把新版本拖进「应用程序」。菜单「导演台 → 检查更新…」可以手动查，「偏好设置 → 更新」可以关掉自动检查或换更新源。

你这边发一版的动作是三步：**改版本号 → 构建 → 把 dmg 和 manifest 传到同一个地址**。已经装好的客户端自己会发现。

## 为什么不是「自己替换自己」的静默更新

macOS 的静默自更新（Squirrel.Mac，也就是 electron-updater 走的那条路）**要求 app 有 Apple Developer ID 签名**：更新时系统会校验新包的签名和当前 app 一致，未签名的包直接失败。当前 `desktop/package.json` 里是 `identity: null`，也就是未签名。

所以现在这套是「检查 + 下载 + 校验 + 用户确认安装」。对用户来说多一步拖拽，但**签名与否都能用**，而且下载完整性是自己校验的（sha256），不依赖签名。

要升级成真正的静默自更新，需要：

1. Apple Developer 账号（$99/年），生成 **Developer ID Application** 证书；
2. `desktop/package.json` 里把 `mac.identity` 换成证书名，打开 `hardenedRuntime`，配 `entitlements`；
3. 公证（notarize）：`electron-builder` 的 `afterSign` 钩子跑 `notarytool`，否则别人下载后 Gatekeeper 会拦「无法验证开发者」；
4. 装 `electron-updater`，把 `update.mjs` 的下载分支换成 `autoUpdater.checkForUpdatesAndNotify()`。

**顺带说**：即使不做静默更新，只要你打算发给公司以外的人，**签名 + 公证也是必须的**——否则对方第一次打开会被 Gatekeeper 拦住，得右键「打开」或去系统设置里放行。内部小范围分发可以先不签。

## 发一版

```bash
# 1. 改版本号（客户端就是拿这个和 manifest 比）
#    desktop/package.json → "version": "0.6.0"

# 2. 构建（产物在 desktop/dist：arm64 与 x64 的 dmg / zip）
cd desktop && npm run dist

# 3. 生成 manifest（自动算 sha256 与体积）
npm run manifest -- --base https://your-host/releases/0.6.0 --notes "成片流水线；偏好设置里能填密钥"

# 4. 把 dist 里的 dmg 和 latest-mac.json 一起传到 https://your-host/releases/0.6.0/
#    ⚠️ 客户端读的是固定地址，所以再把 latest-mac.json 复制一份到那个固定地址上（见下）
```

### 更新源地址怎么放

客户端读一个**固定不变**的 JSON 地址（`DEFAULT_FEED`，在 `desktop/update.mjs` 顶部）。每次发版只更新这个 JSON 的内容，安装包本身可以放在带版本号的目录里。

三种常见放法：

| 放在哪 | 固定地址长什么样 | 说明 |
|---|---|---|
| GitHub Releases + 仓库里的 json | `https://raw.githubusercontent.com/<org>/<repo>/main/latest-mac.json` | 最省事；dmg 传到 Release 附件，json 提交到仓库 |
| 对象存储（OSS / S3 / R2） | `https://cdn.your.com/director/latest-mac.json` | 注意给这个 json 设短缓存（客户端已经带了防缓存参数，但 CDN 侧也设一下更稳） |
| 自建静态服务器 | `https://your-host/director/latest-mac.json` | 内网分发常用 |

改 `DEFAULT_FEED` 之前发出去的老版本，读的还是老地址——所以**第一版就把地址定下来**，之后只换内容。用户也可以在「偏好设置 → 更新」里自己填一个（内网另一套源之类）。

### manifest 长什么样

```json
{
  "version": "0.6.0",
  "pubDate": "2026-09-20T10:00:00Z",
  "notes": "成片流水线；偏好设置里能填密钥",
  "minVersion": "0.4.0",
  "mac": {
    "arm64": { "url": "https://…/导演台-0.6.0-arm64.dmg", "sha256": "…", "size": 128974848 },
    "x64":   { "url": "https://…/导演台-0.6.0-x64.dmg",   "sha256": "…", "size": 133169152 }
  }
}
```

- `notes` 直接显示在更新弹窗里，写人话。
- `minVersion` 可选：低于它的版本会被标成**必须更新**——弹窗只有「下载并安装 / 退出」，也不允许「跳过这个版本」。后端接口有破坏性变更时用它。
- `sha256` 由 `npm run manifest` 算好；客户端下载完不匹配就删掉并报错，不会让用户装一个被替换过的包。

## 客户端这边的行为

| 情况 | 行为 |
|---|---|
| 已是最新 | 手动检查时提示「已经是最新版本」；自动检查时不打扰 |
| 有新版本 | 弹窗：版本号 + notes + 体积 → 「下载并安装 / 稍后 / 跳过这个版本」 |
| 跳过这个版本 | 记进 prefs，自动检查不再提示这个版本；有更新的版本出来照常提示 |
| 强制更新（`minVersion`） | 不给「跳过」，选「退出」就关掉 app |
| 下载中 | Dock 进度条 + 窗口标题显示百分比 |
| sha256 不匹配 | 删除下载文件，弹错误，不进入安装 |
| 下载完成 | 通知 + 弹窗「打开安装包 / 在访达中显示 / 稍后」 |
| 关掉自动检查 | 完全不联网查更新（偏好设置里的开关） |

**用户数据不会丢**：工程、媒体、密钥、窗口位置都在 `~/Library/Application Support/导演台/`，覆盖 app 不碰这个目录。

## 版本号与后端的关系

客户端里装的是同一份 `core/` 和 `server/`（`extraResources` 打进 `Contents/Resources/app-src`），所以**换 app 就等于换后端**，不存在前后端版本不一致的问题。唯一要注意的是工程文件格式：`project.json` 向后兼容由 `loadProjectData` 负责，破坏性改动就发一版带 `minVersion` 的更新。

## 一次完整的发版清单

```bash
npm test && npm run test:api            # 1. 绿
# 2. desktop/package.json 版本号 +1
cd desktop && npm run dist              # 3. 构建 arm64 + x64
npm run manifest -- --base https://your-host/releases/0.6.0 --notes "…"
# 4. 上传 dmg → https://your-host/releases/0.6.0/
# 5. 上传 latest-mac.json → 固定地址（覆盖）
# 6. 自己先装一遍：确认能打开、能起后端、工程还在
```
