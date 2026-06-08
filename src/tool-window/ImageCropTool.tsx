import { useState, useRef, useEffect } from 'react'
import { ToolWindowShell } from './ToolWindowShell'

const RATIOS: { name: string; w: number; h: number }[] = [
  { name: '自由', w: 0, h: 0 },
  { name: '原始', w: -1, h: -1 },
  { name: '1:1 方形', w: 1, h: 1 },
  { name: '4:5', w: 4, h: 5 },
  { name: '3:4', w: 3, h: 4 },
  { name: '16:9', w: 16, h: 9 },
  { name: '9:16', w: 9, h: 16 },
  { name: '3:2', w: 3, h: 2 },
  { name: '2:3', w: 2, h: 3 },
]

export function ImageCropTool() {
  const [srcImage, setSrcImage] = useState<HTMLImageElement | null>(null)
  const [fileName, setFileName] = useState('')
  const [originalPath, setOriginalPath] = useState('')
  const [ratioIdx, setRatioIdx] = useState(0)
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 200, h: 200 })
  const [dragging, setDragging] = useState<'none' | 'move' | 'resize' | 'new'>('none')
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, ox: 0, oy: 0, ow: 0, oh: 0 })
  const [resultPath, setResultPath] = useState('')
  const [resultText, setResultText] = useState('')
  const [cropping, setCropping] = useState(false)
  const [canvasCursor, setCanvasCursor] = useState('crosshair')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [imgPos, setImgPos] = useState({ x: 0, y: 0, w: 0, h: 0 })

  const handleLoad = () => {
    window.api.selectFiles(['.jpg', '.jpeg', '.png', '.webp', '.bmp']).then(paths => {
      if (paths?.length) loadImage(paths[0])
    })
  }

  const loadImage = (path: string) => {
    setOriginalPath(path)
    setResultPath('')
    setResultText('')
    const img = new Image()
    img.onload = () => { imgRef.current = img; setSrcImage(img); setFileName(path.split('\\').pop() || 'image.png') }
    window.api.readImageDataUrl(path).then((url: string) => { img.src = url })
  }

  useEffect(() => { if (srcImage) fitImageToCanvas(srcImage) }, [srcImage])

  const fitImageToCanvas = (img: HTMLImageElement) => {
    if (!canvasRef.current) return
    const cw = canvasRef.current.offsetWidth, ch = canvasRef.current.offsetHeight
    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight)
    const iw = img.naturalWidth * scale, ih = img.naturalHeight * scale
    const ix = (cw - iw) / 2, iy = (ch - ih) / 2
    setImgPos({ x: ix, y: iy, w: iw, h: ih })

    let cw2 = iw * 0.8, ch2 = ih * 0.8
    const ratio = RATIOS[ratioIdx]
    if (ratio.w > 0) {
      const r = ratio.w / ratio.h
      if (cw2 / ch2 > r) cw2 = ch2 * r; else ch2 = cw2 / r
    }
    setCrop({ x: ix + (iw - cw2) / 2, y: iy + (ih - ch2) / 2, w: cw2, h: ch2 })
  }

  useEffect(() => { if (srcImage) fitImageToCanvas(srcImage) }, [ratioIdx])

  const clampCrop = (cx: number, cy: number, cw: number, ch: number) => {
    const { x: ix, y: iy, w: iw, h: ih } = imgPos
    if (cx < ix) cx = ix; if (cy < iy) cy = iy
    if (cx + cw > ix + iw) cw = ix + iw - cx
    if (cy + ch > iy + ih) ch = iy + ih - cy
    cw = Math.max(20, cw); ch = Math.max(20, ch)
    const ratio = RATIOS[ratioIdx]
    if (ratio.w > 0 || (ratio.w === -1 && srcImage)) {
      const r = ratio.w > 0 ? ratio.w / ratio.h : srcImage ? srcImage.naturalWidth / srcImage.naturalHeight : 1
      if (cw / ch > r) cw = ch * r; else ch = cw / r
      if (cx + cw > ix + iw) { cw = ix + iw - cx; ch = cw / r }
      if (cy + ch > iy + ih) { ch = iy + ih - cy; cw = ch * r }
    }
    return { x: cx, y: cy, w: Math.max(20, cw), h: Math.max(20, ch) }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !srcImage) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const edge = 8
    const onL = Math.abs(mx - crop.x) < edge && my > crop.y - edge && my < crop.y + crop.h + edge
    const onR = Math.abs(mx - (crop.x + crop.w)) < edge && my > crop.y - edge && my < crop.y + crop.h + edge
    const onT = Math.abs(my - crop.y) < edge && mx > crop.x - edge && mx < crop.x + crop.w + edge
    const onB = Math.abs(my - (crop.y + crop.h)) < edge && mx > crop.x - edge && mx < crop.x + crop.w + edge
    const inside = mx >= crop.x && mx <= crop.x + crop.w && my >= crop.y && my <= crop.y + crop.h
    if (onL || onR || onT || onB) setDragging('resize')
    else if (inside) setDragging('move')
    else { setDragging('new'); setCrop({ x: mx, y: my, w: 0, h: 0 }) }
    setDragStart({ x: mx, y: my, ox: crop.x, oy: crop.y, ow: crop.w, oh: crop.h })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top

    // 更新光标样式
    if (dragging === 'none') {
      const edge = 8
      const onL = Math.abs(mx - crop.x) < edge && my > crop.y - edge && my < crop.y + crop.h + edge
      const onR = Math.abs(mx - (crop.x + crop.w)) < edge && my > crop.y - edge && my < crop.y + crop.h + edge
      const onT = Math.abs(my - crop.y) < edge && mx > crop.x - edge && mx < crop.x + crop.w + edge
      const onB = Math.abs(my - (crop.y + crop.h)) < edge && mx > crop.x - edge && mx < crop.x + crop.w + edge
      const inside = mx >= crop.x && mx <= crop.x + crop.w && my >= crop.y && my <= crop.y + crop.h
      if ((onR && onB)) setCanvasCursor('nwse-resize')
      else if (onR) setCanvasCursor('ew-resize')
      else if (onB) setCanvasCursor('ns-resize')
      else if (inside) setCanvasCursor('move')
      else setCanvasCursor('crosshair')
      return
    }

    if (dragging === 'move') {
      setCrop(clampCrop(dragStart.ox + mx - dragStart.x, dragStart.oy + my - dragStart.y, crop.w, crop.h))
    } else if (dragging === 'resize') {
      const ex = mx - dragStart.x, ey = my - dragStart.y
      let nw = dragStart.ow, nh = dragStart.oh
      const ratio = RATIOS[ratioIdx]
      const locked = ratio.w > 0 || (ratio.w === -1 && srcImage)
      const r = ratio.w > 0 ? ratio.w / ratio.h : (ratio.w === -1 && srcImage) ? srcImage.naturalWidth / srcImage.naturalHeight : 0
      if (locked) {
        if (Math.abs(ex) > Math.abs(ey)) { nw = Math.max(20, dragStart.ow + ex); nh = nw / r }
        else { nh = Math.max(20, dragStart.oh + ey); nw = nh * r }
      } else { nw = Math.max(20, dragStart.ow + ex); nh = Math.max(20, dragStart.oh + ey) }
      setCrop(clampCrop(dragStart.ox, dragStart.oy, nw, nh))
    } else if (dragging === 'new') {
      let nx = Math.min(mx, dragStart.x), ny = Math.min(my, dragStart.y)
      let nw = Math.abs(mx - dragStart.x), nh = Math.abs(my - dragStart.y)
      const ratio = RATIOS[ratioIdx]
      const locked = ratio.w > 0 || (ratio.w === -1 && srcImage)
      const r = ratio.w > 0 ? ratio.w / ratio.h : (ratio.w === -1 && srcImage) ? srcImage.naturalWidth / srcImage.naturalHeight : 0
      if (locked) { if (nw / nh > r) nw = nh * r; else nh = nw / r }
      setCrop(clampCrop(nx < dragStart.x ? dragStart.x - nw : dragStart.x, ny < dragStart.y ? dragStart.y - nh : dragStart.y, nw, nh))
    }
  }

  const handleMouseUp = () => setDragging('none')

  const draw = () => {
    if (!canvasRef.current || !srcImage) return
    const c = canvasRef.current
    const ctx = c.getContext('2d'); if (!ctx) return
    c.width = c.offsetWidth; c.height = c.offsetHeight
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.drawImage(srcImage, imgPos.x, imgPos.y, imgPos.w, imgPos.h)
    // 遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, 0, c.width, crop.y)
    ctx.fillRect(0, crop.y, crop.x, crop.h)
    ctx.fillRect(crop.x + crop.w, crop.y, c.width - crop.x - crop.w, crop.h)
    ctx.fillRect(0, crop.y + crop.h, c.width, c.height - crop.y - crop.h)
    // 裁剪框
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([])
    ctx.strokeRect(crop.x, crop.y, crop.w, crop.h)
    // 九宫格
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4])
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(crop.x + crop.w * i / 3, crop.y); ctx.lineTo(crop.x + crop.w * i / 3, crop.y + crop.h); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(crop.x, crop.y + crop.h * i / 3); ctx.lineTo(crop.x + crop.w, crop.y + crop.h * i / 3); ctx.stroke()
    }
    // 尺寸标注
    if (srcImage) {
      const scale = srcImage.naturalWidth / imgPos.w
      const label = `${Math.round(crop.w * scale)}×${Math.round(crop.h * scale)}`
      ctx.setLineDash([]); ctx.font = '11px monospace'
      const tw = ctx.measureText(label).width
      const lx = crop.x + crop.w / 2 - tw / 2, ly = crop.y + crop.h + 16
      if (ly + 2 < c.height) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(lx - 4, ly - 12, tw + 8, 16)
        ctx.fillStyle = '#fff'; ctx.fillText(label, lx, ly)
      }
    }
  }

  useEffect(() => { draw() }, [srcImage, crop, imgPos])

  const handleCrop = async () => {
    if (!srcImage || cropping) return
    setCropping(true); setResultText('裁剪中…')
    const scale = srcImage.naturalWidth / imgPos.w
    const sx = Math.round((crop.x - imgPos.x) * scale), sy = Math.round((crop.y - imgPos.y) * scale)
    const sw = Math.round(crop.w * scale), sh = Math.round(crop.h * scale)
    const off = document.createElement('canvas'); off.width = sw; off.height = sh
    off.getContext('2d')!.drawImage(srcImage, sx, sy, sw, sh, 0, 0, sw, sh)
    const savedPath = await window.api.saveCropImage(off.toDataURL('image/png'), originalPath)
    setResultPath(savedPath); setResultText(`已保存: ${savedPath.split('\\').pop()}`); setCropping(false)
  }

  const handleDeleteResult = async () => {
    if (resultPath) { await window.api.deleteFile(resultPath); setResultPath(''); setResultText('') }
  }

  const handleCopyResult = async () => {
    if (resultPath) {
      await window.api.copyToClipboard(resultPath)
      setResultText('已复制到剪贴板')
      setTimeout(() => setResultText(`已保存: ${resultPath.split('\\').pop()}`), 2000)
    }
  }

  return (
    <ToolWindowShell title="图片裁剪" toolId="image-crop">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6 }}>

        {/* 工具栏 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={handleLoad} style={smBtn}>{srcImage ? '🖼 更换' : '📁 选择图片'}</button>
          <select value={ratioIdx} onChange={e => setRatioIdx(Number(e.target.value))} style={{ ...selStyle, flex: 1 }}>
            {RATIOS.map((r, i) => <option key={i} value={i}>{r.name}</option>)}
          </select>
          <button onClick={handleCrop} disabled={!srcImage || cropping} style={{
            ...primaryBtn, opacity: (!srcImage || cropping) ? 0.5 : 1, cursor: (!srcImage || cropping) ? 'not-allowed' : 'pointer',
          }}>{cropping ? '裁剪中…' : '✂️ 裁剪'}</button>
        </div>

        {/* Canvas */}
        {srcImage ? (
          <div style={{ flex: 1, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-default)', background: 'var(--bg-tertiary)', minHeight: 0 }}>
            <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
              style={{ width: '100%', height: '100%', cursor: dragging !== 'none' ? 'grabbing' : canvasCursor, display: 'block' }} />
          </div>
        ) : (
          <div onClick={handleLoad} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            border: '2px dashed var(--border-default)', borderRadius: 10, cursor: 'pointer',
            color: 'var(--text-tertiary)', fontSize: 13, gap: 8,
          }}>
            <span style={{ fontSize: 36 }}>🖼️</span>
            <span>选择图片或拖放到窗口</span>
          </div>
        )}

        {/* 结果栏 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px', borderRadius: 8, background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)', gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: resultPath ? 'var(--text-secondary)' : 'var(--text-tertiary)', flex: 1 }}>
            {resultPath ? resultText : '选择图片并调整裁剪框后点击裁剪'}
          </span>
          <button onClick={handleCopyResult} disabled={!resultPath}
            style={{ ...smBtn, visibility: resultPath ? 'visible' : 'hidden' }}>📋 复制</button>
          <button onClick={handleDeleteResult} disabled={!resultPath}
            style={{ ...smBtn, color: '#dc2626', visibility: resultPath ? 'visible' : 'hidden' }}>✕ 删除</button>
        </div>
      </div>
    </ToolWindowShell>
  )
}

const smBtn: React.CSSProperties = { border: '1px solid var(--border-default)', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }
const selStyle: React.CSSProperties = { padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit' }
const primaryBtn: React.CSSProperties = { padding: '5px 14px', borderRadius: 6, border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
