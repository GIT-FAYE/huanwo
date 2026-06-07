import log from 'electron-log'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

export function initLogger() {
  if (app.isPackaged) {
    log.transports.file.level = 'info'
  } else {
    log.transports.file.level = 'debug'
  }

  log.transports.file.maxSize = 5 * 1024 * 1024
  log.transports.file.maxFiles = 5

  if (app.isPackaged) {
    log.transports.file.resolvePathFn = () => {
      const logDir = path.join(app.getPath('userData'), 'logs')
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
      const date = new Date().toISOString().slice(0, 10)
      return path.join(logDir, `huanwo-${date}.log`)
    }
  }

  log.info('应用启动，版本', app.getVersion())
  return log
}

export default log
