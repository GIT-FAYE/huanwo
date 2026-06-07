import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import { LauncherPanel } from './launcher/LauncherPanel'
import { ImageCompressTool } from './tool-window/ImageCompressTool'
import { ImageConvertTool } from './tool-window/ImageConvertTool'
import { SettingsPage } from './settings/SettingsPage'
import { BatchRenameTool } from './tool-window/BatchRenameTool'
import { TextTranslateTool } from './tool-window/TextTranslateTool'
import { QrcodeTool } from './tool-window/QrcodeTool'
import { ColorPickerTool } from './tool-window/ColorPickerTool'
import './shared/theme/theme.css'

function applyTheme(theme: string) {
  document.documentElement.setAttribute('data-theme', theme)
}

function Router() {
  const [route, setRoute] = useState(window.location.hash.slice(1))

  useEffect(() => {
    const handler = () => setRoute(window.location.hash.slice(1))
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  useEffect(() => {
    // 从 config 加载主题
    window.api?.getConfig('theme').then((theme: string) => {
      const t = theme || 'auto'
      if (t === 'auto') {
        applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      } else {
        applyTheme(t)
      }
    })

    // 监听主题变更（设置页修改 + 系统切换）
    window.api?.onThemeChange?.((theme: string) => {
      applyTheme(theme)
    })

    // 系统主题变化兜底（仅在 auto 模式）
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const h = (e: MediaQueryListEvent) => {
      window.api?.getConfig('theme').then((t: string) => {
        if (!t || t === 'auto') applyTheme(e.matches ? 'dark' : 'light')
      })
    }
    mq.addEventListener('change', h)
  }, [])

  switch (route) {
    case '/qrcode':
      return <QrcodeTool />
    case '/color-picker':
      return <ColorPickerTool />
    case '/text-translate':
      return <TextTranslateTool />
    case '/settings':
      return <SettingsPage />
    case '/batch-rename':
      return <BatchRenameTool />
    case '/image-compress':
      return <ImageCompressTool />
    case '/image-convert':
      return <ImageConvertTool />
    default:
      return <LauncherPanel />
  }
}

createRoot(document.getElementById('root')!).render(<Router />)
