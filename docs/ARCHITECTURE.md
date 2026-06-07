# 唤我（HuanWo）技术架构文档

**版本：** v0.1  
**日期：** 2026-06-07  
**状态：** 规划中

---

## 1. 技术选型决策

### 1.1 框架对比

| 维度 | Electron + React | Tauri + React | PyQt6 |
|---|---|---|---|
| 开发维护性 | ★★★★☆ 生态成熟，文档丰富 | ★★★☆☆ Rust 门槛较高 | ★★★☆☆ |
| UI 美观性 | ★★★★★ 完整 Web 能力 | ★★★★★ 完整 Web 能力 | ★★★☆☆ |
| 系统健壮性 | ★★★★☆ 经过大规模生产验证 | ★★★★★ Rust 内存安全 | ★★★☆☆ |
| 全局快捷键 | ★★★★★ globalShortcut API 完善 | ★★★★☆ 支持，配置稍复杂 | ★★★☆☆ |
| 安装包体积 | 调研基准值 ~80–100MB（待 Spike 实测） | 调研基准值 ~5–15MB（待 Spike 实测） | ~30MB |
| PRD 目标值（<80MB） | ⚠️ 接近边缘，需 ASAR 压缩优化 | ✅ 轻松达标 | ✅ 达标 |
| 跨平台能力 | ★★★★★ Win/Mac/Linux | ★★★★★ Win/Mac/Linux | ★★★★☆ |
| 自动更新 | ★★★★★ electron-updater 开箱即用 | ★★★★☆ tauri-updater 支持 | ★★☆☆☆ |
| 图片处理生态 | ★★★★★ sharp、jimp 等成熟库 | ★★★★☆ 可调用 Rust image 库 | ★★★★☆ Pillow |

### 1.2 选型结论：**Electron + React + TypeScript（待 Phase 0 Spike 验证后最终确认）**

**当前倾向理由：**

1. **开发维护性优先**：团队对 Web 技术栈更熟悉，Electron 文档和社区覆盖所有场景
2. **图片处理**：`sharp` 库（基于 libvips）在 Node.js 生态中性能一流，格式支持完整
3. **自动更新**：`electron-updater` 与 GitHub Releases 集成成熟，分发可靠
4. **UI 一致性**：全 Web 渲染，深色/浅色模式通过 CSS 媒体查询和 `nativeTheme` API 无缝切换
5. **包体积取舍**：考虑到目标用户为桌面工具用户，~80MB 的安装包在可接受范围内；后续可通过 ASAR 压缩优化

> **Phase 0 Spike 双轨验证**：在 Phase 0 技术验证阶段，同时验证 Electron + sharp 和 Tauri + 图片处理两种方案的可行性（重点验证打包成功率、图片处理格式覆盖率、安装包体积），根据实际验证结果最终确认技术选型。详见 [PHASE0_SPIKE.md](./PHASE0_SPIKE.md)。

---

## 2. 技术栈清单

| 层次 | 技术选择 | 说明 |
|---|---|---|
| 应用框架 | Electron 28+ | 主进程 + 渲染进程架构 |
| UI 框架 | React 18 + TypeScript | 组件化、类型安全 |
| 构建工具 | Vite + electron-vite | 快速热更新，生产构建 |
| UI 组件库 | 自研（基于设计系统） | 保持视觉独特性，不依赖第三方 UI 库 |
| 状态管理 | Zustand | 轻量，适合工具类应用 |
| 图片处理 | sharp（Node.js Addon，基于 libvips） | 性能最优，支持 JPEG/PNG/WebP/AVIF/GIF 等；⚠️ **SVG 需系统安装 librsvg**，Windows 环境默认缺失，v0.1 暂不启用 SVG 输入 |
| 全局快捷键 | Electron globalShortcut | 原生 API |
| 自动更新 | electron-updater | 配合 GitHub Releases |
| 打包 | electron-builder | 生成 NSIS 安装包（Windows） |
| 配置持久化 | electron-store | 基于 JSON，类型安全 |
| 系统主题检测 | Electron nativeTheme | 监听系统深浅色切换 |

---

## 3. 分层架构

> **注**：Phase 0-1 工具硬编码在 `src/tools/` 目录内，不抽象插件系统。Phase 2 重构为插件架构后再引入 PluginRegistry。

