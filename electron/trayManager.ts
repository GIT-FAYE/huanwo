import { Tray, Menu, app, nativeImage } from 'electron'
import path from 'path'
import { showLauncher } from './windowManager'

let tray: Tray | null = null

export function initTray() {
  // 使用 assets 目录下的托盘图标
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon)

  const menu = Menu.buildFromTemplate([
    { label: '打开面板', click: () => showLauncher() },
    { type: 'separator' },
    { label: '设置', click: () => showLauncher() },
    { label: '检查更新', enabled: false },
    { type: 'separator' },
    { label: '退出唤我', click: () => app.quit() }
  ])

  tray.setToolTip('唤我')
  tray.setContextMenu(menu)
  tray.on('click', () => showLauncher())
}
