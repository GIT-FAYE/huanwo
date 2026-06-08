import { BrowserWindow, screen, ipcMain, dialog, shell, clipboard, nativeImage, app } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { execSync } from 'child_process'
import { compressImages } from './tools/image-compress'
import { convertImages } from './tools/image-convert'
import { previewRename, executeRename } from './tools/batch-rename'
import { translateText } from './tools/text-translate'
import { runOcr } from './tools/ocr'
import { getPlugin, getAllPlugins } from './pluginRegistry'
import { getConfig, setConfig, store } from './configManager'
import { setLauncherRef, getPanelBackground, refreshTheme as doRefreshTheme } from './themeManager'
import log from './logger'

let launcherWin: BrowserWindow | null = null
const toolWindows: Map<string, BrowserWindow> = new Map()

// ========== 面板窗口 ==========

export function createLauncherWindow(): BrowserWindow {
  if (launcherWin && !launcherWin.isDestroyed()) return launcherWin

  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  launcherWin = new BrowserWindow({
    width: 520, height: 600,
    x: Math.floor((sw - 520) / 2), y: Math.floor((sh - 600) / 2),
    frame: false, backgroundColor: getPanelBackground(),
    resizable: false, skipTaskbar: true, alwaysOnTop: true, show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true, nodeIntegration: false
    }
  })
  launcherWin.on('blur', () => hideLauncher())
  launcherWin.loadFile(path.join(__dirname, '../renderer/index.html'))
  setLauncherRef(launcherWin)
  return launcherWin
}

export function showLauncher() {
  if (launcherWin?.isDestroyed()) launcherWin = null
  const win = createLauncherWindow()
  win.show(); win.focus()
}

export function hideLauncher() {
  if (launcherWin && !launcherWin.isDestroyed()) launcherWin.hide()
}

export function toggleLauncher() {
  launcherWin && launcherWin.isVisible() ? hideLauncher() : showLauncher()
}

ipcMain.on('panel:hide', () => hideLauncher())

// ========== 工具窗口 ==========

// 获取插件列表
ipcMain.handle('plugin:list', () => getAllPlugins())

const TOOL_CONFIG: Record<string, { title: string; w: number; h: number }> = {}
// 启动时从注册表填充
for (const p of getAllPlugins()) {
  TOOL_CONFIG[p.id] = { title: p.name, w: p.windowSize.width, h: p.windowSize.height }
}

ipcMain.handle('tool:open', (_event, toolId: string) => {
  // 内置页面
  const builtins: Record<string, { name: string; w: number; h: number }> = {
    settings: { name: '设置', w: 520, h: 600 }
  }
  const plugin = getPlugin(toolId)
  const builtin = builtins[toolId]

  if (!plugin && !builtin) return { success: false, error: 'Unknown tool' }

  // 已有窗口则聚焦，不新建
  const existing = toolWindows.get(toolId)
  if (existing && !existing.isDestroyed()) {
    existing.focus()
    existing.restore()
    return { success: true }
  }

  // 单工具模式：关闭其他所有工具窗口
  if (getConfig('singleToolMode') !== false) {
    toolWindows.forEach((w, id) => {
      if (id !== toolId && !w.isDestroyed()) w.close()
    })
    toolWindows.clear()
  }

  const title = plugin?.name || builtin?.name || toolId
  const w = plugin?.windowSize?.width || builtin?.w || 560
  const h = plugin?.windowSize?.height || builtin?.h || 480

  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize

  const win = new BrowserWindow({
    width: w, height: h,
    x: Math.floor((sw - w) / 2), y: Math.floor((sh - h) / 2),
    resizable: true,
    minWidth: 400, minHeight: 400,
    title: `唤我 - ${title}`,
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true, nodeIntegration: false
    }
  })

  win.loadFile(path.join(__dirname, '../renderer/index.html'), {
    hash: `/${toolId}`
  })

  // 覆盖 HTML <title> 标签，确保显示"唤我 - 工具名"
  win.webContents.once('did-finish-load', () => {
    win.setTitle(`唤我 - ${title}`)
  })

  win.on('closed', () => { toolWindows.delete(toolId) })
  toolWindows.set(toolId, win)

  log.info(`打开工具: ${toolId}`)
  return { success: true }
})

