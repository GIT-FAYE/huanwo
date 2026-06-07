import { nativeTheme, BrowserWindow } from 'electron'
import { getConfig } from './configManager'

type Theme = 'auto' | 'light' | 'dark' | 'eye-care' | 'fresh'

let launcherWin: BrowserWindow | null = null

export function setLauncherRef(win: BrowserWindow) {
  launcherWin = win
}

function resolveEffectiveTheme(): Theme {
  const saved = getConfig('theme') || 'auto'
  if (saved === 'auto') {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  }
  return saved
}

const PANEL_BG: Record<Theme, string> = {
  'light': '#F5F5F4',
  'dark': '#1C1C1E',
  'eye-care': '#EDE4D6',
  'fresh': '#E8F4F4',
  'auto': '#F5F5F4',
}

export function getPanelBackground(): string {
  return PANEL_BG[resolveEffectiveTheme()] || '#F5F5F4'
}

export function initTheme() {
  function applyTheme() {
    const theme = resolveEffectiveTheme()

    // 同步 Electron nativeTheme（影响系统托盘/标题栏）
    if (theme !== 'eye-care' && theme !== 'fresh') {
      nativeTheme.themeSource = theme === 'dark' ? 'dark' : 'light'
    } else {
      nativeTheme.themeSource = 'light'
    }

    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('theme:changed', theme)
    })

    // 面板窗口背景色
    if (launcherWin && !launcherWin.isDestroyed()) {
      launcherWin.setBackgroundColor(PANEL_BG[theme] || PANEL_BG.light)
    }
  }

  // 系统主题变化时（仅在 auto 模式下生效）
  nativeTheme.on('updated', () => {
    if (getConfig('theme') === 'auto') {
      applyTheme()
    }
  })

  applyTheme()
}
