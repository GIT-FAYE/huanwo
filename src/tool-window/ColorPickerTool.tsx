import { useState, useEffect, useRef } from 'react'
import { ToolWindowShell } from './ToolWindowShell'

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('')
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export function ColorPickerTool() {
  const [hexInput, setHexInput] = useState('#6366F1')
  const [rgb, setRgb] = useState({ r: 99, g: 102, b: 241 })
  const [hsl, setHsl] = useState({ h: 238, s: 83, l: 67 })
  const [copied, setCopied] = useState('')
  const [picking, setPicking] = useState(false)
  const [screenImage, setScreenImage] = useState<string | null>(null)
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const magRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })

  const hex = rgbToHex(rgb.r, rgb.g, rgb.b)

  const setColor = (h: string) => {
    const c = hexToRgb(h.toLowerCase())
    setRgb(c)
    setHsl(rgbToHsl(c.r, c.g, c.b))
    setHexInput(h.toLowerCase())
    window.api.setToolParams('color-picker', { hex: h.toLowerCase() })
  }

  useEffect(() => {
    window.api.getToolParams('color-picker').then((h: any) => {
      if (h && Object.keys(h).length > 0 && h.hex) setColor(h.hex)
    })
  }, [])

  const handleStartPick = () => {
    if (picking) return
    window.api.captureScreen().then((dataUrl: string | null) => {
      if (dataUrl) {
        setScreenImage(dataUrl)
        setPicking(true)
        setZoom(1)
        setOffset({ x: 0, y: 0 })
      }
    })
  }

  // 等比例缩放绘制
  const drawCanvas = () => {
    if (!canvasRef.current || !imgRef.current) return
    const canvas = canvasRef.current
    const img = imgRef.current
    const cw = canvas.offsetWidth
    const ch = canvas.offsetHeight

    // 等比例适配
    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight)
    const iw = img.naturalWidth * scale * zoom
    const ih = img.naturalHeight * scale * zoom
    const ox = (cw - iw) / 2 + offset.x
    const oy = (ch - ih) / 2 + offset.y

    canvas.width = cw
    canvas.height = ch
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, cw, ch)
    ctx.drawImage(img, ox, oy, iw, ih)
  }

  useEffect(() => {
    if (!screenImage || !canvasRef.current) return
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
      // 等待布局完成再绘制
      requestAnimationFrame(() => drawCanvas())
    }
    img.src = screenImage
  }, [screenImage])

  useEffect(() => {
    if (picking) requestAnimationFrame(() => drawCanvas())
  }, [zoom, offset, picking])

  // 窗口大小变化时重绘
  useEffect(() => {
    if (!picking) return
    const onResize = () => requestAnimationFrame(() => drawCanvas())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [picking])

  // 获取 Canvas 坐标对应的原始图片像素坐标
  const getImagePixelCoord = (canvasX: number, canvasY: number) => {
    if (!canvasRef.current || !imgRef.current) return null
    const canvas = canvasRef.current
    const img = imgRef.current
    const cw = canvas.offsetWidth
    const ch = canvas.offsetHeight

    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight)
    const iw = img.naturalWidth * scale * zoom
    const ih = img.naturalHeight * scale * zoom
    const ox = (cw - iw) / 2 + offset.x
    const oy = (ch - ih) / 2 + offset.y

    const imgX = (canvasX - ox) / iw * img.naturalWidth
    const imgY = (canvasY - oy) / ih * img.naturalHeight
    return { x: Math.floor(imgX), y: Math.floor(imgY) }
  }

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!picking || !canvasRef.current || !imgRef.current) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    setPickerPos({ x: cx, y: cy })

    // 从原始图片读取像素
    const coord = getImagePixelCoord(cx, cy)
    if (!coord || coord.x < 0 || coord.y < 0 || coord.x >= imgRef.current.naturalWidth || coord.y >= imgRef.current.naturalHeight) return

    let offCanvas = (imgRef.current as any)._ocrOffCanvas
    if (!offCanvas) {
      offCanvas = document.createElement('canvas')
      offCanvas.width = imgRef.current.naturalWidth
      offCanvas.height = imgRef.current.naturalHeight
      const offCtx = offCanvas.getContext('2d')!
      offCtx.drawImage(imgRef.current, 0, 0)
      ;(imgRef.current as any)._ocrOffCanvas = offCanvas
    }
    const offCtx = offCanvas.getContext('2d')!
    const pixel = offCtx.getImageData(coord.x, coord.y, 1, 1).data
    setColor(rgbToHex(pixel[0], pixel[1], pixel[2]))

    // 更新放大镜
    if (magRef.current) {
      const mag = magRef.current
      mag.width = 50; mag.height = 50
      const mctx = mag.getContext('2d')
      if (!mctx) return
      const r = 5
      const sx = Math.max(0, coord.x - r)
      const sy = Math.max(0, coord.y - r)
      const sw = Math.min(r * 2, imgRef.current.naturalWidth - sx)
      const sh = Math.min(r * 2, imgRef.current.naturalHeight - sy)
      mctx.imageSmoothingEnabled = false
      mctx.drawImage(offCanvas, sx, sy, sw, sh, 0, 0, 50, 50)
      // 中心十字
      mctx.strokeStyle = '#fff'
      mctx.lineWidth = 1
      mctx.beginPath(); mctx.moveTo(25, 0); mctx.lineTo(25, 50); mctx.stroke()
      mctx.beginPath(); mctx.moveTo(0, 25); mctx.lineTo(50, 25); mctx.stroke()
    }
  }

  const handleCanvasClick = () => {
    if (!picking) return
    setPicking(false)
    setScreenImage(null)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (!canvasRef.current || !imgRef.current) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top

    const delta = e.deltaY > 0 ? -0.15 : 0.15
    const newZoom = Math.max(1, Math.min(8, zoom + delta))

    const cw = canvas.offsetWidth
    const ch = canvas.offsetHeight
    const img = imgRef.current
    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight)

    // 当前缩放下的图像参数
    const oldIw = img.naturalWidth * scale * zoom
    const oldIh = img.naturalHeight * scale * zoom
    const oldOx = (cw - oldIw) / 2 + offset.x
    const oldOy = (ch - oldIh) / 2 + offset.y

    // 光标在图像上的归一化坐标 (0~1)
    const nx = (cx - oldOx) / oldIw
    const ny = (cy - oldOy) / oldIh

    // 新缩放下的图像参数
    const newIw = img.naturalWidth * scale * newZoom
    const newIh = img.naturalHeight * scale * newZoom

    // 计算新偏移量，使光标位置对应的图像点不变
    const newOx = cx - nx * newIw
    const newOy = cy - ny * newIh
    const newOffsetX = newOx - (cw - newIw) / 2
    const newOffsetY = newOy - (ch - newIh) / 2

    setZoom(newZoom)
    setOffset({ x: newOffsetX, y: newOffsetY })
  }

  const updateFromHex = (value: string) => {
    setHexInput(value)
    if (/^#[0-9a-fA-F]{6}$/.test(value)) setColor(value)
  }

  const copy = (value: string, label: string) => {
    window.api.writeClipboardText(value)
    setCopied(label)
    setTimeout(() => setCopied(''), 1500)
  }

  return (
    <ToolWindowShell title="屏幕取色" toolId="color-picker">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
        {picking && screenImage ? (
          <div style={{ position: 'relative', cursor: 'crosshair', borderRadius: 10, overflow: 'hidden', border: '2px solid var(--border-focus)', flex: 1 }}>
            <canvas ref={canvasRef} onMouseMove={handleCanvasMove} onClick={handleCanvasClick} onWheel={handleWheel}
              style={{ width: '100%', height: '100%', display: 'block' }} />
            <div style={{
              position: 'absolute', top: 6, left: 6, padding: '2px 8px', borderRadius: 6,
              background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10,
            }}>
              移动取样 · 滚轮缩放({Math.round(zoom * 100)}%) · 点击确认
            </div>
            {/* 取样点指示器 */}
            <div style={{
              position: 'absolute', left: pickerPos.x, top: pickerPos.y,
              width: 14, height: 14, borderRadius: '50%', border: '2px solid #fff',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.4)', pointerEvents: 'none',
              background: hex, transform: 'translate(-50%, -50%)',
            }} />
            {/* 放大预览 */}
            <div style={{
              position: 'absolute', bottom: 6, right: 6, width: 50, height: 50,
              borderRadius: 6, border: '2px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
              background: hex, overflow: 'hidden',
            }}>
              <canvas ref={magRef} style={{ width: 50, height: 50, imageRendering: 'pixelated' }} />
            </div>
          </div>
        ) : (
          <button onClick={handleStartPick} style={{
            flex: 1, borderRadius: 10, border: '2px dashed var(--border-default)',
            background: 'var(--bg-secondary)', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 32 }}>💉</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>点击截取屏幕，然后移动鼠标取色</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>滚轮缩放 · 点击确认</span>
          </button>
        )}

        {/* 颜色预览 */}
        <div style={{
          width: '100%', height: 36, borderRadius: 8, flexShrink: 0,
          background: hex, border: '1px solid var(--border-default)',
        }} />

        {/* 色值 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <div style={rowStyle}>
            <span style={labelStyle}>HEX</span>
            <input value={hexInput} onChange={e => updateFromHex(e.target.value)}
              style={{ ...inputStyle, fontFamily: 'monospace', flex: 1 }} />
            <button onClick={() => copy(hex, 'HEX')} style={copyBtn}>{copied === 'HEX' ? '✓' : '复制'}</button>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>RGB</span>
            <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-primary)', flex: 1 }}>{rgb.r}, {rgb.g}, {rgb.b}</span>
            <button onClick={() => copy(`${rgb.r}, ${rgb.g}, ${rgb.b}`, 'RGB')} style={copyBtn}>{copied === 'RGB' ? '✓' : '复制'}</button>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>HSL</span>
            <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-primary)', flex: 1 }}>{hsl.h}°, {hsl.s}%, {hsl.l}%</span>
            <button onClick={() => copy(`${hsl.h}°, ${hsl.s}%, ${hsl.l}%`, 'HSL')} style={copyBtn}>{copied === 'HSL' ? '✓' : '复制'}</button>
          </div>
        </div>
      </div>
    </ToolWindowShell>
  )
}

const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', width: 32 }
const inputStyle: React.CSSProperties = { padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }
const copyBtn: React.CSSProperties = { border: '1px solid var(--border-default)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 500, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', minWidth: 44 }
