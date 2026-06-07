import fs from 'fs'
import path from 'path'
import log from '../logger'

const ENDPOINTS: Record<string, string> = {
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  mimo: 'https://api.xiaomimimo.com/v1/chat/completions',
}

export async function runOcr(filePath: string, apiKey: string, provider: string): Promise<{ text: string; confidence: number }> {
  if (!apiKey) return { text: '请在设置中配置 API Key', confidence: 0 }
  if (!ENDPOINTS[provider]) {
    return { text: '当前 Provider 不支持图片识别，请切换到千问或 MiMo', confidence: 0 }
  }

  const ext = path.extname(filePath).toLowerCase().slice(1)
  const mimeMap: Record<string, string> = { 'jpg': 'jpeg', 'jpeg': 'jpeg', 'png': 'png', 'webp': 'webp', 'bmp': 'bmp' }
  const mime = mimeMap[ext] || 'png'
  const buf = fs.readFileSync(filePath)
  const base64 = buf.toString('base64')

  const isMimo = provider === 'mimo'

  try {
    const res = await fetch(ENDPOINTS[provider], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [isMimo ? 'api-key' : 'Authorization']: isMimo ? apiKey : `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: isMimo ? 'mimo-v2.5' : 'qwen-vl-max',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: '请提取这张图片中的所有文字，保持原始排版，直接返回文字不要解释。' },
            { type: 'image_url', image_url: { url: `data:image/${mime};base64,${base64}` } },
          ]
        }],
      }),
    })

    const data: any = await res.json()
    if (data.error) {
      log.error(`OCR 错误 (${provider}): ${JSON.stringify(data.error)}`)
      return { text: `识别失败: ${data.error.message}`, confidence: 0 }
    }

    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) return { text: '未识别到文字', confidence: 0 }
    return { text: content.replace(/^"|"$/g, '').trim(), confidence: 90 }
  } catch (err: any) {
    log.error(`OCR 请求失败: ${err.message}`)
    return { text: '识别失败，请检查网络', confidence: 0 }
  }
}
