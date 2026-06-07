import { useState, useEffect } from 'react'
import { ToolWindowShell } from './ToolWindowShell'

interface PreviewItem {
  oldPath: string
  newPath: string
  oldName: string
  newName: string
}

type RuleType = 'sequence' | 'replace' | 'prefix' | 'suffix' | 'date'

export function BatchRenameTool() {
  const [files, setFiles] = useState<string[]>([])
  const [ruleType, setRuleType] = useState<RuleType>('sequence')
  const [seqStart, setSeqStart] = useState(1)
  const [seqDigits, setSeqDigits] = useState(3)
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [useRegex, setUseRegex] = useState(false)
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')
  const [dateTemplate, setDateTemplate] = useState('{date}_{name}')
  const [template, setTemplate] = useState('{num}')
  const [previews, setPreviews] = useState<PreviewItem[]>([])
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    window.api.getToolParams('batch-rename').then((h: any) => {
      if (h && Object.keys(h).length > 0) {
        setRuleType(h.ruleType ?? 'sequence')
        setSeqStart(h.seqStart ?? 1)
        setSeqDigits(h.seqDigits ?? 3)
        if (h.findText !== undefined) setFindText(h.findText)
        if (h.replaceText !== undefined) setReplaceText(h.replaceText)
        if (h.useRegex !== undefined) setUseRegex(h.useRegex)
        if (h.prefix !== undefined) setPrefix(h.prefix)
        if (h.suffix !== undefined) setSuffix(h.suffix)
        if (h.dateTemplate !== undefined) setDateTemplate(h.dateTemplate)
        if (h.template !== undefined) setTemplate(h.template)
      }
    })
  }, [])

  useEffect(() => {
    window.api.setToolParams('batch-rename', {
      ruleType, seqStart, seqDigits, findText, replaceText,
      useRegex, prefix, suffix, dateTemplate, template
    })
  }, [ruleType, seqStart, seqDigits, findText, replaceText, useRegex, prefix, suffix, dateTemplate, template])

  const addFiles = (paths: string[]) => {
    setFiles(prev => {
      const s = new Set(prev)
      return [...prev, ...paths.filter(p => !s.has(p))]
    })
    setResult(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    addFiles(Array.from(e.dataTransfer.files).map(f => (f as any).path || f.name))
  }

  const handleSelect = () => {
    window.api.selectFiles(['*']).then(paths => { if (paths) addFiles(paths) })
  }

  const handlePreview = async () => {
    const result = await window.api.renamePreview(files, {
      type: ruleType, seqStart, seqDigits, findText, replaceText,
      useRegex, prefix, suffix, template: ruleType === 'sequence' ? template : ruleType === 'date' ? dateTemplate : undefined
    })
    setPreviews(result)
    setResult(null)
  }

  const handleExecute = async () => {
    setFiles(files.map((p: string) => ({ path: p, name: p.split('\\').pop() || '', status: 'processing' as const })))
    const result = await window.api.renameExecute(previews)
    setResult(result.summary)
    setFiles(previews.map((p: any) => ({ path: p.newPath, name: p.newName, status: 'done' as const })))
  }

  return (
    <ToolWindowShell title="批量重命名" toolId="batch-rename">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={handleSelect}
          style={{
            border: '2px dashed var(--border-default)',
            borderRadius: 10, padding: '20px 12px', textAlign: 'center',
            cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 12,
            background: 'var(--bg-secondary)',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 4 }}>📁</div>
          拖入文件或点击选择
        </div>

        {files.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            已选 {files.length} 个文件
          </div>
        )}

        {/* 规则选择 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 12 }}>
          {(['sequence', 'replace', 'prefix', 'suffix', 'date'] as RuleType[]).map(t => (
            <button key={t} onClick={() => { setRuleType(t); setResult(null); setPreviews([]) }}
              style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-default)',
                cursor: 'pointer', fontSize: 12,
                background: ruleType === t ? 'var(--color-primary)' : 'var(--bg-secondary)',
                color: ruleType === t ? '#fff' : 'var(--text-primary)'
              }}>
              {{ sequence: '序号', replace: '替换', prefix: '前缀', suffix: '后缀', date: '日期' }[t]}
            </button>
          ))}
        </div>

        {/* 参数 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
          {ruleType === 'sequence' && (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>起始</span>
                <input type="number" value={seqStart} onChange={e => setSeqStart(Number(e.target.value))}
                  style={inputStyle} />
                <span>位数</span>
                <input type="number" value={seqDigits} min={1} max={6} onChange={e => setSeqDigits(Number(e.target.value))}
                  style={{ ...inputStyle, width: 50 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>模板</span>
                <input value={template} onChange={e => setTemplate(e.target.value)} style={{ ...inputStyle, flex: 1 }}
                  placeholder="{num} 或 {name}_{num}" />
              </div>
            </>
          )}
          {ruleType === 'replace' && (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>查找</span>
                <input value={findText} onChange={e => setFindText(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>替换为</span>
                <input value={replaceText} onChange={e => setReplaceText(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              </div>
              <label><input type="checkbox" checked={useRegex} onChange={e => setUseRegex(e.target.checked)} /> 使用正则</label>
            </>
          )}
          {ruleType === 'prefix' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>前缀</span>
              <input value={prefix} onChange={e => setPrefix(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="如 IMG_" />
            </div>
          )}
          {ruleType === 'suffix' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>后缀</span>
              <input value={suffix} onChange={e => setSuffix(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="如 _compressed" />
            </div>
          )}
          {ruleType === 'date' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>模板</span>
              <input value={dateTemplate} onChange={e => setDateTemplate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            </div>
          )}
        </div>

        {/* 预览 */}
        {previews.length > 0 && (
          <div style={{ maxHeight: 150, overflowY: 'auto', fontSize: 11, border: '1px solid var(--border-default)', borderRadius: 8, padding: 4 }}>
            {previews.slice(0, 50).map((p, i) => {
              const file = files.find((f: any) => (typeof f === 'string' ? f : f.path) === p.oldPath)
              const isProcessing = file && typeof file !== 'string' && file.status === 'processing'
              const isDone = file && typeof file !== 'string' && file.status === 'done'
              return (
                <div key={i}>
                  <div style={{ padding: '3px 6px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-default)' }}>
                    <span style={{ color: isDone ? 'var(--color-success)' : 'var(--text-tertiary)' }}>{p.oldName}</span>
                    <span style={{ color: isDone ? 'var(--color-success)' : 'var(--text-secondary)' }}>→</span>
                    <span style={{ color: isDone ? 'var(--color-success)' : 'var(--text-secondary)' }}>{p.newName}</span>
                  </div>
                  {isProcessing && (
                    <div style={{ height: 2, background: 'var(--bg-tertiary)', borderRadius: 1 }}>
                      <div style={{ height: '100%', width: '60%', background: 'var(--color-primary)', borderRadius: 1, animation: 'progressPulse 1s ease-in-out infinite' }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 结果 */}
        {result && (
          <div style={{ background: 'var(--color-primary-light)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--color-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>✅ {result}</span>
            <button onClick={() => { const f = previews[0]; if (f) window.api.openOutputDir(f.newPath) }} style={{ border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', background: 'var(--bg-primary)', color: 'var(--color-primary)' }}>
              📂 打开目录
            </button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => { setFiles([]); setPreviews([]); setResult(null) }} style={btnStyle}>清空</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {files.length > 0 && (
              <button onClick={handlePreview} style={{ ...btnStyle, background: 'var(--color-info)', color: '#fff' }}>
                预览 ({files.length})
              </button>
            )}
            {previews.length > 0 && (
              <button onClick={handleExecute} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff', fontWeight: 600 }}>
                执行重命名
              </button>
            )}
          </div>
        </div>
      </div>
    </ToolWindowShell>
  )
}

const inputStyle: React.CSSProperties = {
  width: 60, padding: '4px 8px', borderRadius: 6,
  border: '1px solid var(--border-default)', background: 'var(--bg-secondary)',
  color: 'var(--text-primary)', fontSize: 12
}
const btnStyle: React.CSSProperties = {
  border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 12, cursor: 'pointer',
  background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
}
