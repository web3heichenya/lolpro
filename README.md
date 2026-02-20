<p align="center">
  <img src="build/icon.png" width="128" height="128" alt="LOLPro Logo">
</p>

# LOLPro

基于 Electron + React 的英雄联盟辅助工具，当前支持：

- 海克斯乱斗（`aram-mayhem`）
- 斗魂竞技场（`arena`）

支持客户端状态检测、英雄详情页、游戏中页面、置顶浮窗。

## 数据源设计

### 共用数据（跨模式）

- 英雄列表：Blitz / DDragon（按语言缓存）
- 英雄基础信息（名称、称号、简介、技能等）：OP.GG / Blitz champion meta

### 模式数据（按模式独立）

- 斗魂竞技场（Arena）玩法数据：
  - `https://lol-api-champion.op.gg/api/{region}/champions/arena/{championId}?tier={arenaTier}`
- 海克斯乱斗（ARAM Mayhem）玩法数据：
  - OP.GG 页面抓取（Next Flight 解析）
  - `/lol/modes/aram-mayhem/{champion}/augments`
  - `/lol/modes/aram-mayhem/{champion}/items`
  - `/lol/modes/aram-mayhem/{champion}/skills`

## 本地缓存（SQLite）

- `build_cache`：模式玩法构筑缓存（按 `mode/champion/lang/source_key`）
- `champion_profiles`：英雄基础信息缓存（模式无关）
- `mode_tier_lists`：模式榜单/分层缓存
- `app_meta`：少量全局 KV（如 Riot 版本号）

## 快捷键

- 显示/隐藏浮窗：`Ctrl/Cmd + Shift + T`
- 切换浮窗交互模式：`Ctrl/Cmd + Shift + I`
- 切换海克斯品质（浮窗）：`Ctrl/Cmd + Shift + J`

## 开发

```bash
pnpm install
pnpm run doctor
pnpm run dev
```

## 本地运行与打包

### macOS

```bash
pnpm run dev
pnpm run dist
```

### Windows（PowerShell）

```powershell
pnpm install
pnpm run native:electron
pnpm run dev
pnpm run dist
```

打包产物默认输出到 `release/`。

## LCU 连接说明

项目通过读取 LoL 客户端 `lockfile` 获取端口与 token，再调用本机 `127.0.0.1` 的 LCU API。

若一直显示未连接：

- 确认 LoL 客户端已启动
- 可通过环境变量 `LOL_LOCKFILE_PATH` 显式指定 lockfile 路径

### 签名与公证

当前流程默认关闭自动签名发现（`CSC_IDENTITY_AUTO_DISCOVERY=false`），可稳定产出未签名安装包。

若需要正式分发，建议在 GitHub Secrets 配置签名参数：

- macOS：`APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `CSC_LINK` / `CSC_KEY_PASSWORD`
- Windows：代码签名证书相关 secrets

## 免责声明

本项目基于 Riot 官方提供的 LCU API 开发，未采用任何侵入式技术，理论上不会直接干预或修改游戏核心数据。但请注意，使用任何第三方辅助工具均可能受游戏版本更新或反作弊系统的影响，存在不可预见的风险。

**使用者需全面了解并自行评估使用风险（包括但不限于账号封禁、数据异常等），并自行承担所有后果。** 开发者不对使用本软件造成的直接或间接损失负责。

本项目未经 Riot Games 官方授权或背书，全部游戏资源及版权归 Riot Games 保留。在此声明旨在保障透明度，感谢您的理解，并请在游戏中保持公平竞技。
