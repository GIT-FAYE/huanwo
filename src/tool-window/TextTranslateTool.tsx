import { useState, useEffect } from 'react'
import { ToolWindowShell } from './ToolWindowShell'

export function TextTranslateTool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sourceLang, setSourceLang] = useState('auto')
  const [targetLang, setTargetLang] = useState('en')
  const [style, setStyle] = useState('general')
  const [provider, setProvider] = useState('qwen')

  useEffect(() => {
    window.api.getConfig('activeProvider').then((v: any) => setProvider(v || 'qwen'))
    window.api.getToolParams('text-translate').then((h: any) => {
      if (h && Object.keys(h).length > 0) {
        if (h.sourceLang) setSourceLang(h.sourceLang)
        if (h.targetLang) setTargetLang(h.targetLang)
        if (h.style) setStyle(h.style)
      }
    })
  }, [])

  useEffect(() => {
    window.api.setToolParams('text-translate', { sourceLang, targetLang, style })
  }, [sourceLang, targetLang, style])

  useEffect(() => {
    if (!input.trim()) { setOutput(''); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const result = await window.api.translateText(input, sourceLang, targetLang, style)
        setOutput(result)
      } catch { setOutput('翻译失败') }
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [input, sourceLang, targetLang, style])

  const pasteFromClipboard = () => {
    window.api.readClipboardText().then((t: string) => { if (t) setInput(prev => prev + t) })
  }
  const handleSwap = () => {
    if (sourceLang === 'auto') return
    const tmp = sourceLang
    setSourceLang(targetLang)
    setTargetLang(tmp)
    setInput(output)
  }

  const providerName = provider === 'qwen' ? '千问' : provider === 'mimo' ? 'MiMo' : 'DeepSeek'

  return (
    <ToolWindowShell title="文本翻译" toolId="text-translate">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10 }}>

        {/* 工具栏 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <select value={sourceLang} onChange={e => setSourceLang(e.target.value)} style={selStyle}>
            <option value="auto">自动检测</option>
            {LANGUAGES.map(l => <option key={l} value={l}>{LANG_MAP[l]}</option>)}
          </select>
          <button onClick={handleSwap} disabled={sourceLang === 'auto'} style={swapBtn}>⇄</button>
          <select value={targetLang} onChange={e => setTargetLang(e.target.value)} style={selStyle}>
            {LANGUAGES.map(l => <option key={l} value={l}>{LANG_MAP[l]}</option>)}
          </select>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', margin: '0 2px' }}>·</span>
          <select value={style} onChange={e => setStyle(e.target.value)} style={{ ...selStyle, minWidth: 90 }}>
            <option value="general">通用</option>
            <option value="ecommerce">跨境电商</option>
            <option value="listing">Listing</option>
            <option value="casual">口语</option>
            <option value="formal">商务</option>
            <option value="tech">技术</option>
            <option value="subtitle">字幕</option>
          </select>
          <button onClick={() => setInput('')} style={actionBtn}>清空</button>
          <button onClick={pasteFromClipboard} style={{ ...actionBtn, marginLeft: 'auto' }}>📋 粘贴</button>
        </div>

        {/* 输入 */}
        <textarea value={input} onChange={e => setInput(e.target.value)}
          placeholder="输入文本，自动检测中英文…" spellCheck={false}
          style={textArea} />

        {loading && (
          <div style={{ height: 3, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: '30%', borderRadius: 2, background: 'var(--color-primary)',
              animation: 'progressPulse 1.2s ease-in-out infinite',
            }} />
          </div>
        )}

        {/* 输出 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: -6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            由 {providerName} AI 输出翻译结果{loading ? '…' : ''}
          </span>
          <button onClick={() => { if (output) window.api.writeClipboardText(output) }}
            disabled={!output} style={{ ...actionBtn, opacity: output ? 1 : 0.4 }}>
            📋 复制
          </button>
        </div>
        <textarea value={output} readOnly placeholder="翻译结果…"
          style={{ ...textArea, color: output ? 'var(--text-primary)' : 'var(--text-tertiary)' }} />
      </div>
    </ToolWindowShell>
  )
}

const LANGUAGES = ['zh', 'en', 'ja', 'ko', 'th', 'vi', 'id', 'ms', 'tl', 'fr', 'de', 'es', 'pt', 'it', 'ru', 'ar', 'hi', 'nl', 'pl', 'sv', 'tr']
const LANG_MAP: Record<string, string> = {
  zh: '中文', en: 'English', ja: '日本語', ko: '한국어', th: 'ไทย', vi: 'Tiếng Việt',
  id: 'Indonesia', ms: 'Melayu', tl: 'Tagalog', fr: 'Français', de: 'Deutsch',
  es: 'Español', pt: 'Português', it: 'Italiano', ru: 'Русский', ar: 'العربية',
  hi: 'हिन्दी', nl: 'Nederlands', pl: 'Polski', sv: 'Svenska', tr: 'Türkçe',
}

const textArea: React.CSSProperties = {
  flex: 1, minHeight: 100, padding: 10, borderRadius: 8,
  border: '1px solid var(--border-default)', background: 'var(--bg-secondary)',
  color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit',
  resize: 'none', outline: 'none', lineHeight: 1.6,
}
const selStyle: React.CSSProperties = {
  fontSize: 12, padding: '4px 6px', borderRadius: 6,
  border: '1px solid var(--border-default)', background: 'var(--bg-secondary)',
  color: 'var(--text-secondary)', cursor: 'pointer',
}
const swapBtn: React.CSSProperties = {
  border: '1px solid var(--border-default)', borderRadius: 6,
  padding: '2px 6px', fontSize: 14, cursor: 'pointer',
  background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
  opacity: 1, lineHeight: 1,
}
const actionBtn: React.CSSProperties = {
  border: '1px solid var(--border-default)', borderRadius: 6,
  padding: '3px 10px', fontSize: 11, cursor: 'pointer',
  background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
}
