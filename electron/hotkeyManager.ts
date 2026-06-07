import { globalShortcut, app, ipcMain } from 'electron'
import { toggleLauncher } from './windowManager'
import log from './logger'

const DEFAULT_HOTKEY = 'Ctrl+Space'

export function initHotkeys() {
  const ok = globalShortcut.register(DEFAULT_HOTKEY, () => {
    toggleLauncher()
  })

  if (ok) {
    log.info(`全局快捷键注册成功: ${DEFAULT_HOTKEY}`)
  } else {
    log.warn(`全局快捷键冲突: ${DEFAULT_HOTKEY}，请检查是否被其他程序占用`)
  }
}

export function unregisterAll() {
  globalShortcut.unregisterAll()
}

// 设置页修改快捷键后重新注册
ipcMain.handle('hotkey:update', (_event, newHotkey: string) => {
  globalShortcut.unregisterAll()
  const ok = globalShortcut.register(newHotkey, () => toggleLauncher())
  if (ok) {
    log.info(`快捷键已更新: ${newHotkey}`)
  } else {
    log.warn(`快捷键注册失败: ${newHotkey}（可能冲突）`)
  }
  return ok
})
