# 唤我（HuanWo）项目记忆

## 项目信息
- 项目名称：唤我（HuanWo）
- 类型：Windows 桌面小工具合集，后期扩展至 macOS
- 当前阶段：规划完成，待开发

## 核心决策
- 技术栈：Electron 28 + React 18 + TypeScript + Vite (electron-vite)
- 图片处理：sharp（基于 libvips）
- 全局快捷键：Alt+Space（可自定义），electron globalShortcut
- 主题：跟随系统深浅色，nativeTheme API
- 自动更新：electron-updater + GitHub Releases
- 配置持久化：electron-store
- 状态管理：Zustand
- 打包：electron-builder，Windows NSIS 安装包

## 插件架构
- 每个工具是 plugins/ 下独立目录
- 目录内含 manifest.json、index.tsx（UI）、handler.ts（处理逻辑）
- 主程序扫描注册，无需修改主程序代码
- manifest 定义：id、name、icon、iconBg、iconColor、tags、windowSize、fileTypes 等

## 第一批工具（v0.1 Alpha）
1. 图片压缩（image-compress）：JPEG/PNG/WebP/GIF/TIFF/AVIF，质量滑块，有损/无损/智能
2. 图片转格式（image-convert）：主流格式互转，sharp 实现

## 文档位置
docs/ 目录：README.md / PRD.md / ARCHITECTURE.md / DESIGN_SPEC.md / TOOLS_SPEC.md / ROADMAP.md

## 开发路线
- Phase 0：框架骨架（托盘、快捷键、空面板、插件注册）
- Phase 1：两款图片工具完整上线（v0.1 Alpha）
- Phase 2：设置中心 + 自动更新 + 文件重命名（v0.2 Beta）
- Phase 3：更多工具 + macOS 适配（v0.3）
- v1.0：正式发布，需 4 款以上工具稳定可用
