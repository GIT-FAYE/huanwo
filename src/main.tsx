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

function Router() {
  const [route, setRoute] = useState(window.location.hash.slice(1))

  useEffect(() => {
    const handler = () => setRoute(window.location.hash.slice(1))
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const h = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', h)

    window.api?.onThemeChange?.((isDark: boolean) => {
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    })
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