```
┌─────────────────────────────────────────────────────────┐
│                    渲染进程（Renderer）                    │
│  React UI 组件层                                         │
│  ├── LauncherPanel  快捷面板                              │
│  ├── ToolWindow     工具窗口容器                           │
│  └── SettingsPage   设置页                               │
├─────────────────────────────────────────────────────────┤
│                IPC Bridge（主进程 ↔ 渲染进程）              │
│  preload.ts 暴露安全的 ipcRenderer API                   │
├─────────────────────────────────────────────────────────┤
│                    主进程（Main）                          │
│  ├── main.ts            应用入口，窗口/托盘/快捷键初始化    │
│  ├── hotkeyManager.ts   全局快捷键注册与路由                │
│  ├── windowManager.ts   窗口创建 / 隐藏 / 销毁              │
│  ├── configManager.ts   配置读写（electron-store）          │
│  ├── updateManager.ts   自动更新检测与安装                   │
│  ├── trayManager.ts     系统托盘菜单管理                     │
│  └── tools/             工具处理逻辑（Phase 0-1 硬编码）     │
│      ├── image-compress.ts                               │
│      └── image-convert.ts                                │
├─────────────────────────────────────────────────────────┤
│                    系统层（OS）                            │
│  文件系统 · 全局快捷键 · 系统托盘 · nativeTheme · 剪贴板    │
└─────────────────────────────────────────────────────────┘
```

---

## 4. 插件系统规划（Phase 2 引入）

> **Phase 0-1 不抽象插件系统**，工具硬编码在 `src/tools/` 目录。Phase 2 重构时再按以下规范抽象为插件架构。以下内容为 Phase 2 目标设计，Phase 0-1 不实现。

### 4.1 目录结构（Phase 2 目标）

每个插件是 `plugins/` 下的一个独立子目录：

```
plugins/
└── image-compress/
    ├── manifest.json       必须：插件元数据
    ├── index.tsx           必须：插件 UI 入口组件
    ├── handler.ts          必须：处理逻辑（在主进程中执行）
    └── icon.svg            可选：插件图标（也可在 manifest 中内联）
```

### 4.2 manifest.json 规范（Phase 2 目标）

```json
{
  "id": "image-compress",
  "name": "图片压缩",
  "version": "1.0.0",
  "description": "批量压缩图片，支持有损/无损模式",
  "icon": "icon.svg",
  "iconBg": "#e1f5ee",
  "iconColor": "#0F6E56",
  "tags": ["图片", "压缩", "批量"],
  "windowSize": { "width": 560, "height": 480 },
  "windowResizable": false,
  "acceptsFiles": true,
  "fileTypes": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".tiff"],
  "author": "HuanWo Team"
}
```

### 4.3 handler.ts 接口约定（Phase 2 目标）

插件处理器运行在主进程中（Node.js 环境），需导出统一接口：

```typescript
export interface PluginInput {
  files: string[];          // 文件绝对路径数组
  options: Record<string, unknown>;  // 用户在 UI 中设置的参数
  outputDir?: string;       // 输出目录（可选，默认覆盖源文件旁）
}

export interface PluginResult {
  success: boolean;
  processedFiles: Array<{
    input: string;
    output: string;
    originalSize: number;
    outputSize: number;
    error?: string;
  }>;
  summary: string;
}

// 每个 handler.ts 必须导出此函数
export async function execute(input: PluginInput): Promise<PluginResult> {
  // 实现处理逻辑
}
```

### 4.4 插件注册流程（Phase 2 目标）

```
应用启动
  → PluginRegistry.scan()  扫描 plugins/ 目录
  → 读取每个子目录的 manifest.json
  → 验证必填字段
  → 注册到内存 Map<id, PluginMeta>
  → 通过 IPC 告知渲染进程已加载的插件列表
  → 渲染进程更新工具面板
```

---

## 5. 项目目录结构

```
huanwo/
├── electron/                   主进程代码
│   ├── main.ts                 应用入口
│   ├── hotkeyManager.ts        快捷键管理
│   ├── windowManager.ts        窗口管理
│   ├── configManager.ts        配置管理
│   ├── updateManager.ts        自动更新
│   ├── trayManager.ts          托盘管理
│   ├── tools/                  工具处理逻辑（Phase 0-1 硬编码）
│   │   ├── image-compress.ts
│   │   └── image-convert.ts
│   └── __tests__/              主进程单元测试（Phase 1 引入）
│       ├── image-compress.test.ts
│       └── image-convert.test.ts
├── src/                        渲染进程代码（React）
│   ├── launcher/               快捷面板
│   │   ├── LauncherPanel.tsx
│   │   ├── SearchBar.tsx
│   │   ├── ToolGrid.tsx
│   │   └── ToolCard.tsx
│   ├── tool-window/            工具窗口容器
│   │   └── ToolWindowShell.tsx
│   ├── settings/               设置页
│   │   └── SettingsPage.tsx
│   ├── shared/                 共享组件 / hooks / utils
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── theme/              深色/浅色主题 token
│   │   └── clipboard.ts        剪贴板读写工具
│   └── main.tsx                渲染进程入口
├── plugins/                    插件目录（Phase 2 引入，Phase 0-1 不存在）
├── docs/                       文档
├── assets/                     图标 / 安装包素材
├── electron.vite.config.ts     构建配置
├── package.json
└── tsconfig.json
```

