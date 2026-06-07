import { useState, useRef, useEffect } from 'react'
import { ToolWindowShell } from './ToolWindowShell'

interface FileItem {
  path: string
  name: string
  dataUrl?: string
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
  const [previewIndex, setPreviewIndex] = useState(0)

  useEffect(() => {
    window.api.getToolParams('ocr').then((h: any) => {
      if (h && Object.keys(h).length > 0) {
        if (h.lang) setLang(h.lang)
      }
    })
    checkClipboard()
  }, [])

  useEffect(() => {
    window.api.setToolParams('ocr', { lang })
  }, [lang])

  const checkClipboard = async () => {
    const path = await window.api.checkClipboard()
    if (path) addFile(path)
  }

  const addFile = async (path: string) => {
    setFiles(prev => {
      if (prev.some(f => f.path === path)) return prev
      return [...prev, { path, name: path.split('\\').pop() || 'clipboard.png' }]
    })
    setResult('')
    // 加载预览图
    const dataUrl = await window.api.readImageDataUrl(path)
    setFiles(prev => prev.map(f => f.path === path ? { ...f, dataUrl } : f))
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

  const removeFile = (i: number) => {
    setFiles(prev => prev.filter((_, j) => j !== i))
    if (previewIndex >= files.length - 1) setPreviewIndex(Math.max(0, files.length - 2))
    setResult('')
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
          {files.length > 1 && (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {previewIndex + 1} / {files.length}
            </span>
          )}
        </div>

        {/* 图片预览 */}
        {files.length > 0 && (
          <div style={{
            width: '100%', height: 200, borderRadius: 8, border: '1px solid var(--border-default)',
            background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', overflow: 'hidden', position: 'relative',
          }}>
            {files[previewIndex]?.dataUrl ? (
              <img
                src={files[previewIndex].dataUrl}
                alt={files[previewIndex].name}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : (
              <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>加载中…</span>
            )}

            {/* 多图切换按钮 */}
            {files.length > 1 && (
              <>
                <button
                  onClick={() => setPreviewIndex(i => (i - 1 + files.length) % files.length)}
                  style={navBtnStyle('left')}
                >◀</button>
                <button
                  onClick={() => setPreviewIndex(i => (i + 1) % files.length)}
                  style={navBtnStyle('right')}
                >▶</button>
              </>
            )}
          </div>
        )}

        {/* 文件缩略图列表 */}
        {files.length > 0 && (
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
            {files.map((f, i) => (
              <div
                key={i}
                onClick={() => setPreviewIndex(i)}
                style={{
                  width: 40, height: 40, borderRadius: 4, cursor: 'pointer',
                  border: i === previewIndex ? '2px solid var(--color-primary)' : '2px solid transparent',
                  overflow: 'hidden', flexShrink: 0, position: 'relative',
                  background: 'var(--bg-tertiary)',
                }}
              >
                {f.dataUrl && (
                  <img src={f.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <button
                  onClick={e => { e.stopPropagation(); removeFile(i) }}
                  style={{
                    position: 'absolute', top: -2, right: -2,
                    width: 14, height: 14, borderRadius: '50%',
                    background: 'var(--color-error, #dc2626)', color: '#fff',
                    border: 'none', fontSize: 8, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {/* 识别按钮 */}
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
                width: '100%', height: 160, padding: 10, borderRadius: 8,
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
      </div>
    </ToolWindowShell>
  )
}

const navBtnStyle = (side: 'left' | 'right'): React.CSSProperties => ({
  position: 'absolute',
  [side]: 4, top: '50%', transform: 'translateY(-50%)',
  width: 24, height: 24, borderRadius: '50%',
  background: 'rgba(0,0,0,0.4)', color: '#fff',
  border: 'none', fontSize: 10, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
})

const btnStyle: React.CSSProperties = {
  border: '1px solid var(--border-default)', borderRadius: 8,
  padding: '8px 18px', fontSize: 13, cursor: 'pointer',
  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  fontWeight: 500, transition: 'all var(--transition-fast)',
}
