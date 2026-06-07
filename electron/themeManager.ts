import { nativeTheme, BrowserWindow } from 'electron'

export function initTheme() {
  // 通知所有窗口主题变化
  function notifyWindows() {
    const isDark = nativeTheme.shouldUseDarkColors
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('theme:changed', isDark)
    })
  }

  nativeTheme.on('updated', notifyWindows)
  notifyWindows()
}