// ========== 文件选择 ==========

ipcMain.handle('dialog:selectFiles', async (_event, exts: string[]) => {
  const cleanExts = exts.map(e => e.replace(/^\./, ''))
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: '图片', extensions: cleanExts }]
  })
  return result.canceled ? [] : result.filePaths
})

ipcMain.handle('shell:openDir', async (_event, filePath: string) => {
  shell.showItemInFolder(filePath)
})

ipcMain.handle('shell:openURL', async (_event, url: string) => {
  shell.openExternal(url)
})

// 配置读写
ipcMain.handle('config:get', (_event, key: string) => {
  return getConfig(key)
})
ipcMain.handle('config:set', (_event, key: string, value: any) => {
  setConfig(key, value)
  if (key === 'autoStart') {
    app.setLoginItemSettings({ openAtLogin: value })
  }
  if (key === 'theme') {
    doRefreshTheme()
  }
  return true
})

// 工具参数历史记忆
ipcMain.handle('toolParams:get', (_event, toolId: string) => {
  const params = store.get('toolParams', {}) as Record<string, any>
  return params[toolId] || {}
})
ipcMain.handle('toolParams:set', (_event, toolId: string, params: any) => {
  const all = (store.get('toolParams', {}) as Record<string, any>) || {}
  all[toolId] = params
  store.set('toolParams', all)
})

// 日志导出
ipcMain.handle('log:export', async () => {
  const log = require('./logger').default
  return log.transports.file.getFile().path
})

// 剪贴板检测
ipcMain.handle('clipboard:check', async () => {
  const img = clipboard.readImage()
  if (img.isEmpty()) return null
  const png = img.toPNG()
  if (png.length === 0) return null
  const tmpDir = path.join(os.tmpdir(), 'huanwo-clipboard')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
  const tmpPath = path.join(tmpDir, `clipboard_${Date.now()}.png`)
  fs.writeFileSync(tmpPath, png)
  return tmpPath
})

ipcMain.handle('clipboard:copy', async (_event, filePath: string) => {
  try {
    const img = nativeImage.createFromPath(filePath)
    if (!img.isEmpty()) { clipboard.writeImage(img); return true }
  } catch {}
  return false
})

const abortFlags = new Map<string, boolean>()

ipcMain.handle('tool:abort', (_event, toolId: string) => {
  abortFlags.set(toolId, true)
})

ipcMain.handle('tool:compress', async (event, payload: { files: string[], options: any }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  log.info(`开始压缩，文件数=${payload.files.length}`)

  const result = await compressImages(payload.files, payload.options, undefined, (current, total, file) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('tool:progress', { current, total, file })
    }
  })

  log.info(`压缩完成，成功=${result.results.filter(r => !r.error).length}`)
  return result
})

// ========== 图片转格式 ==========

ipcMain.handle('tool:convert', async (event, payload: { files: string[], format: string, quality: number }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  log.info(`开始转格式，文件数=${payload.files.length}`)
  const result = await convertImages(payload.files, payload.format as any, payload.quality, undefined, (current, total, file) => {
    if (win && !win.isDestroyed()) win.webContents.send('tool:progress', { current, total, file })
  })
  log.info(`转格式完成`)
  return result
})

// 批量重命名预览
ipcMain.handle('rename:preview', (_event, files: string[], rule: any) => {
  return previewRename(files, rule)
})

ipcMain.handle('rename:execute', async (_event, previews: any[]) => {
  return executeRename(previews)
})

