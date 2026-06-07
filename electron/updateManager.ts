import { autoUpdater } from 'electron-updater'
import { BrowserWindow, Tray, Notification } from 'electron'
import log from './logger'
import { getConfig } from './configManager'

export function initUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    log.info('检查更新...')
  })

  autoUpdater.on('update-available', (info) => {
    log.info(`发现新版本: ${info.version}`)
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update:available', info)
    })
    // 托盘通知
    showTrayNotification(`发现新版本 ${info.version}`, '点击设置页下载更新')
  })

  autoUpdater.on('update-not-available', () => {
    log.info('已是最新版本')
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update:not-available')
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update:progress', progress)
    })
  })

  autoUpdater.on('update-downloaded', () => {
    log.info('更新已下载，下次启动安装')
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update:downloaded')
    })
    showTrayNotification('更新已下载', '重启应用即可安装')
  })

  autoUpdater.on('error', (err) => {
    log.error(`更新出错: ${err.message}`)
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update:error', err.message)
    })
  })

  // 启动 10s 后检查（仅在开启自动更新时）
  setTimeout(() => {
    if (getConfig('autoUpdate') !== false) {
      checkForUpdates()
    }
  }, 10000)
}

function showTrayNotification(title: string, body: string) {
  try {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
  } catch {}
}

export function checkForUpdates() {
  autoUpdater.checkForUpdates().catch(err => {
    log.warn(`更新检查失败: ${err.message}`)
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update:error', err.message)
    })
  })
}

export function downloadUpdate() {
  autoUpdater.downloadUpdate().catch(err => {
    log.error(`下载更新失败: ${err.message}`)
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update:error', err.message)
    })
  })
}

export function quitAndInstall() {
  autoUpdater.quitAndInstall()
}
