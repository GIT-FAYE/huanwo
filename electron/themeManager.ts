import { nativeTheme, BrowserWindow } from 'electron'
import { getConfig } from './configManager'

type Theme = 'light' | 'dark' | 'eye-care' | 'fresh'

let launcherWin: BrowserWindow | null = null

export function setLauncherRef(win: BrowserWindow) {
  launcherWin = win
}

function resolveEffectiveTheme(): Theme {
  const saved = getConfig('theme') || 'auto'
  if (saved === 'auto') {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  }
  return saved as Theme
}

const PANEL_BG: Record<Theme, string> = {
  'light': '#F5F5F4',
  'dark': '#1C1C1E',
  'eye-care': '#EDE4D6',
  'fresh': '#E8F4F4',
}

export function getPanelBackground(): string {
  return PANEL_BG[resolveEffectiveTheme()] || '#F5F5F4'
}

function applyTheme() {
  const saved = getConfig('theme') || 'auto'
  const theme = resolveEffectiveTheme()

  // 同步 Electron nativeTheme：auto 时恢复 system，手动时锁定
  if (saved === 'auto') {
    nativeTheme.themeSource = 'system'
  } else if (theme !== 'eye-care' && theme !== 'fresh') {
    nativeTheme.themeSource = theme === 'dark' ? 'dark' : 'light'
  } else {
    nativeTheme.themeSource = 'light'
  }

  // 通知所有窗口
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send('theme:changed', theme)
    }
  })

  // 面板窗口背景色
  if (launcherWin && !launcherWin.isDestroyed()) {
    launcherWin.setBackgroundColor(PANEL_BG[theme])
  }
}

let _initialized = false

export function initTheme() {
  if (_initialized) return
  _initialized = true

  // 系统主题变化时（仅在 auto 模式下生效）
  nativeTheme.on('updated', () => {
    if (getConfig('theme') === 'auto') {
      applyTheme()
    }
  })

  applyTheme()
}

// 设置页修改主题后调用（不再重复注册 listener）
export function refreshTheme() {
  applyTheme()
}
