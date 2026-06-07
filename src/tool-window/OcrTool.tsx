import { useState, useEffect } from 'react'
import { ToolWindowShell } from './ToolWindowShell'

interface FileItem {
  path: string
  name: string
  dataUrl?: string
}

const PROVIDER_NAMES: Record<string, string> = {
  qwen: '千问', deepseek: 'DeepSeek', mimo: 'MiMo',
}

export function OcrTool() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [provider, setProvider] = useState('qwen')
  const [ocrProgress, setOcrProgress] = useState({ current: 0, total: 0 })

  useEffect(() => {
    window.api.getConfig('activeProvider').then((v: any) => setProvider(v || 'qwen'))
    window.api.checkClipboard().then((path: string | null) => {
      if (path) addFile(path)
    })
  }, [])

  const addFile = async (path: string) => {
    const name = path.split('\\').pop() || 'image.png'
    let dataUrl = ''
    try { dataUrl = await window.api.readImageDataUrl(path) } catch {}
    setFiles(prev => {
      if (prev.some(f => f.path === path)) return prev
      return [...prev, { path, name, dataUrl }]
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
    setOcrProgress({ current: 0, total: files.length })
    try {
      const texts: string[] = []
      for (let i = 0; i < files.length; i++) {
        const r = await window.api.runOcr(files[i].path)
        if (r.text.trim()) texts.push(r.text.trim())
        setOcrProgress({ current: i + 1, total: files.length })
      }
      if (texts.length === 0) {
        setResult('未识别到文字')
      } else {
        setResult(files.length > 1 ? texts.join('\n\n') : texts[0])
      }
    } catch (err: any) {
      setResult(`识别失败: ${err.message || err}`)
    }
    setLoading(false)
  }

  const removeFile = (i: number) => {
    setFiles(prev => prev.filter((_, j) => j !== i))
    if (previewIndex >= files.length - 1) setPreviewIndex(Math.max(0, files.length - 2))
    setResult('')
  }

  return (
    <ToolWindowShell title="图片识字" toolId="ocr">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleSelect} style={primaryBtn}>📁 选择图片</button>
          {files.length > 1 && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{previewIndex + 1} / {files.length}</span>}
          <button onClick={handleOcr} disabled={files.length === 0 || loading} style={{
            ...primaryBtn, marginLeft: 'auto',
            background: files.length === 0 ? 'var(--bg-tertiary)' : loading ? 'var(--bg-tertiary)' : 'var(--color-primary)',
            color: files.length === 0 ? 'var(--text-tertiary)' : loading ? 'var(--text-tertiary)' : '#fff',
            cursor: files.length === 0 || loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? '⏳ 识别中…' : '🔍 开始识别'}
          </button>
        </div>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2, background: 'var(--color-primary)',
                width: `${ocrProgress.total > 0 ? (ocrProgress.current / ocrProgress.total) * 100 : 0}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
              {ocrProgress.current}/{ocrProgress.total}
            </span>
          </div>
        )}

        {files.length > 0 ? (
          <>
            <div style={previewBox}>
              {files[previewIndex]?.dataUrl && (
                <img src={files[previewIndex].dataUrl} alt="" style={previewImg} />
              )}
              {files.length > 1 && (
                <>
                  <button onClick={() => setPreviewIndex(i => (i - 1 + files.length) % files.length)} style={navBtn('left')}>◀</button>
                  <button onClick={() => setPreviewIndex(i => (i + 1) % files.length)} style={navBtn('right')}>▶</button>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flexShrink: 0 }}>
              {files.map((f, i) => (
                <div key={i} onClick={() => setPreviewIndex(i)} style={{
                  width: 36, height: 36, borderRadius: 4, cursor: 'pointer', flexShrink: 0,
                  border: i === previewIndex ? '2px solid var(--color-primary)' : '2px solid transparent',
                  overflow: 'hidden', position: 'relative', background: 'var(--bg-tertiary)',
                }}>
                  {f.dataUrl && <img src={f.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  <button onClick={e => { e.stopPropagation(); removeFile(i) }} style={delBtn}>✕</button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div onClick={handleSelect} style={emptyBox}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>📁</div>
            <div>点击选择图片，或先在别处复制图片后打开此工具</div>
          </div>
        )}

        {result && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)' }}>
                由 {PROVIDER_NAMES[provider] || provider} AI 输出识别结果
              </span>
              <button
                onClick={() => { window.api.writeClipboardText(result); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                style={copyBtn}
              >{copied ? '✓ 已复制' : '📋 复制'}</button>
            </div>
            <textarea readOnly value={result} style={resultBox} />
          </div>
        )}
      </div>
    </ToolWindowShell>
  )
}

const selStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-default)',
  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  fontSize: 13, fontFamily: 'inherit',
}
const primaryBtn: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
  border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap',
}
const previewBox: React.CSSProperties = {
  width: '100%', height: 140, borderRadius: 8, flexShrink: 0,
  border: '1px solid var(--border-default)', background: 'var(--bg-tertiary)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  overflow: 'hidden', position: 'relative',
}
const previewImg: React.CSSProperties = { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }
const navBtn = (side: 'left' | 'right'): React.CSSProperties => ({
  position: 'absolute', [side]: 4, top: '50%', transform: 'translateY(-50%)',
  width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.4)',
  color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
})
const delBtn: React.CSSProperties = {
  position: 'absolute', top: -1, right: -1, width: 13, height: 13,
  borderRadius: '50%', background: 'var(--color-error, #dc2626)', color: '#fff',
  border: 'none', fontSize: 7, cursor: 'pointer', lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const emptyBox: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', border: '2px dashed var(--border-default)',
  borderRadius: 10, background: 'var(--bg-secondary)',
  color: 'var(--text-tertiary)', fontSize: 12, cursor: 'pointer',
}
const copyBtn: React.CSSProperties = {
  border: '1px solid var(--border-default)', borderRadius: 6,
  padding: '3px 10px', fontSize: 11, cursor: 'pointer',
  background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
}
const resultBox: React.CSSProperties = {
  flex: 1, width: '100%', padding: 10, borderRadius: 8,
  border: '1px solid var(--border-default)', resize: 'none',
  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6,
}
