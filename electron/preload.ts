import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  openTool: (toolId: string) => ipcRenderer.invoke('tool:open', toolId),
  hidePanel: () => ipcRenderer.send('panel:hide'),
  selectFiles: (exts: string[]) => ipcRenderer.invoke('dialog:selectFiles', exts),
  checkClipboard: () => ipcRenderer.invoke('clipboard:check'),
  copyToClipboard: (filePath: string) => ipcRenderer.invoke('clipboard:copy', filePath),
  readClipboardText: () => ipcRenderer.invoke('clipboard:readText'),
  writeClipboardText: (text: string) => ipcRenderer.invoke('clipboard:writeText', text),
  abortTool: (toolId: string) => ipcRenderer.invoke('tool:abort', toolId),
  getPlugins: () => ipcRenderer.invoke('plugin:list'),
  translateText: (text: string, from?: string, to?: string, style?: string) => ipcRenderer.invoke('translate', text, from, to, style),
  compressImages: (payload: any) => ipcRenderer.invoke('tool:compress', payload),
  convertImages: (payload: any) => ipcRenderer.invoke('tool:convert', payload),
  openOutputDir: (filePath: string) => ipcRenderer.invoke('shell:openDir', filePath),
  openURL: (url: string) => ipcRenderer.invoke('shell:openURL', url),
  onToolProgress: (cb: (data: any) => void) => {
    ipcRenderer.on('tool:progress', (_, data) => cb(data))
  },
  getConfig: (key: string) => ipcRenderer.invoke('config:get', key),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
  getToolParams: (toolId: string) => ipcRenderer.invoke('toolParams:get', toolId),
  setToolParams: (toolId: string, params: any) => ipcRenderer.invoke('toolParams:set', toolId, params),
  exportLogs: () => ipcRenderer.invoke('log:export'),
  renamePreview: (files: string[], rule: any) => ipcRenderer.invoke('rename:preview', files, rule),
  renameExecute: (previews: any[]) => ipcRenderer.invoke('rename:execute', previews),
  updateHotkey: (hotkey: string) => ipcRenderer.invoke('hotkey:update', hotkey),
  onHotkeyConflict: (cb: (hotkey: string) => void) => {
    ipcRenderer.on('hotkey:conflict', (_, hotkey) => cb(hotkey))
  },

  // 更新相关
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  quitAndInstall: () => ipcRenderer.invoke('update:install'),
  getVersion: () => ipcRenderer.invoke('app:version'),
  onUpdateAvailable: (cb: (info: any) => void) => {
    ipcRenderer.on('update:available', (_, info) => cb(info))
  },
  onUpdateNotAvailable: (cb: () => void) => {
    ipcRenderer.on('update:not-available', () => cb())
  },
  onUpdateProgress: (cb: (progress: any) => void) => {
    ipcRenderer.on('update:progress', (_, progress) => cb(progress))
  },
  onUpdateDownloaded: (cb: () => void) => {
    ipcRenderer.on('update:downloaded', () => cb())
  },
  onUpdateError: (cb: (msg: string) => void) => {
    ipcRenderer.on('update:error', (_, msg) => cb(msg))
  },

  onThemeChange: (cb: (isDark: boolean) => void) => {
    ipcRenderer.on('theme:changed', (_, isDark) => cb(isDark))
  },
  log: {
    info: (msg: string) => ipcRenderer.invoke('log', 'info', msg),
    warn: (msg: string) => ipcRenderer.invoke('log', 'warn', msg),
    error: (msg: string) => ipcRenderer.invoke('log', 'error', msg),
  }
})
