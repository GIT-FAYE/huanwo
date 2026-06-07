import path from 'path'
import fs from 'fs'
import log from './logger'

export interface PluginMeta {
  id: string
  name: string
  version: string
  description: string
  icon: string
  iconBg: string
  iconColor: string
  tags: string[]
  windowSize: { width: number; height: number }
  windowResizable: boolean
  acceptsFiles: boolean
  fileTypes: string[]
  handler: string
  author: string
}

const plugins = new Map<string, PluginMeta>()

export function scanPlugins(): PluginMeta[] {
  plugins.clear()
  const pluginsDir = path.join(__dirname, '../../plugins')

  if (!fs.existsSync(pluginsDir)) {
    log.warn(`插件目录不存在: ${pluginsDir}`)
    return []
  }

  const dirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())

  for (const dir of dirs) {
    const manifestPath = path.join(pluginsDir, dir.name, 'manifest.json')
    if (!fs.existsSync(manifestPath)) continue

    try {
      const raw = fs.readFileSync(manifestPath, 'utf-8')
      const meta: PluginMeta = JSON.parse(raw)
      plugins.set(meta.id, meta)
      log.info(`插件注册: ${meta.id} (${meta.name} v${meta.version})`)
    } catch (err: any) {
      log.error(`插件加载失败: ${dir.name} - ${err.message}`)
    }
  }

  return getAllPlugins()
}

export function getPlugin(id: string): PluginMeta | undefined {
  return plugins.get(id)
}

export function getAllPlugins(): PluginMeta[] {
  return Array.from(plugins.values())
}
