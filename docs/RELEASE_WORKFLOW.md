# 唤我（HuanWo）构建/发布流程文档

**版本：** v0.1  
**日期：** 2026-06-07  
**状态：** 规划中

---

## 1. 概述

本文档描述从代码提交到用户收到更新的完整流程，包括构建、签名、发布、更新包生成。

---

## 2. 构建流程

### 2.1 开发环境构建（本地验证）

```bash
# 开发模式（热更新）
npm run dev

# 本地构建验证（不打包，只编译）
npm run build

# 本地打包测试（生成安装包，不签名）
npm run build:win
```

### 2.2 CI 环境构建（正式发版）

**推荐 CI 平台**：GitHub Actions（免费，与 GitHub Releases 集成好）

**流程**：

```
触发条件（满足其一即触发）：
  A. 推送 v* tag（git tag v0.1.0 && git push origin v0.1.0）← 主要方式，对应 4.3 节发布步骤
  B. 推送 release/v* 分支（ci 临时验证用，不自动创建 Release）
  → GitHub Actions 触发
  → 安装依赖（npm ci）
  → 运行单元测试（npm test）
  → 构建前端（npm run build）
  → 打包 Electron（npm run build:win）
  → 代码签名（EV 证书）
  → 生成 latest.yml + 安装包
  → 上传到 GitHub Releases（Draft 状态）
  → 通知开发者审核
  → 开发者发布（设为 Latest Release）
```

> **触发方式说明**：`v*` tag 触发与 4.3 节"推送 tag → 触发 CI"步骤直接对应，是正式发版的标准方式。`release/v*` 分支仅用于发版前的 CI 验证，不会自动生成 Draft Release。

---

## 3. 代码签名

### 3.1 证书类型选择

| 类型 | 费用 | SmartScreen 信誉 | 推荐场景 |
|---|---|---|---|
| OV 代码签名 | ~¥800/年 | 需积累（用户下载多次后消失） | 预算有限，v1.0 临时方案 |
| EV 代码签名 | ~¥3000/年 | 立即建立（首次发布即无警告） | **v1.0 正式版必须使用** |

### 3.2 签名配置（electron-builder）

在 `package.json` 的 `build` 字段中配置：

```json
{
  "build": {
    "win": {
      "certificateFile": "cert/ev-cert.p12",
      "certificatePassword": "${CERT_PASSWORD}",
      "signAndEditExecutable": true,
      "signingHashAlgorithms": ["sha256"]
    }
  }
}
```

> **注意**：证书密码通过 CI 环境变量传入，不应硬编码在代码中。

### 3.3 未签名应用的用户引导（开发/内测阶段）

在内测阶段（未购买 EV 证书前），需在下载页或 README 中添加说明：

> 首次安装时 Windows 可能提示"Windows 已保护您的电脑"。  
> 点击"更多信息" → "仍要运行"即可继续安装。  
> 正式版发布后将消除此提示。

---

## 4. 发布流程

### 4.1 版本号规范

采用语义化版本 `MAJOR.MINOR.PATCH`：

- `MAJOR`：不兼容的变更（v1.0 → v2.0）
- `MINOR`：新增功能（v0.1 → v0.2）
- `PATCH`：bug 修复（v0.1.0 → v0.1.1）

**示例**：`v0.1.0`（Phase 1 发布）、`v0.1.1`（Phase 1 的 bug 修复）

### 4.2 Release Notes 模板

每次发版需编写 Release Notes，放在 GitHub Release 的 Description 中：

```markdown
## v0.1.0 (2026-XX-XX)

### 新增
- 快捷面板（Alt+Space 呼出）
- 图片压缩工具
- 图片转格式工具
- 剪贴板集成（直接处理剪贴板图片）

### 修复
- 无

### 已知问题
- Windows 未签名，首次安装会提示 SmartScreen 警告（v1.0 将解决）
```

### 4.3 发布步骤

1. 更新 `package.json` 中的 `version` 字段
2. 更新各文档中的版本号（如 PRD、ROADMAP）
3. 编写 Release Notes（放入 `release-notes/v0.1.0.md`）
4. 推送 tag：`git tag v0.1.0 && git push origin v0.1.0`
5. GitHub Actions 自动构建并上传到 GitHub Releases（Draft 状态）
6. 开发者审核构建产物（安装包能正常安装运行）
7. 将 Release 设为 `Latest Release`，正式发布
8. 通知内测用户（若有内测群/邮件列表）

---

## 5. 更新包分发

### 5.1 文件清单

每次发版，GitHub Releases 应包含：

| 文件 | 说明 |
|---|---|
| `HuanWo-Setup-v0.1.0.exe` | NSIS 安装包（含 auto-updater 支持） |
| `HuanWo-Portable-v0.1.0.exe` | 免安装便携版（可选） |
| `latest.yml` | electron-updater 更新描述文件（自动生成） |
| `HuanWo-Setup-v0.1.0.exe.blockmap` | 增量更新块映射（自动生成，加速更新） |

### 5.2 国内镜像同步

为解 GitHub 下载慢的问题，每次发版后手动（或 CI 自动）同步到 Gitee Releases：

1. 下载 GitHub Releases 中的安装包和 `latest.yml`
2. 上传到 Gitee 对应 Release
3. 更新 `electron-updater` 的 `updateServerConfig`，配置 GitHub 为主、Gitee 为 mirror

**electron-updater 配置示例**：

```json
{
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "yourname",
        "repo": "huanwo",
        "token": "${GH_TOKEN}"
      },
      {
        "provider": "generic",
        "url": "https://gitee.com/yourname/huanwo/releases/download",
        "channel": "mirror"
      }
    ]
  }
}
```

---

## 6. 回滚方案

若发版后发现严重 bug（如数据丢失、应用无法启动）：

1. 在 GitHub Releases 中将当前版本设为 `Pre-release`（或删除）
2. 将前一个稳定版本设为 `Latest Release`
3. `electron-updater` 会自动将用户更新到 Latest Release 版本
4. 在官网/下载页置顶公告，引导用户手动下载回滚版本

---

## 7. 检查清单（发版前）

- [ ] 版本号已更新（`package.json`）
- [ ] Release Notes 已编写并审核
- [ ] 构建产物在干净虚拟机中验证通过
- [ ] 自动更新流程验证（安装旧版 → 检测到新版 → 更新成功）
- [ ] `latest.yml` 中的版本号与安装包版本一致
- [ ] 国内镜像已同步（或 CI 已自动同步）
- [ ] 下载页/官网链接已更新
