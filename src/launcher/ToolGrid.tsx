import { ToolCard } from './ToolCard'

interface Tool {
  id: string
  name: string
  icon: string
  iconBg: string
  iconColor: string
  tags: string[]
}

interface Props {
  tools: Tool[]
  pinned: string[]
  onTogglePin: (id: string) => void
}

export function ToolGrid({ tools, pinned, onTogglePin }: Props) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 8,
    }}>
      {tools.map(tool => (
        <ToolCard
          key={tool.id}
          tool={tool}
          isPinned={pinned.includes(tool.id)}
          onTogglePin={() => onTogglePin(tool.id)}
        />
      ))}
    </div>
  )
}
