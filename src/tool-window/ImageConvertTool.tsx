import { useState, useEffect } from 'react'
import { ToolWindowShell } from './ToolWindowShell'

interface FileItem {
  path: string
  name: string
  status: 'pending' | 'processing' | 'done' | 'error' | 'aborted'
  outputFormat?: string
  result?: { outputSize: number }
  error?: string
}

const FORMATS = [
  { value: 'webp', label: 'WebP' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'avif', label: 'AVIF' },
  { value: 'tiff', label: 'TIFF' },
  { value: 'bmp', label: 'BMP' },
]

export function ImageConvertTool() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [targetFormat, setTargetFormat] = useState('webp')
  const [quality, setQuality] = useState(85)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [summary, setSummary] = useState<{ successCount: number; failCount: number } | null>(null)

  // 恢复上次参数
  useEffect(() => {
    window.api.getToolParams('image-convert').then((h: any) => {
      if (h && Object.keys(h).length > 0) { setTargetFormat(h.format ?? 'webp'); setQuality(h.quality ?? 85) }
    })
  }, [])

  // 保存参数
  useEffect(() => {
    window.api.setToolParams('image-convert', { format: targetFormat, quality })
  }, [targetFormat, quality])

  // 剪贴板检测
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const path = await window.api.checkClipboard()
        if (path) {
          setFiles(prev => {
            if (prev.some(f => f.path === path)) return prev
            return [...prev, { path, name: path.split('\\').pop() || 'clipboard.png', status: 'pending' }]
          })
        }
      } catch {}
    }
    window.addEventListener('focus', checkClipboard)
    return () => window.removeEventListener('focus', checkClipboard)
  }, [])

  // 监听进度
  useEffect(() => {
    window.api.onToolProgress((data) => {
      setProgress({ current: data.current, total: data.total })
      setFiles(prev => prev.map(f => {
        if (f.path.endsWith(data.file) || f.name === data.file) {
          return { ...f, status: 'processing' }
        }
        return f
      }))
    })
  }, [])

  const addFiles = (paths: string[]) => {
    const newFiles = paths.map(p => ({
      path: p,
      name: p.split('\\').pop() || p.split('/').pop() || p,
      status: 'pending' as const
    }))
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.path))
      return [...prev, ...newFiles.filter(f => !existing.has(f.path))]
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    addFiles(Array.from(e.dataTransfer.files).map(f => (f as any).path || f.name))
  }

  const handleFileSelect = () => {
    window.api.selectFiles(['jpg', 'jpeg', 'png', 'webp', 'gif', 'tiff', 'avif', 'bmp', 'heic'])
      .then(paths => { if (paths) addFiles(paths) })
  }

  const handleConvert = async () => {
    if (files.length === 0 || processing) return
    setProcessing(true)
    setSummary(null)
    // 标记所有文件为处理中
    setFiles(prev => prev.map(f => ({ ...f, status: 'processing' as const })))

    try {
      const result = await window.api.convertImages({
        files: files.map(f => f.path),
        format: targetFormat,
        quality
      })

      setFiles(prev => prev.map(f => {
        const r = result.results?.find((r: any) => r.input === f.path)
        return r ? {
          ...f,
          status: r.error ? 'error' : 'done',
          outputFormat: targetFormat,
          result: r.error ? undefined : { outputSize: r.outputSize },
          error: r.error
        } : f
      }))
      setSummary({ successCount: result.results?.filter((r: any) => !r.error).length || 0, failCount: result.results?.filter((r: any) => r.error).length || 0 })
    } catch (err: any) {
      console.error(err)
    }
    setProcessing(false)
    setProgress({ current: 0, total: 0 })
  }

  const handleAbort = () => {
    window.api.abortTool('image-convert')
  }

  return (
    <ToolWindowShell title="图片转格式" toolId="image-convert">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={handleFileSelect}
          style={{
            border: '2px dashed var(--border-default)',
            borderRadius: 10, padding: '24px 12px', textAlign: 'center',
            cursor: 'pointer', color: 'var(--text-tertiary)',
            fontSize: 12, background: 'var(--bg-secondary)',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 4 }}>📁</div>
          拖入图片或点击选择
        </div>

        {files.length > 0 && (
          <div style={{ maxHeight: 150, overflowY: 'auto', fontSize: 11 }}>
            {files.map((f, i) => (
              <div key={i}>
                <div style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '4px 8px', borderRadius: f.status === 'processing' ? 0 : 6,
                background: i % 2 === 0 ? 'var(--bg-secondary)' : 'transparent',
                color: f.status === 'error' ? 'var(--color-error)' : f.status === 'done' ? 'var(--color-success)' : 'var(--text-secondary)'
              }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                <span style={{ marginLeft: 8, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {f.status === 'done' ? (
                    <>
                      → {f.outputFormat?.toUpperCase()} ✓
                      <button onClick={() => window.api.copyToClipboard(f.path)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13 }} title="复制到剪贴板">📋</button>
                    </>
                  ) : f.status === 'error' ? f.error : '-'}
                </span>
                </div>
                {f.status === 'processing' && (
                  <div style={{ height: 2, background: 'var(--bg-tertiary)', borderRadius: 1 }}>
                    <div style={{ height: '100%', width: '60%', background: 'var(--color-primary)', borderRadius: 1, animation: 'progressPulse 1s ease-in-out infinite' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, width: 48 }}>转换为</span>
            <select value={targetFormat} onChange={e => setTargetFormat(e.target.value)}
              style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 12 }}>
              {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, width: 48 }}>质量</span>
            <input type="range" min={1} max={100} value={quality}
              onChange={e => setQuality(Number(e.target.value))} style={{ flex: 1 }} />
            <span style={{ fontSize: 12, width: 24, textAlign: 'right' }}>{quality}</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
          {processing ? (
            <button onClick={handleAbort} style={{ ...btnStyle, background: 'var(--color-error)', color: '#fff' }}>中止处理</button>
          ) : (
            <button onClick={() => setFiles([])} disabled={processing} style={btnStyle}>清空</button>
          )}
          {processing && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{progress.current}/{progress.total}</span>}
          <button onClick={handleConvert} disabled={files.length === 0 || processing}
            style={{ ...btnStyle, background: processing ? 'var(--color-error)' : 'var(--color-primary)', color: '#fff', fontWeight: 600 }}>
            {processing ? '处理中…' : `开始转换 (${files.length}张)`}
          </button>
        </div>

        {summary && !processing && (
          <div style={{ background: 'var(--color-primary-light)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--color-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>✅ 共转换 {summary.successCount + summary.failCount} 张，成功 {summary.successCount} 张{summary.failCount > 0 ? '，失败 ' + summary.failCount + ' 张' : ''}</span>
            <button onClick={() => { const first = files.find(f => f.status === 'done'); if (first) window.api.openOutputDir(first.path) }} style={{ ...btnStyle, fontSize: 11 }}>📂 打开目录</button>
          </div>
        )}
      </div>
    </ToolWindowShell>
  )
}

const btnStyle: React.CSSProperties = {
  border: 'none', borderRadius: 6, padding: '6px 16px',
  fontSize: 12, cursor: 'pointer',
  background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
}
