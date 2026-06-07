import { useState, useRef, useEffect } from 'react'
import { ToolWindowShell } from './ToolWindowShell'
import QRCode from 'qrcode'

export function QrcodeTool() {
  const [text, setText] = useState('')
  const [size, setSize] = useState(256)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasQR, setHasQR] = useState(false)

  useEffect(() => {
    window.api.getToolParams('qrcode').then((h: any) => {
      if (h && Object.keys(h).length > 0) {
        if (h.text) setText(h.text)
        if (h.size) setSize(h.size)
      }
    })

    // 尝试读取剪贴板文本
    window.api.readClipboardText().then((t: string) => {
      if (t && t.trim()) setText(t.trim())
    })
  }, [])

  useEffect(() => {
    window.api.setToolParams('qrcode', { text, size })
  }, [text, size])

  useEffect(() => {
    if (!text.trim() || !canvasRef.current) { setHasQR(false); return }
    QRCode.toCanvas(canvasRef.current, text, {
      width: size,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(() => setHasQR(true)).catch(() => setHasQR(false))
  }, [text, size])

  const handleCopy = () => {
    if (!canvasRef.current) return
    canvasRef.current.toBlob(blob => {
      if (!blob) return
      // 通过 clipboard API 复制图片
      const item = new ClipboardItem({ 'image/png': blob })
      navigator.clipboard.write([item]).catch(() => {})
    })
  }

  const handleSave = () => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `qrcode-${Date.now()}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  return (
    <ToolWindowShell title="二维码生成" toolId="qrcode">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="输入文本或网址…"
          style={{
            width: '100%', height: 60, padding: '10px 12px', borderRadius: 8,
            border: '1px solid var(--border-default)', background: 'var(--bg-secondary)',
            color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit',
            resize: 'none', outline: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>尺寸</span>
          <input
            type="range" min={128} max={512} step={32} value={size}
            onChange={e => setSize(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', minWidth: 40 }}>{size}px</span>
        </div>

        <div style={{
          width: size, height: size, minHeight: size,
          background: '#fff', borderRadius: 8, border: '1px solid var(--border-default)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          <canvas ref={canvasRef} style={{ display: hasQR ? 'block' : 'none' }} />
          {!hasQR && (
            <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
              {text.trim() ? '生成中…' : '输入内容生成二维码'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleCopy}
            disabled={!hasQR}
            style={{ ...btnStyle, opacity: hasQR ? 1 : 0.4 }}
          >
            📋 复制图片
          </button>
          <button
            onClick={handleSave}
            disabled={!hasQR}
            style={{ ...btnStyle, opacity: hasQR ? 1 : 0.4 }}
          >
            💾 保存 PNG
          </button>
        </div>
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
