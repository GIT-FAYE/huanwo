import { useState, useEffect } from 'react'
import { ToolWindowShell } from './ToolWindowShell'

export function TextTranslateTool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sourceLang, setSourceLang] = useState('auto')
  const [targetLang, setTargetLang] = useState('en')
  const [style, setStyle] = useState('general')

  useEffect(() => {
    window.api.getConfig('transSourceLang').then((v: any) => { if (v) setSourceLang(v) })
    window.api.getConfig('transTargetLang').then((v: any) => { if (v) setTargetLang(v) })
    window.api.getConfig('transStyle').then((v: any) => { if (v) setStyle(v) })
  }, [])

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
  }, [input, sourceLang, targetLang])

  const pasteFromClipboard = async () => {
    const text = await window.api.readClipboardText()
    if (text) setInput(text)
  }

  const handleSwap = () => setInput(output)

  return (
    <ToolWindowShell title="文本翻译" toolId="text-translate">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>输入</span>
            <select value={sourceLang} onChange={e => {
              setSourceLang(e.target.value)
              window.api.setConfig('transSourceLang', e.target.value)
            }} style={selStyle}>
              <option value="auto">自动检测</option>
              <option value="zh">中文 (Chinese)</option>
              <option value="en">English (英语)</option>
              <option value="ja">日本語 (日语)</option>
              <option value="ko">한국어 (韩语)</option>
              <option value="th">ไทย (泰语)</option>
              <option value="vi">Tiếng Việt (越南语)</option>
              <option value="id">Indonesia (印尼语)</option>
              <option value="ms">Melayu (马来语)</option>
              <option value="tl">Tagalog (菲律宾语)</option>
              <option value="fr">Français (法语)</option>
              <option value="de">Deutsch (德语)</option>
              <option value="es">Español (西班牙语)</option>
              <option value="pt">Português (葡萄牙语)</option>
              <option value="it">Italiano (意大利语)</option>
              <option value="ru">Русский (俄语)</option>
              <option value="ar">العربية (阿拉伯语)</option>
              <option value="hi">हिन्दी (印地语)</option>
              <option value="nl">Nederlands (荷兰语)</option>
              <option value="pl">Polski (波兰语)</option>
              <option value="sv">Svenska (瑞典语)</option>
              <option value="tr">Türkçe (土耳其语)</option>
            </select>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>→</span>
            <select value={targetLang} onChange={e => {
              setTargetLang(e.target.value)
              window.api.setConfig('transTargetLang', e.target.value)
            }} style={selStyle}>
              <option value="zh">中文 (Chinese)</option>
              <option value="en">English (英语)</option>
              <option value="ja">日本語 (日语)</option>
              <option value="ko">한국어 (韩语)</option>
              <option value="th">ไทย (泰语)</option>
              <option value="vi">Tiếng Việt (越南语)</option>
              <option value="id">Indonesia (印尼语)</option>
              <option value="ms">Melayu (马来语)</option>
              <option value="tl">Tagalog (菲律宾语)</option>
              <option value="fr">Français (法语)</option>
              <option value="de">Deutsch (德语)</option>
              <option value="es">Español (西班牙语)</option>
              <option value="pt">Português (葡萄牙语)</option>
              <option value="it">Italiano (意大利语)</option>
              <option value="ru">Русский (俄语)</option>
              <option value="ar">العربية (阿拉伯语)</option>
              <option value="hi">हिन्दी (印地语)</option>
              <option value="nl">Nederlands (荷兰语)</option>
              <option value="pl">Polski (波兰语)</option>
              <option value="sv">Svenska (瑞典语)</option>
              <option value="tr">Türkçe (土耳其语)</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <select value={style} onChange={e => {
              setStyle(e.target.value)
              window.api.setConfig('transStyle', e.target.value)
            }} style={selStyle}>
              <option value="general">通用翻译</option>
              <option value="ecommerce">跨境电商</option>
              <option value="listing">Listing 优化</option>
              <option value="casual">日常口语</option>
              <option value="formal">正式商务</option>
              <option value="tech">技术文档</option>
              <option value="subtitle">视频字幕</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={pasteFromClipboard} style={smBtn}>📋 粘贴</button>
            <button onClick={() => setInput('')} style={smBtn}>清空</button>
          </div>
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="输入文本，自动检测中英文…"
          spellCheck={false}
          style={{
            flex: 1, minHeight: 120,
            padding: 10, borderRadius: 8,
            border: '1px solid var(--border-default)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: 13, fontFamily: 'inherit',
            resize: 'none', outline: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={handleSwap} style={{ ...smBtn, fontSize: 16, padding: '4px 12px' }}>⇅</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
            翻译结果 {loading ? '…' : ''}
          </span>
          <button
            onClick={() => { if (output) window.api.writeClipboardText(output) }}
            disabled={!output}
            style={{ ...smBtn, opacity: output ? 1 : 0.4 }}
          >📋 复制</button>
        </div>
        <textarea
          value={output}
          readOnly
          placeholder="翻译结果…"
          style={{
            flex: 1, minHeight: 120,
            padding: 10, borderRadius: 8,
            border: '1px solid var(--border-default)',
            background: 'var(--bg-secondary)',
            color: output ? 'var(--text-primary)' : 'var(--text-tertiary)',
            fontSize: 13, fontFamily: 'inherit',
            resize: 'none', outline: 'none',
          }}
        />
      </div>
    </ToolWindowShell>
  )
}

const smBtn: React.CSSProperties = {
  border: '1px solid var(--border-default)', borderRadius: 6,
  padding: '3px 10px', fontSize: 11, cursor: 'pointer',
  background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
}

const selStyle: React.CSSProperties = {
  fontSize: 11, padding: '2px 4px', borderRadius: 4,
  border: '1px solid var(--border-default)',
  background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
  cursor: 'pointer',
}
