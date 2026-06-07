import { useState, useRef, useEffect } from 'react'
import { ToolWindowShell } from './ToolWindowShell'

interface FileItem {
  path: string
  name: string
  size: number
  status: 'pending' | 'processing' | 'done' | 'error' | 'aborted'
  result?: { outputSize: number; saved: number }
  error?: string
}

export function ImageCompressTool() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [quality, setQuality] = useState(80)
  const [mode, setMode] = useState<'smart' | 'lossy' | 'lossless'>('smart')
  const [useTargetSize, setUseTargetSize] = useState(false)
  const [targetSizeMB, setTargetSizeMB] = useState(2)
  const [progressive, setProgressive] = useState(false)
  const [stripExif, setStripExif] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [hasGif, setHasGif] = useState(false)
  const [summary, setSummary] = useState<{ successCount: number; failCount: number; totalSaved: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 恢复上次参数
  useEffect(() => {
    window.api.getToolParams('image-compress').then((h: any) => {
      if (h && Object.keys(h).length > 0) {
        setQuality(h.quality ?? 80)
        setMode(h.mode ?? 'smart')
        setProgressive(h.progressive ?? false)
        setStripExif(h.stripExif ?? true)
        setUseTargetSize(h.useTargetSize ?? false)
        setTargetSizeMB(h.targetSizeMB ?? 2)
      }
    })
  }, [])

  // 保存参数
  useEffect(() => {
    window.api.setToolParams('image-compress', { quality, mode, progressive, stripExif, useTargetSize, targetSizeMB })
  }, [quality, mode, progressive, stripExif, useTargetSize, targetSizeMB])

  // 检测剪贴板
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const path = await window.api.checkClipboard()
        if (path) {
          // 去重检查
          setFiles(prev => {
            if (prev.some(f => f.path === path)) return prev
            return [...prev, { path, name: path.split('\\').pop() || 'clipboard.png', size: 0, status: 'pending' }]
          })
        }
      } catch {}
    }
    window.addEventListener('focus', checkClipboard)
    return () => window.removeEventListener('focus', checkClipboard)
  }, [])

  const addFiles = (paths: string[]) => {
    const newFiles = paths.map(p => ({
      path: p,
      name: p.split('\\').pop() || p.split('/').pop() || p,
      size: 0,
      status: 'pending' as const
    }))
    setFiles(prev => {
      // 去重
      const existing = new Set(prev.map(f => f.path))
      const unique = newFiles.filter(f => !existing.has(f.path))
      return [...prev, ...unique]
    })
    // 检测GIF
    if (newFiles.some(f => f.name.toLowerCase().endsWith('.gif'))) {
      setHasGif(true)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const paths = Array.from(e.dataTransfer.files).map(f => (f as any).path || f.name)
    addFiles(paths)
  }

  const handleFileSelect = () => {
    window.api.selectFiles(['jpg', 'jpeg', 'png', 'webp', 'gif', 'tiff', 'avif', 'heic'])
      .then(paths => { if (paths) addFiles(paths) })
  }

  const handleProcess = async () => {
    if (files.length === 0 || processing) return
    setProcessing(true)
    setSummary(null)

    const filePaths = files.map(f => f.path)
    try {
      const result = await window.api.compressImages({
        files: filePaths,
        options: { quality, mode, progressive, stripExif, pngLevel: 6, pngPalette: true, resize: false,
          targetSize: useTargetSize ? targetSizeMB * 1024 * 1024 : undefined
        }
      })

      setFiles(prev => prev.map(f => {
        const r = result.results?.find((r: any) => r.input === f.path)
        return r ? {
          ...f,
          status: r.error ? 'error' : 'done',
          result: r.error ? undefined : { outputSize: r.outputSize, saved: r.originalSize - r.outputSize },
          error: r.error
        } : f
      }))
      setSummary({ successCount: result.results?.filter((r: any) => !r.error).length || 0, failCount: result.results?.filter((r: any) => r.error).length || 0, totalSaved: result.totalSaved || 0 })
    } catch (err: any) {
      console.error(err)
    }
    setProcessing(false)
    setProgress({ current: 0, total: 0 })
  }

  // 监听进度
  useEffect(() => {
    window.api.onToolProgress((data) => {
      setProgress({ current: data.current, total: data.total })
      setFiles(prev => prev.map((f, i) => {
        if (f.path.endsWith(data.file) || f.name === data.file) {
          return { ...f, status: 'processing', size: 0 }
        }
        return f
      }))
    })
  }, [])

  const handleAbort = () => {
    window.api.abortTool('image-compress')
    // 主进程会在当前文件完成后停止
  }

  const clearFiles = () => { setFiles([]); setHasGif(false) }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <ToolWindowShell title="图片压缩" toolId="image-compress">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 拖放区 */}
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={handleFileSelect}
          style={{
            border: '2px dashed var(--border-default)',
            borderRadius: 10,
            padding: '24px 12px',
            textAlign: 'center',
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
            fontSize: 12,
            background: 'var(--bg-secondary)',
            transition: 'background 80ms ease',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 4 }}>📁</div>
          <div>拖入图片或点击选择</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>支持 JPG PNG WebP GIF TIFF AVIF HEIC</div>
        </div>

        {/* GIF 提示 */}
        {hasGif && (
          <div style={{
            background: '#FAEEDA',
            color: '#854F0B',
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 12,
            border: '1px solid #854F0B'
          }}>
            ⚠️ GIF 将转为 WebP 动图（保留动画帧），不支持有损压缩
          </div>
        )}

        {/* 文件列表 */}
        {files.length > 0 && (
          <div style={{ maxHeight: 150, overflowY: 'auto', fontSize: 11 }}>
            {files.map((f, i) => (
              <div key={i}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 8px',
                  borderRadius: f.status === 'processing' ? 0 : 6,
                  background: i % 2 === 0 ? 'var(--bg-secondary)' : 'transparent',
                  color: f.status === 'error' ? 'var(--color-error)' : f.status === 'done' ? 'var(--color-success)' : 'var(--text-secondary)'
                }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {f.name.endsWith('.gif') ? '🎞️ ' : ''}{f.name}
                </span>
                <span style={{ marginLeft: 8, whiteSpace: 'nowrap' }}>
                  {f.status === 'done' && f.result
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        节省 {formatSize(f.result.saved)}
                        <button onClick={() => window.api.copyToClipboard(f.path)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13 }} title="复制到剪贴板">📋</button>
                      </span>
                    : f.status === 'error' ? f.error
                    : f.status === 'processing' ? '处理中…'
                    : formatSize(f.size)
                  }
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

        {/* 参数配置 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, width: 40 }}>质量</span>
            <input type="range" min={1} max={100} value={quality}
              onChange={e => setQuality(Number(e.target.value))}
              disabled={useTargetSize}
              style={{ flex: 1, opacity: useTargetSize ? 0.4 : 1 }} />
            <span style={{ fontSize: 12, width: 24, textAlign: 'right' }}>{useTargetSize ? '-' : quality}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={useTargetSize} onChange={e => setUseTargetSize(e.target.checked)} />
              限制大小
            </label>
            {useTargetSize && (
              <>
                <input type="number" min={0.1} max={50} step={0.1} value={targetSizeMB}
                  onChange={e => setTargetSizeMB(Number(e.target.value))}
                  style={{ width: 60, padding: '2px 6px', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 12 }} />
                <span style={{ fontSize: 12 }}>MB</span>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
            <label><input type="radio" name="mode" checked={mode === 'smart'} onChange={() => setMode('smart')} /> 智能</label>
            <label><input type="radio" name="mode" checked={mode === 'lossy'} onChange={() => setMode('lossy')} /> 有损</label>
            <label><input type="radio" name="mode" checked={mode === 'lossless'} onChange={() => setMode('lossless')} /> 无损</label>
          </div>

          <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
            <label><input type="checkbox" checked={stripExif} onChange={e => setStripExif(e.target.checked)} /> 去除EXIF</label>
            <label><input type="checkbox" checked={progressive} onChange={e => setProgressive(e.target.checked)} /> 渐进式JPEG</label>
          </div>
        </div>

        {/* 操作栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
          {processing ? (
            <button onClick={handleAbort} style={{ ...btnStyle, background: 'var(--color-error)', color: '#fff' }}>
              中止处理
            </button>
          ) : (
            <button onClick={clearFiles} disabled={processing} style={btnStyle}>清空</button>
          )}
          {processing && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{progress.current}/{progress.total}</span>}
          <button
            onClick={handleProcess}
            disabled={files.length === 0 || processing}
            style={{
              ...btnStyle,
              background: processing ? 'var(--color-error)' : 'var(--color-primary)',
              color: '#fff', fontWeight: 600
            }}
          >
            {processing ? '处理中…' : `开始压缩 (${files.length}张)`}
          </button>
        </div>

        {/* 处理摘要 */}
        {summary && !processing && (
          <div style={{
            background: 'var(--color-primary-light)',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 12,
            color: 'var(--color-primary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>✅ 共处理 {summary.successCount + summary.failCount} 张，成功 {summary.successCount} 张，节省 {formatSize(summary.totalSaved)}</span>
            <button onClick={() => {
              const first = files.find(f => f.status === 'done')
              if (first) window.api.openOutputDir(first.path)
            }} style={{ ...btnStyle, fontSize: 11 }}>
              📂 打开目录
            </button>
          </div>
        )}
      </div>
    </ToolWindowShell>
  )
}

const btnStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 6,
  padding: '6px 16px',
  fontSize: 12,
  cursor: 'pointer',
  background: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
}
