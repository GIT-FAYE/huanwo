const ENDPOINTS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  mimo: 'https://api.xiaomimimo.com/v1/chat/completions',
}

const MODELS: Record<string, string> = {
  deepseek: 'deepseek-chat',
  qwen: 'qwen-plus',
  mimo: 'mimo-v2.5',
}

const STYLES: Record<string, string> = {
  general: '你是一个翻译助手',
  ecommerce: '你是一个跨境电商翻译专家。翻译要符合电商平台风格，突出卖点、关键词优化、适合listing标题和描述',
  casual: '你是一个口语翻译助手。翻译要自然、地道，使用日常用语，适合聊天和社交',
  formal: '你是一个专业翻译。翻译要正式、准确，适合商务邮件、合同等正式文档',
  tech: '你是一个技术翻译专家。保留技术术语的准确性，适合技术文档、API文档等',
  subtitle: '你是一个字幕翻译。翻译要简洁、口语化，每行不超过20字，适合视频字幕',
  listing: '你是一个电商Listing优化专家。翻译要突出关键词、卖点、SEO友好，适合Shopee/Lazada/Amazon商品标题和描述',
}

const LANG_NAMES: Record<string, string> = {
  auto: '自动检测', zh: '中文', en: 'English',
  ja: '日本語', ko: '한국어', fr: 'Français',
  de: 'Deutsch', es: 'Español', pt: 'Português',
  it: 'Italiano', ru: 'Русский', ar: 'العربية',
  th: 'ไทย', vi: 'Tiếng Việt', id: 'Indonesia',
  ms: 'Melayu', tl: 'Tagalog', hi: 'हिन्दी',
  nl: 'Nederlands', pl: 'Polski', sv: 'Svenska', tr: 'Türkçe',
}

export async function translateText(
  text: string, apiKey: string, provider: string,
  from: string = 'auto', to: string = 'en', style: string = 'general'
): Promise<string> {
  if (!text.trim()) return ''
  if (!apiKey) return '请在设置中配置 API Key'

  const source = LANG_NAMES[from] || from
  const target = LANG_NAMES[to] || to
  const persona = STYLES[style] || STYLES.general
  const url = ENDPOINTS[provider] || ENDPOINTS.deepseek
  const model = MODELS[provider] || MODELS.deepseek
  const isMimo = provider === 'mimo'

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [isMimo ? 'api-key' : 'Authorization']: isMimo ? apiKey : `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: `${persona}。将用户输入的${source}翻译成${target}。只返回翻译结果，不要解释。` },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    const data: any = await res.json()
    if (data.error) return `翻译失败: ${data.error.message}`
    return data.choices?.[0]?.message?.content?.trim() ?? '翻译失败'
  } catch {
    return '翻译失败，请检查网络'
  }
}
