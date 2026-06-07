export interface WindowAPI {
  openTool: (toolId: string) => Promise<{ success: boolean }>
  hidePanel: () => void
  selectFiles: (exts: string[]) => Promise<string[]>
  compressImages: (payload: { files: string[], options: any }) => Promise<any>
  convertImages: (payload: { files: string[], format: string, quality: number }) => Promise<any>
  openOutputDir: (filePath: string) => Promise<void>
  onToolProgress: (cb: (data: { current: number, total: number, file: string }) => void) => void
  onThemeChange: (cb: (isDark: boolean) => void) => void
  log: {
    info: (msg: string) => void
    warn: (msg: string) => void
    error: (msg: string) => void
  }
}

declare global {
  interface Window {
    api: WindowAPI
  }
}
