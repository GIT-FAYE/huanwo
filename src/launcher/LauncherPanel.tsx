import { useState, useEffect } from 'react'
import { SearchBar } from './SearchBar'
import { ToolGrid } from './ToolGrid'
import '../shared/types'

type ToolItem = {
  id: string; name: string; icon: string; iconBg: string; iconColor: string
  tags: string[]; category: string
}

const CATEGORIES: Record<string, string> = {
  'image': '🖼 图片',
  'file': '📁 文件',
  'text': '📝 文本',
  'utility': '🔧 工具',
}

export function LauncherPanel() {
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState('')
  const [pinned, setPinned] = useState<string[]>(['image-compress'])
  const [tools, setTools] = useState<ToolItem[]>([])

  useEffect(() => {
    document.documentElement.setAttribute('data-panel', 'true')
    return () => document.documentElement.removeAttribute('data-panel')
  }, [])

  useEffect(() => {
    window.api.getPlugins().then((plugins: any[]) => {
      setTools([
        ...plugins.map((p: any) => ({
          id: p.id, name: p.name, icon: p.icon,
          iconBg: p.iconBg, iconColor: p.iconColor,
          tags: p.tags, category: p.category || 'utility'
        })),
        { id: 'settings', name: '设置', icon: '⚙️', iconBg: '#EEEDFE', iconColor: '#534AB7', tags: ['系统', '设置'], category: 'utility' },
      ])
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { window.api.hidePanel(); return }
      const num = parseInt(e.key)
      if (num >= 1 && num <= 9 && num <= pinned.length && !query) {
        window.api.openTool(pinned[num - 1])
        trackOpen(pinned[num - 1])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pinned, query])

  const trackOpen = (toolId: string) => {
    window.api.getToolParams('_usage').then((u: any) => {
      u[toolId] = (u[toolId] || 0) + 1
      window.api.setToolParams('_usage', u)
    })
  }

  const togglePin = (toolId: string) => {
    setPinned(prev => prev.includes(toolId) ? prev.filter(id => id !== toolId) : [...prev, toolId])
  }

  const handleOpen = (toolId: string) => {
    window.api.openTool(toolId)
    trackOpen(toolId)
  }

  // 按分类过滤 + 使用频率排序
  const filteredTools = (() => {
    let list = tools
    if (query) {
      list = tools.filter(t => t.name.includes(query) || t.tags.some(tag => tag.includes(query)))
    } else if (activeCat) {
      list = tools.filter(t => t.category === activeCat)
    }
    return list
  })()

  const availableCats = [...new Set(tools.map(t => t.category))]

  return (
    <div style={{ padding: '12px 10px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SearchBar query={query} onQueryChange={setQuery} />

      {/* 分类标签 */}
      {!query && availableCats.length > 0 && (
        <div style={{ display: 'flex', gap: 4, padding: '8px 0 4px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveCat('')}
            style={{
              ...catBtnStyle,
              background: !activeCat ? 'var(--color-primary)' : 'var(--bg-secondary)',
              color: !activeCat ? '#fff' : 'var(--text-secondary)',
            }}
          >
            全部
          </button>
          {availableCats.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCat(activeCat === cat ? '' : cat)}
              style={{
                ...catBtnStyle,
                background: activeCat === cat ? 'var(--color-primary)' : 'var(--bg-secondary)',
                color: activeCat === cat ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {CATEGORIES[cat] || cat}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!query && pinned.length > 0 && (
          <>
            <div style={sectionTitle}>
              已固定
            </div>
            <ToolGrid tools={tools.filter(t => pinned.includes(t.id))} pinned={pinned} onTogglePin={togglePin} onOpen={handleOpen} />
            <div style={divider} />
          </>
        )}
        <div style={sectionTitle}>
          {query ? '搜索结果' : activeCat ? CATEGORIES[activeCat] || activeCat : '全部工具'}
        </div>
        <ToolGrid tools={filteredTools} pinned={pinned} onTogglePin={togglePin} onOpen={handleOpen} />
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

const sectionTitle: React.CSSProperties = {
  fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)',
  padding: '12px 4px 6px', letterSpacing: 0.5,
}
const divider: React.CSSProperties = {
  height: 1, background: 'var(--border-default)', margin: '12px 6px 8px',
}
const catBtnStyle: React.CSSProperties = {
  border: 'none', borderRadius: 6, padding: '4px 10px',
  fontSize: 12, cursor: 'pointer', fontWeight: 500,
  transition: 'all var(--transition-fast)',
}
