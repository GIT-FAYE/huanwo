import { useState, useRef, useEffect } from 'react'
import { ToolWindowShell } from './ToolWindowShell'

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
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

function hslToRgb(h: number, s: number, l: number) {
  s /= 100; l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else { r = c; b = x }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

export function ColorPickerTool() {
  const [hexInput, setHexInput] = useState('#6366F1')
  const [rgb, setRgb] = useState({ r: 99, g: 102, b: 241 })
  const [hsl, setHsl] = useState({ h: 238, s: 83, l: 67 })
  const [copied, setCopied] = useState('')

  const hex = rgbToHex(rgb.r, rgb.g, rgb.b)

  useEffect(() => {
    window.api.getToolParams('color-picker').then((h: any) => {
      if (h && Object.keys(h).length > 0 && h.hex) {
        const c = hexToRgb(h.hex)
        setRgb(c)
        setHexInput(h.hex)
      }
    })
  }, [])

  const updateFromHex = (value: string) => {
    setHexInput(value)
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      const c = hexToRgb(value.toLowerCase())
      setRgb(c)
      setHsl(rgbToHsl(c.r, c.g, c.b))
      window.api.setToolParams('color-picker', { hex: value.toLowerCase() })
    }
  }

  const updateFromRgb = (channel: 'r' | 'g' | 'b', value: number) => {
    const v = Math.max(0, Math.min(255, value))
    const newRgb = { ...rgb, [channel]: v }
    setRgb(newRgb)
    setHsl(rgbToHsl(newRgb.r, newRgb.g, newRgb.b))
    setHexInput(rgbToHex(newRgb.r, newRgb.g, newRgb.b))
    window.api.setToolParams('color-picker', { hex: rgbToHex(newRgb.r, newRgb.g, newRgb.b) })
  }

  const copy = (value: string, label: string) => {
    window.api.writeClipboardText(value)
    setCopied(label)
    setTimeout(() => setCopied(''), 1500)
  }

  // 预设色板
  const palette = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
    '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#78716C',
    '#111827', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#F3F4F6',
  ]

  return (
    <ToolWindowShell title="颜色取色" toolId="color-picker">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* 颜色预览 */}
        <div style={{
          width: '100%', height: 80, borderRadius: 10,
          background: hex, border: '1px solid var(--border-default)',
          transition: 'background 100ms',
        }} />

        {/* HEX */}
        <div style={rowStyle}>
          <span style={labelStyle}>HEX</span>
          <input
            value={hexInput}
            onChange={e => updateFromHex(e.target.value)}
            style={{ ...inputStyle, fontFamily: 'monospace', width: 120 }}
          />
          <button onClick={() => copy(hex, 'HEX')} style={copyBtnStyle}>
            {copied === 'HEX' ? '✓' : '复制'}
          </button>
        </div>

        {/* RGB */}
        <div style={rowStyle}>
          <span style={labelStyle}>RGB</span>
          {(['r', 'g', 'b'] as const).map(c => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', width: 10 }}>{c.toUpperCase()}</span>
              <input
                type="number" min={0} max={255}
                value={rgb[c]}
                onChange={e => updateFromRgb(c, parseInt(e.target.value) || 0)}
                style={{ ...inputStyle, width: 52, fontFamily: 'monospace' }}
              />
            </div>
          ))}
          <button onClick={() => copy(`${rgb.r}, ${rgb.g}, ${rgb.b}`, 'RGB')} style={copyBtnStyle}>
            {copied === 'RGB' ? '✓' : '复制'}
          </button>
        </div>

        {/* HSL */}
        <div style={rowStyle}>
          <span style={labelStyle}>HSL</span>
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
            {hsl.h}°, {hsl.s}%, {hsl.l}%
          </span>
          <button onClick={() => copy(`${hsl.h}°, ${hsl.s}%, ${hsl.l}%`, 'HSL')} style={copyBtnStyle}>
            {copied === 'HSL' ? '✓' : '复制'}
          </button>
        </div>

        {/* 色板 */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
            预设颜色
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
            {palette.map(color => (
              <div
                key={color}
                onClick={() => updateFromHex(color)}
                style={{
                  width: '100%', aspectRatio: '1', borderRadius: 6,
                  background: color, cursor: 'pointer',
                  border: color === hex ? '2px solid var(--color-primary)' : '2px solid transparent',
                  transition: 'transform 100ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              />
            ))}
          </div>
        </div>
      </div>
    </ToolWindowShell>
  )
}

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
}
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', width: 32,
}
const inputStyle: React.CSSProperties = {
  padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-default)',
  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  fontSize: 13, fontFamily: 'inherit', outline: 'none',
}
const copyBtnStyle: React.CSSProperties = {
  border: '1px solid var(--border-default)', borderRadius: 6,
  padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 500,
  background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
  minWidth: 44,
}
