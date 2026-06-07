interface Props { title: string; toolId: string; children: React.ReactNode }

export function ToolWindowShell({ title, children }: Props) {
  return (
    <div style={{
      width: '100%', height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontSize: 13,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI Variable", "PingFang SC", "Microsoft YaHei UI", sans-serif',
      userSelect: 'none',
      position: 'relative',
    }}>
      <div style={{ flex: 1, overflow: 'auto', padding: 12, minHeight: 0 }}>
        {children}
      </div>
    </div>
  )
}