---

## 6. 深色/浅色模式方案

**检测机制**：使用 Electron `nativeTheme.shouldUseDarkColors` 检测系统主题，并监听 `nativeTheme.on('updated')` 事件实时更新。

**实现方式**：

1. 主进程检测到主题变化 → 通过 IPC 通知渲染进程
2. 渲染进程在 `<html>` 元素上切换 `data-theme="light"` / `data-theme="dark"`
3. CSS 通过 `[data-theme="dark"]` 选择器切换 CSS 变量值

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f4;
  --text-primary: #1a1a1a;
  --border: rgba(0,0,0,0.08);
}
[data-theme="dark"] {
  --bg-primary: #1e1e1e;
  --bg-secondary: #2a2a2a;
  --text-primary: #e8e8e6;
  --border: rgba(255,255,255,0.10);
}
```

---

## 7. 自动更新方案

### 7.1 更新流程

```
应用启动（后台 5s 后）
  → updateManager.checkForUpdates()
  → 请求更新服务器 API
  → 对比版本号
  → 有新版本 → 在系统托盘显示更新气泡提示
  → 用户确认 → 后台下载安装包
  → 下载完成 → 提示"重启以应用更新"
  → 用户重启 → 安装新版本
```

### 7.2 分发渠道

**主渠道**：GitHub Releases（NSIS 安装包 + 免安装便携版）

**国内备用渠道**（解决 GitHub 下载不稳定问题）：

| 方案 | 说明 | 优先级 |
|---|---|---|
| Gitee Releases 镜像 | 每次发版同步推送到 Gitee Release | 首选 |
| 自建更新服务器 | 国内 CDN 加速，存储 `latest.yml` + 安装包 | 备选 |
| 腾讯云 COS + CDN | 低成本，国内访问稳定 | 备选 |

更新服务器地址通过 `package.json` 的 `publish` 字段配置，`electron-updater` 支持配置多个 mirrors。

### 7.3 更新文件

`latest.yml`（由 electron-builder 自动生成），包含版本号、文件 Hash、发布日期。

### 7.4 代码签名（Windows）

**问题**：未签名的 `.exe` 安装包在 Windows 10/11 会触发 SmartScreen 拦截，弹出红色"Windows 已保护您的电脑"警告，严重影响用户信任。

**解决方案**：

| 方案 | 费用 | 说明 |
|---|---|---|
| OV 代码签名证书 | ~¥800/年 | 标准方案，需 CA 审核企业/个人身份 |
| EV 代码签名证书 | ~¥3000/年 | 自动建立 SmartScreen 信誉，首次发布即无警告 |
| 暂不签名 | ¥0 | 用户需手动点击"仍要运行"，体验差，不推荐 |

**决策**：v1.0 正式发布前必须购买 **EV 代码签名证书**，确保首次安装无 SmartScreen 警告。Phase 0-2 开发阶段可使用自签名证书做本地测试。

---

## 8. 本地日志方案

> **Phase 0 开始必须实现**（在框架搭建阶段即初始化），Phase 1 之后所有工具处理日志均依赖此方案。详见 [LOGGING.md](./LOGGING.md)。

**方案**：使用 `electron-log` 库（轻量，专为 Electron 设计）

**日志级别**：`error` / `warn` / `info` / `debug`（生产环境默认 `info`）

**日志位置**：
- Windows：`%APPDATA%/huanwo/logs/`
- 文件轮转：单文件最大 5MB，保留最近 5 个文件

**日志内容**：
- 应用启动/关闭时间
- 插件执行记录（输入文件路径脱敏，只记录文件名和大小）
- 错误信息（含 stack trace）
- 更新检测记录

**用户侧**：设置页提供"导出日志"按钮，生成 `.zip` 供用户发送给开发者排查问题。

---

## 9. 安全边界

- **Context Isolation**：开启 `contextIsolation: true`，渲染进程不直接访问 Node.js API
- **Preload 白名单**：仅通过 `preload.ts` 暴露最小必要的 IPC 接口
- **文件访问**：主进程仅访问用户明确选择的文件路径
- **无网络请求**：插件处理逻辑禁止发起网络请求（在代码审查层面约束）
- **CSP**：渲染进程设置内容安全策略，防止 XSS
