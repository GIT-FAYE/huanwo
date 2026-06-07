import { app, Menu } from 'electron'
import { initHotkeys, unregisterAll } from './hotkeyManager'
import { showLauncher } from './windowManager'
import { initTray } from './trayManager'
import { initConfig, getConfig } from './configManager'
import { initTheme } from './themeManager'
import { initLogger } from './logger'
import { scanPlugins } from './pluginRegistry'
import { initUpdater } from './updateManager'

let logger: any

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  logger = initLogger()
  initConfig()
  // 同步开机自启设置
  app.setLoginItemSettings({ openAtLogin: getConfig('autoStart') })
  scanPlugins()
  initUpdater()
  initHotkeys()
  initTray()
  initTheme()
  logger.info('唤我启动完成')
})

app.on('window-all-closed', () => {})

app.on('will-quit', () => {
  unregisterAll()
  logger?.info('唤我退出')
})
