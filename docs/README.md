# 唤我（HuanWo）文档索引

本目录为「唤我」项目规划阶段的全量文档。

## 文档列表

| 文档 | 说明 |
|---|---|
| [README.md](./README.md) | 本文档，索引 |
| [PRD.md](./PRD.md) | 产品需求文档：产品定位、核心功能、剪贴板集成、版本规划 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 技术架构文档：技术选型（Electron/Tauri 双轨验证）、分层架构、插件规范（Phase 2）、深色模式、自动更新、日志方案、代码签名 |
| [DESIGN_SPEC.md](./DESIGN_SPEC.md) | UI/UX 设计规范：色彩体系、字体、组件规范、深色模式规范、动效规范 |
| [TOOLS_SPEC.md](./TOOLS_SPEC.md) | 第一批工具规格：图片压缩 + 图片转格式的详细功能说明、参数定义、剪贴板集成、边界条件 |
| [ROADMAP.md](./ROADMAP.md) | 开发路线图：Phase 0 Spike + Phase 0–3 任务清单、验收标准、工具扩展候选列表 |
| [PHASE0_SPIKE.md](./PHASE0_SPIKE.md) | Phase 0 技术验证 Checklist：sharp 打包、快捷键、托盘、主题、干净环境运行 |
| [LOGGING.md](./LOGGING.md) | 本地日志方案：electron-log 配置、日志格式、敏感信息脱敏、日志导出 |
| [RELEASE_WORKFLOW.md](./RELEASE_WORKFLOW.md) | 构建/发布流程：构建流程、代码签名、发布步骤、国内镜像同步、回滚方案 |

## 核心决策摘要

- **应用名称**：唤我（HuanWo）
- **技术栈**：Phase 0 Spike 验证后最终确认（Electron 28 + React 18 + TypeScript 为当前倾向方案）
- **图片处理**：sharp（基于 libvips），Phase 0 Spike 优先验证打包可行性
- **全局快捷键**：`Alt + Space`（可自定义），electron globalShortcut
- **主题**：跟随系统深浅色自动切换
- **自动更新**：electron-updater + GitHub Releases（主）+ Gitee Releases（国内镜像）
- **代码签名**：v1.0 正式版必须使用 EV 代码签名证书
- **插件架构**：Phase 2 引入，Phase 0-1 工具硬编码
- **剪贴板集成**：支持剪贴板作为输入源和处理结果输出（Phase 1）
- **第一批工具**：图片压缩、图片转格式

## 文档更新记录

| 日期 | 更新内容 |
|---|---|
| 2026-06-07 | 初始创建（PRD / ARCHITECTURE / DESIGN_SPEC / TOOLS_SPEC / ROADMAP） |
| 2026-06-07 | 采纳同事第一轮反馈：插件延迟到 Phase 2、GIF 处理澄清、输出策略统一、国内更新源、代码签名、补充三份缺失文档（PHASE0_SPIKE / LOGGING / RELEASE_WORKFLOW） |
| 2026-06-07 | 采纳同事第二轮反馈：修正剪贴板触发描述、转格式工具补覆盖选项、manifest 引用对齐 Phase 描述、SVG 依赖标注、sharp 打包配置修正、LOGGING.md 补 import、PHASE0_SPIKE 验证报告补环境参数、DESIGN_SPEC 补剪贴板 UI 反馈规范 |
| 2026-06-07 | 采纳同事第三轮反馈：日志实现阶段改为 Phase 0、ARCHITECTURE 对比表补包体积目标列、PRD 新增窗口生命周期定义（关闭窗口 ≠ 退出应用）、TOOLS_SPEC 补剪贴板临时文件清理策略、PHASE0_SPIKE 对比表加预期值标注、ROADMAP Phase 1 补单元测试任务、RELEASE_WORKFLOW CI 触发支持 v* tag |
| 2026-06-07 | 采纳同事第四轮反馈：修正 PRD 2.2 节剪贴板引用编号（2.5→2.3）、ARCHITECTURE 对比表"实测"措辞改为"调研基准值（待 Spike 实测）"、剪贴板填入明确为追加模式（TOOLS_SPEC + PRD）、ROADMAP 单元测试补最小覆盖范围、PRD 设置中心补完整快捷键冲突处理流程、PHASE0_SPIKE .ico 改为单文件含四种尺寸方案、PRD 2.4 系统集成表新增前置依赖列 |
| 2026-06-07 | 采纳同事第五轮反馈：修正 PRD 2.4 死链（2.4 → 第 4 节设置中心）、TOOLS_SPEC 补剪贴板去重逻辑（onFocus 时路径去重 + hash 去重防重复追加）、PRD 2.1 明确 Alt+Space Toggle 行为（再按=关闭面板）、ROADMAP Phase 1 补剪贴板去重任务、ARCHITECTURE 目录结构补 `electron/__tests__/`、ROADMAP + PRD v1.0 进入条件补单元测试覆盖率 ≥ 80% |
| 2026-06-07 | 采纳第六轮反馈：TOOLS_SPEC + DESIGN_SPEC 补处理取消/中断机制（处理中"开始处理"变"中止处理"，完成当前文件即停止）、PRD 2.2 补工具窗口最小化恢复方式（Alt+Tab / 面板重开 / 托盘菜单）、TOOLS_SPEC 1.2 + DESIGN_SPEC 4.2.1 明确 GIF 提示时机与形式（参数区黄色提示条 + 文件列表 🎞️ GIF 标签 + tooltip） |
