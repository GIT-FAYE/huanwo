import { useRef, useEffect, useState } from 'react'

interface Props { query: string; onQueryChange: (q: string) => void }

export function SearchBar({ query, onQueryChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 120)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
        display: 'flex', alignItems: 'center',
        height: 38,
        margin: '8px 4px',
        padding: '0 12px',
        borderRadius: 10,
        background: focused ? 'var(--bg-primary)' : 'var(--bg-secondary)',
        border: focused ? '1.5px solid var(--border-focus)' : '1px solid transparent',
        boxShadow: focused ? '0 0 0 3px var(--color-primary-light)' : 'none',
        transition: 'all var(--transition-fast)',
        cursor: 'text',
      }}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.4, flexShrink: 0 }}>
        <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M10 10l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="搜索工具…"
        spellCheck={false}
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'none',
          fontSize: 13, color: 'var(--text-primary)',
          fontFamily: 'inherit', padding: '0 8px',
        }}
      />
      {query && (
        <button
          onClick={e => { e.stopPropagation(); onQueryChange('') }}
          style={{
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 12, color: 'var(--text-tertiary)',
            width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 4, flexShrink: 0,
          }}
        >✕</button>
      )}
    </div>
  )
}
