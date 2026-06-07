# 唤我（HuanWo）本地日志方案

**版本：** v0.1  
**日期：** 2026-06-07  
**状态：** 规划中

---

## 1. 方案选择

**推荐库**：[`electron-log`](https://github.com/megahertz/electron-log)

**理由**：
- 专为 Electron 设计，主进程和渲染进程均可使用
- 自动写入文件，无需手动管理文件流
- 支持日志级别过滤、文件轮转、格式定制
- 生产环境（打包后）和开发环境行为一致

---

## 2. 日志级别

| 级别 | 使用场景 |
|---|---|
| `error` | 处理失败、未捕获异常、关键功能不可用 |
| `warn` | 非致命问题（如某文件跳过、格式不支持） |
| `info` | 关键业务流程节点（应用启动、工具执行开始/完成） |
| `debug` | 详细调试信息（仅在开发环境启用） |

**生产环境默认级别**：`info`（不记录 `debug`）

---

## 3. 日志文件位置

| 环境 | 路径 |
|---|---|
| 开发环境 | 项目根目录 `logs/huanwo-YYYY-MM-DD.log` |
| 生产环境（Windows） | `%APPDATA%\huanwo\logs\huanwo-YYYY-MM-DD.log` |
| 生产环境（macOS，未来） | `~/Library/Logs/huanwo/huanwo-YYYY-MM-DD.log` |

---

## 4. 文件轮转策略

- 单文件最大大小：**5 MB**
- 保留文件数量：**最近 5 个**
- 超出时自动删除最旧的文件

---

## 5. 日志格式

每条日志格式：

```
[2026-06-07 15:30:12.345] [info] [main] 应用启动，版本 v0.1.0
[2026-06-07 15:30:13.002] [info] [main] 全局快捷键注册成功：Alt+Space
[2026-06-07 15:30:45.678] [info] [tools/image-compress] 开始处理，文件数=3
[2026-06-07 15:30:47.123] [warn] [tools/image-compress] 跳过 img004.gif（GIF 不支持有损压缩）
[2026-06-07 15:30:48.456] [info] [tools/image-compress] 处理完成，成功=2，失败=1
[2026-06-07 15:31:02.789] [error] [main] 更新检测失败：Network Error
```

**格式说明**：
- 时间戳精确到毫秒
- 日志级别
- 模块标识（`[main]` 为主进程，`[tools/xxx]` 为工具模块）
- 具体描述

---

## 6. 敏感信息处理

**严禁记录以下内容**：

- 完整文件路径（只记录文件名，如 `photo.jpg`，不记录 `C:\Users\...\photo.jpg`）
- 文件内容或文件 Hash
- 用户系统用户名、IP 地址
- 任何用户输入的文本内容

**脱敏规则示例**：

```typescript
// ❌ 错误
log.info(`处理文件：${filePath}`);

// ✅ 正确
log.info(`处理文件：${path.basename(filePath)}`);
```

---

## 7. 主进程日志初始化

在 `electron/main.ts` 入口处配置：

```typescript
import log from 'electron-log';
import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';

// 生产环境只记录 info 及以上
if (app.isPackaged) {
  log.transports.file.level = 'info';
} else {
  log.transports.file.level = 'debug';
}

// 文件大小上限 5MB
log.transports.file.maxSize = 5 * 1024 * 1024;

// 保留最近 5 个文件
log.transports.file.maxFiles = 5;

// 日志文件路径（生产环境）
if (app.isPackaged) {
  log.transports.file.resolvePathFn = () => {
    const logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    return path.join(logDir, `huanwo-${dayjs().format('YYYY-MM-DD')}.log`);
  };
}

log.info('应用启动，版本', app.getVersion());
```

---

## 8. 渲染进程日志

渲染进程中通过 IPC 将日志发送到主进程写入文件（避免渲染进程直接写文件）：

```typescript
// preload.ts 暴露日志接口
contextBridge.exposeInMainWorld('log', {
  info: (msg: string) => ipcRenderer.invoke('log', 'info', msg),
  warn: (msg: string) => ipcRenderer.invoke('log', 'warn', msg),
  error: (msg: string) => ipcRenderer.invoke('log', 'error', msg),
});

// 主进程监听
ipcMain.handle('log', (_, level, msg) => {
  log[level](`[renderer] ${msg}`);
});
```

---

## 9. 用户侧日志导出

**场景**：用户遇到 bug，需要把日志发给开发者排查。

**实现方式**：

1. 设置页添加"导出日志"按钮
2. 点击后将最近 5 个日志文件打包为 `huanwo-logs-YYYYMMDD.zip`
3. 保存到用户选择的目录
4. 提示"日志已导出，可发送给开发者排查问题"

**注意**：导出前再次检查日志内容，确保无敏感路径信息。

---

## 10. 错误上报（可选，Phase 2）

若需要自动上报错误（用户授权后），可将 `error` 级别的日志异步发送到开发者服务器。

**原则**：
- 必须用户主动授权，默认关闭
- 只上报错误日志，不上报 info/warn
- 上报内容不含文件路径、用户名等敏感信息
- 设置页提供"关闭错误上报"开关
