import { createWorker } from 'tesseract.js'
import log from '../logger'

export async function runOcr(filePath: string, lang: string): Promise<{ text: string; confidence: number }> {
  const worker = await createWorker(lang, 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        log.info(`OCR 进度: ${Math.round(m.progress * 100)}%`)
      }
    }
  })

  try {
    const { data } = await worker.recognize(filePath)
    // 清理多余空格和空行
    const clean = data.text
      .split('\n')
      .map(line => line.replace(/\s{2,}/g, ' ').trim())
      .filter(line => line.length > 0)
      .join('\n')
    return {
      text: clean,
      confidence: Math.round(data.confidence)
    }
  } finally {
    await worker.terminate()
  }
}
