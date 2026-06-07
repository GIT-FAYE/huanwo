import { useState, useEffect } from 'react'
import { SearchBar } from './SearchBar'
import { ToolGrid } from './ToolGrid'
import '../shared/types'

export function LauncherPanel() {
  const [query, setQuery] = useState('')
  const [pinned, setPinned] = useState<string[]>(['image-compress'])
  const [tools, setTools] = useState<Array<{ id: string; name: string; icon: string; iconBg: string; iconColor: string; tags: string[] }>>([])

  useEffect(() => {
    window.api.getPlugins().then((plugins: any[]) => {
      setTools([
        ...plugins.map((p: any) => ({ id: p.id, name: p.name, icon: p.icon, iconBg: p.iconBg, iconColor: p.iconColor, tags: p.tags })),
        { id: 'settings', name: '设置', icon: '⚙️', iconBg: '#EEEDFE', iconColor: '#534AB7', tags: ['系统', '设置'] },
      ])
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { window.api.hidePanel(); return }
      const num = parseInt(e.key)
      if (num >= 1 && num <= 9 && num <= pinned.length && !query) {
        window.api.openTool(pinned[num - 1])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pinned, query])

  const togglePin = (toolId: string) => {
    setPinned(prev => prev.includes(toolId) ? prev.filter(id => id !== toolId) : [...prev, toolId])
  }

  const filteredTools = query
    ? tools.filter(t => t.name.includes(query) || t.tags.some(tag => tag.includes(query)))
    : tools

  return (
    <div style={{ padding: '12px 10px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SearchBar query={query} onQueryChange={setQuery} />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!query && pinned.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)', padding: '12px 4px 6px', letterSpacing: 0.5 }}>
              已固定
            </div>
            <ToolGrid tools={tools.filter(t => pinned.includes(t.id))} pinned={pinned} onTogglePin={togglePin} />
            <div style={{ height: 1, background: 'var(--border-default)', margin: '12px 6px 8px' }} />
          </>
        )}
        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)', padding: query ? '12px 4px 6px' : '4px 4px 6px', letterSpacing: 0.5 }}>
          {query ? '搜索结果' : '全部工具'}
        </div>
        <ToolGrid tools={filteredTools} pinned={pinned} onTogglePin={togglePin} />
        {filteredTools.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 24, fontSize: 12 }}>
            未找到匹配工具
          </div>
        )}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textAlign: 'center', padding: '8px 0 4px', letterSpacing: 0.3 }}>
        单击打开 · 右键固定/取消
      </div>
    </div>
  )
}
