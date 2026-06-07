import { Tray, Menu, app, nativeImage } from 'electron'
import { showLauncher } from './windowManager'

let tray: Tray | null = null

function createTrayIcon(): nativeImage {
  const size = 16
  const buf = Buffer.alloc(size * size * 4)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const edge = x < 2 || x >= size - 2 || y < 2 || y >= size - 2
      if (edge) {
        buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 0
      } else {
        buf[i] = 83; buf[i + 1] = 74; buf[i + 2] = 183; buf[i + 3] = 255
      }
    }
  }

  return nativeImage.createFromBuffer(buf, { width: size, height: size, scaleFactor: 1 })
}

export function initTray() {
  const icon = createTrayIcon()
  tray = new Tray(icon)

  const menu = Menu.buildFromTemplate([
    {
      label: '打开面板',
      click: () => showLauncher()
    },
    { type: 'separator' },
    {
      label: '设置',
      click: () => showLauncher()
    },
    { label: '检查更新', enabled: false },
    { type: 'separator' },
    {
      label: '退出唤我',
      click: () => app.quit()
    }
  ])

  tray.setToolTip('唤我')
  tray.setContextMenu(menu)
  tray.on('click', () => showLauncher())
}
