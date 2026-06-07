import { useState, useEffect } from 'react'
import { ToolWindowShell } from '../tool-window/ToolWindowShell'

type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'

export function SettingsPage() {
  const [hotkey, setHotkey] = useState('Ctrl+Space')
  const [autoStart, setAutoStart] = useState(false)
  const [autoUpdate, setAutoUpdate] = useState(true)
  const [singleTool, setSingleTool] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [hotkeyConflict, setHotkeyConflict] = useState(false)

  // 更新相关
  const [appVersion, setAppVersion] = useState('0.0.1')
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [updateError, setUpdateError] = useState('')
  const [downloadPercent, setDownloadPercent] = useState(0)

  useEffect(() => {
    window.api.getConfig('hotkey').then((v: any) => { if (v) setHotkey(v) })
    window.api.getConfig('autoStart').then((v: any) => setAutoStart(v))
    window.api.getConfig('autoUpdate').then((v: any) => setAutoUpdate(v))
    window.api.getConfig('singleToolMode').then((v: any) => setSingleTool(v ?? true))
    window.api.getConfig('deepseekApiKey').then((v: any) => setApiKey(v ?? ''))
    window.api.getVersion().then((v: string) => setAppVersion(v))

    window.api.onUpdateAvailable((info: any) => {
      setUpdateInfo(info)
      setUpdateStatus('available')
    })
    window.api.onUpdateNotAvailable(() => {
      setUpdateStatus('not-available')
    })
    window.api.onUpdateProgress((progress: any) => {
      setUpdateStatus('downloading')
      setDownloadPercent(Math.round(progress.percent))
    })
    window.api.onUpdateDownloaded(() => {
      setUpdateStatus('downloaded')
    })
    window.api.onUpdateError((msg: string) => {
      setUpdateStatus('error')
      setUpdateError(msg)
    })

    window.api.onHotkeyConflict((hk: string) => {
      if (hk === hotkey) setHotkeyConflict(true)
    })
  }, [])

  const [recording, setRecording] = useState(false)

  const captureKeys = (e: React.KeyboardEvent) => {
    e.preventDefault()
    const keys: string[] = []
    if (e.ctrlKey) keys.push('Ctrl')
    if (e.altKey) keys.push('Alt')
    if (e.shiftKey) keys.push('Shift')
    if (e.metaKey) keys.push('Meta')
    const code = e.code
    if (code.startsWith('Key')) keys.push(code.slice(3))
    else if (code.startsWith('Digit')) keys.push(code.slice(5))
    else if (code === 'Space') keys.push('Space')
    else if (code.startsWith('F') && code.length <= 3) keys.push(code)
    else return
    const combo = keys.join('+')
    setHotkey(combo)
    setHotkeyConflict(false)
    window.api.setConfig('hotkey', combo)
    window.api.updateHotkey(combo).then((ok: boolean) => {
      if (!ok) setHotkeyConflict(true)
    })
    setRecording(false)
  }

  const handleCheckUpdate = () => {
    setUpdateStatus('checking')
    setUpdateError('')
    window.api.checkForUpdates()
  }

  const handleDownload = () => {
    setUpdateStatus('downloading')
    setUpdateError('')
    window.api.downloadUpdate()
  }

  const renderUpdateStatus = () => {
    switch (updateStatus) {
      case 'checking':
        return <span style={{ color: 'var(--text-secondary)' }}>⏳ 正在检查更新…</span>
      case 'available':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ color: 'var(--color-warning, #d97706)' }}>
              🔔 发现新版本 {updateInfo?.version}（当前 {appVersion}）
            </span>
            <button onClick={handleDownload} style={actionBtnStyle}>⬇ 立即下载</button>
          </div>
        )
      case 'not-available':
        return <span style={{ color: 'var(--color-success, #16a34a)' }}>✅ 已是最新版本</span>
      case 'downloading':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: 'var(--text-secondary)' }}>⬇ 正在下载… {downloadPercent}%</span>
            <div style={progressBarOuter}>
              <div style={{ ...progressBarInner, width: `${downloadPercent}%` }} />
            </div>
          </div>
        )
      case 'downloaded':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ color: 'var(--color-success, #16a34a)' }}>✅ 下载完成</span>
            <button onClick={() => window.api.quitAndInstall()} style={actionBtnStyle}>🔄 重启安装</button>
          </div>
        )
      case 'error':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: 'var(--color-danger, #dc2626)' }}>❌ {updateError || '更新失败'}</span>
            <button onClick={handleCheckUpdate} style={linkBtnStyle}>重试</button>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <ToolWindowShell title="设置" toolId="settings">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

        <Section title="全局快捷键">
          <input
            value={recording ? '按下组合键…' : hotkey}
            onFocus={() => setRecording(true)}
            onBlur={() => setRecording(false)}
            onKeyDown={captureKeys}
            readOnly
            style={{
              ...inputStyle,
              background: recording ? 'var(--color-primary-light)' : 'var(--bg-secondary)',
              borderColor: recording ? 'var(--border-focus)' : 'var(--border-default)',
              cursor: 'pointer',
              width: 180,
            }}
            placeholder="如 Ctrl+Space"
          />
          {hotkeyConflict && (
            <span style={{ fontSize: 11, color: 'var(--color-danger, #dc2626)', marginTop: 4, display: 'block' }}>
              ⚠ 该快捷键可能被其他程序占用，注册失败
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>点击输入框后按下组合键即可修改</span>
        </Section>

        <Section title="启动">
          <label style={labelStyle}>
            <Switch checked={autoStart} onChange={() => { setAutoStart(!autoStart); window.api.setConfig('autoStart', !autoStart) }} />
            <span>开机自动启动</span>
          </label>
        </Section>

        <Section title="工具窗口">
          <label style={labelStyle}>
            <Switch checked={!singleTool} onChange={() => { setSingleTool(!singleTool); window.api.setConfig('singleToolMode', !singleTool) }} />
            <span>允许同时打开多个工具</span>
          </label>
        </Section>

        <Section title="DeepSeek API">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              type="password"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); window.api.setConfig('deepseekApiKey', e.target.value) }}
              placeholder="输入 DeepSeek API Key (sk-...)"
              style={{ ...inputStyle, width: '100%' }}
            />
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
              用于文本翻译工具 · <a href="#" onClick={e => { e.preventDefault(); window.api.openURL('https://platform.deepseek.com/api_keys') }} style={{ color: 'var(--color-info)' }}>获取 Key</a>
            </span>
          </div>
        </Section>

        <Section title="更新">
          <label style={labelStyle}>
            <Switch checked={autoUpdate} onChange={() => { setAutoUpdate(!autoUpdate); window.api.setConfig('autoUpdate', !autoUpdate) }} />
            <span>自动检查更新</span>
          </label>
          <div style={{ marginTop: 10, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: 'var(--text-secondary)' }}>
              当前版本 v{appVersion}
            </div>
            {updateStatus === 'idle' && (
              <button onClick={handleCheckUpdate} style={secondaryBtnStyle}>检查更新</button>
            )}
            {renderUpdateStatus()}
          </div>
        </Section>

        <Section title="调试">
          <button onClick={() => window.api.exportLogs().then((r: string) => r && window.api.openOutputDir(r))}
            style={btnStyle}>
            📋 导出日志
          </button>
        </Section>

        <Section title="关于">
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            唤我 HuanWo v{appVersion}<br />
            桌面小工具合集 · Ctrl+Space 随时呼出<br />
            <span style={{ color: 'var(--text-tertiary)' }}>MIT License</span>
          </div>
        </Section>
      </div>
    </ToolWindowShell>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{
      width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
      background: checked ? 'var(--color-primary)' : 'var(--border-hover)',
      position: 'relative', transition: 'all var(--transition-fast)',
      flexShrink: 0,
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 2, transition: 'all var(--transition-fast)',
        left: checked ? 18 : 2, boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-default)',
  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  fontSize: 13, fontWeight: 500, width: 170, fontFamily: 'inherit',
  transition: 'all var(--transition-fast)',
}
const btnStyle: React.CSSProperties = {
  border: '1px solid var(--border-default)', borderRadius: 8,
  padding: '7px 18px', fontSize: 12, cursor: 'pointer',
  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  fontWeight: 500, transition: 'all var(--transition-fast)',
}
const actionBtnStyle: React.CSSProperties = {
  ...btnStyle,
  background: 'var(--color-primary)',
  color: '#fff',
  border: 'none',
  fontWeight: 600,
}
const secondaryBtnStyle: React.CSSProperties = {
  ...btnStyle,
  width: 'fit-content',
}
const linkBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--color-primary)',
  cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline',
}
const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)',
}
const progressBarOuter: React.CSSProperties = {
  width: '100%', height: 6, borderRadius: 3,
  background: 'var(--bg-secondary)',
  overflow: 'hidden',
}
const progressBarInner: React.CSSProperties = {
  height: '100%', borderRadius: 3,
  background: 'var(--color-primary)',
  transition: 'width 0.3s ease',
}
