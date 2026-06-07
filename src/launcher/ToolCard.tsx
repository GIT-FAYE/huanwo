import { useState } from 'react'

interface Tool {
  id: string; name: string; icon: string; iconBg: string; iconColor: string
}

interface Props { tool: Tool; isPinned: boolean; onTogglePin: () => void; onOpen?: (id: string) => void }

export function ToolCard({ tool, isPinned, onTogglePin, onOpen }: Props) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={() => onOpen ? onOpen(tool.id) : window.api.openTool(tool.id)}
      onContextMenu={e => { e.preventDefault(); onTogglePin() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '14px 4px 12px',
        borderRadius: 12,
        cursor: 'pointer',
        background: hovered ? 'var(--bg-secondary)' : 'transparent',
        position: 'relative',
        transition: 'background 120ms ease',
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
        background: tool.iconBg,
        marginBottom: 6,
        position: 'relative',
      }}>
        {tool.icon}
        {isPinned && (
          <div style={{
            position: 'absolute', top: -3, right: -3,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--color-primary)',
            border: '2px solid var(--bg-primary)',
          }} />
        )}
      </div>
      <span style={{
        fontSize: 12, fontWeight: 400,
        color: 'var(--text-primary)',
        textAlign: 'center', maxWidth: '100%',
        overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {tool.name}
      </span>
    </div>
  )
}