// 翻译
// 翻译
ipcMain.handle('translate', async (_event, text: string, from?: string, to?: string, style?: string) => {
  const provider = getConfig('activeProvider') || 'qwen'
  const keyMap: Record<string, any> = { qwen: 'qwenApiKey', deepseek: 'deepseekApiKey', mimo: 'mimoApiKey' }
  const apiKey = getConfig(keyMap[provider]) || ''
  return await translateText(text, apiKey, provider, from, to, style)
})

// 保存裁剪图片到原目录
ipcMain.handle('image:saveCrop', async (_event, dataUrl: string, originalPath: string) => {
  const base64 = dataUrl.split(',')[1]
  const buf = Buffer.from(base64, 'base64')
  const ext = path.extname(originalPath)
  const dir = path.dirname(originalPath)
  const name = path.basename(originalPath, ext)
  const outPath = path.join(dir, `${name}_cropped${ext}`)
  let finalPath = outPath
  let i = 1
  while (fs.existsSync(finalPath)) {
    finalPath = path.join(dir, `${name}_cropped_${i}${ext}`)
    i++
  }
  fs.writeFileSync(finalPath, buf)
  return finalPath
})

// 删除文件
ipcMain.handle('file:delete', async (_event, filePath: string) => {
  try { fs.unlinkSync(filePath); return true } catch { return false }
})

// OCR 图片识字
ipcMain.handle('ocr', async (_event, filePath: string) => {
  const provider = getConfig('activeProvider') || 'qwen'
  const keyMap: Record<string, any> = { qwen: 'qwenApiKey', deepseek: 'deepseekApiKey', mimo: 'mimoApiKey' }
  const apiKey = getConfig(keyMap[provider]) || ''
  return await runOcr(filePath, apiKey, provider)
})

// 读取图片为 data URL（用于预览）
ipcMain.handle('image:dataUrl', async (_event, filePath: string) => {
  const ext = path.extname(filePath).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png',
    '.webp': 'webp', '.bmp': 'bmp', '.gif': 'gif',
    '.tiff': 'tiff', '.avif': 'avif'
  }
  const mime = mimeMap[ext] || 'png'
  const buf = fs.readFileSync(filePath)
  const base64 = buf.toString('base64')
  return `data:image/${mime};base64,${base64}`
})

// 截屏（用于取色器，Windows 系统级截屏）
ipcMain.handle('screen:capture', async () => {
  const tmpFile = path.join(os.tmpdir(), `huanwo-screen-${Date.now()}.png`)
  const psFile = path.join(os.tmpdir(), `huanwo-screen-${Date.now()}.ps1`)

  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bmp = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen(0, 0, 0, 0, $bmp.Size)
$bmp.Save('${tmpFile.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
`
  try {
    fs.writeFileSync(psFile, script, 'utf-8')
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psFile}"`, { timeout: 5000 })
    const data = fs.readFileSync(tmpFile)
    try { fs.unlinkSync(psFile) } catch {}
    try { fs.unlinkSync(tmpFile) } catch {}
    return 'data:image/png;base64,' + data.toString('base64')
  } catch (e: any) {
    try { fs.unlinkSync(psFile) } catch {}
    try { fs.unlinkSync(tmpFile) } catch {}
    return null
  }
})

// 剪贴板文本
ipcMain.handle('clipboard:readText', () => {
  return clipboard.readText()
})
ipcMain.handle('clipboard:writeText', (_event, text: string) => {
  clipboard.writeText(text)
})

// 更新
ipcMain.handle('update:check', async () => {
  const { checkForUpdates } = require('./updateManager')
  checkForUpdates()
})

ipcMain.handle('update:download', async () => {
  const { downloadUpdate } = require('./updateManager')
  downloadUpdate()
})

ipcMain.handle('update:install', async () => {
  const { quitAndInstall } = require('./updateManager')
  quitAndInstall()
})

// 应用信息
ipcMain.handle('app:version', async () => {
  return app.getVersion()
})
