import { useState, useRef, useEffect } from 'react'
import { ToolWindowShell } from './ToolWindowShell'

interface FileItem {
  path: string
  name: string
}

const LANGS = [
  { value: 'chi_sim+eng', label: '中英混合' },
  { value: 'chi_sim', label: '简体中文' },
  { value: 'eng', label: 'English' },
  { value: 'jpn', label: '日本語' },
  { value: 'kor', label: '한국어' },
]

export function OcrTool() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [lang, setLang] = useState('chi_sim+eng')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.api.getToolParams('ocr').then((h: any) => {
      if (h && Object.keys(h).length > 0) {
        if (h.lang) setLang(h.lang)
      }
    })
    // 检测剪贴板图片
    checkClipboard()
  }, [])

  useEffect(() => {
    window.api.setToolParams('ocr', { lang })
  }, [lang])

  const checkClipboard = async () => {
    const path = await window.api.checkClipboard()
    if (path) addFile(path)
  }

  const addFile = (path: string) => {
    setFiles(prev => {
      if (prev.some(f => f.path === path)) return prev
      return [...prev, { path, name: path.split('\\').pop() || 'clipboard.png' }]
    })
    setResult('')
  }

  const handleSelect = () => {
    window.api.selectFiles(['.jpg', '.jpeg', '.png', '.webp', '.bmp']).then((paths: string[]) => {
      if (paths) paths.forEach(addFile)
    })
  }

  const handleOcr = async () => {
    if (files.length === 0) return
    setLoading(true)
    setResult('')
    try {
      const texts: string[] = []
      for (const file of files) {
        const r = await window.api.runOcr(file.path, lang)
        if (r.text.trim()) {
          texts.push(`--- ${file.name} ---\n${r.text.trim()}`)
        } else {
          texts.push(`--- ${file.name} ---\n(未识别到文字)`)
        }
      }
      setResult(texts.join('\n\n'))
    } catch (err: any) {
      setResult(`识别失败: ${err.message || err}`)
    }
    setLoading(false)
  }

  const handleCopy = () => {
    window.api.writeClipboardText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <ToolWindowShell title="图片识字" toolId="ocr">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 操作区 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleSelect} style={btnStyle}>📁 选择图片</button>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>或从剪贴板粘贴</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>语言</span>
          <select
            value={lang}
            onChange={e => setLang(e.target.value)}
            style={{
              padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-default)',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              fontSize: 13, fontFamily: 'inherit',
            }}
          >
            {LANGS.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* 文件列表 */}
        {files.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {files.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px', borderRadius: 6, background: 'var(--bg-secondary)',
                fontSize: 12, color: 'var(--text-secondary)',
              }}>
                <span>🖼 {f.name}</span>
                <button
                  onClick={() => {
                    setFiles(prev => prev.filter((_, j) => j !== i))
                    setResult('')
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-tertiary)', fontSize: 14,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 操作按钮 */}
        <button
          onClick={handleOcr}
          disabled={files.length === 0 || loading}
          style={{
            ...btnStyle,
            background: loading ? 'var(--bg-tertiary)' : 'var(--color-primary)',
            color: loading ? 'var(--text-tertiary)' : '#fff',
            border: 'none', fontWeight: 600,
            opacity: files.length === 0 ? 0.5 : 1,
            cursor: files.length === 0 || loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⏳ 识别中…' : '🔍 开始识别'}
        </button>

        {/* 结果 */}
        {result && (
          <div style={{ position: 'relative' }}>
            <div style={{
              fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)',
              marginBottom: 6,
            }}>
              识别结果
            </div>
            <textarea
              readOnly
              value={result}
              style={{
                width: '100%', height: 200, padding: 10, borderRadius: 8,
                border: '1px solid var(--border-default)',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
                lineHeight: 1.6,
              }}
            />
            <button
              onClick={handleCopy}
              style={{
                position: 'absolute', top: 28, right: 8,
                border: '1px solid var(--border-default)', borderRadius: 6,
                padding: '3px 10px', fontSize: 11, cursor: 'pointer',
                background: 'var(--bg-primary)', color: 'var(--text-secondary)',
              }}
            >
              {copied ? '✓ 已复制' : '📋 复制'}
            </button>
          </div>
        )}

        {!result && !loading && files.length > 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12, padding: 16 }}>
            点击 "开始识别" 提取图片中的文字
          </div>
        )}
      </div>
    </ToolWindowShell>
  )
}

const btnStyle: React.CSSProperties = {
  border: '1px solid var(--border-default)', borderRadius: 8,
  padding: '8px 18px', fontSize: 13, cursor: 'pointer',
  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  fontWeight: 500, transition: 'all var(--transition-fast)',
}
