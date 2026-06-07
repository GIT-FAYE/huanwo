import path from 'path'
import fs from 'fs'

export interface RenameRule {
  type: 'sequence' | 'replace' | 'prefix' | 'suffix' | 'date'
  // 序号
  seqStart?: number
  seqDigits?: number
  // 替换
  findText?: string
  replaceText?: string
  useRegex?: boolean
  // 前后缀
  prefix?: string
  suffix?: string
  // 模板用原文件名占位 {name}
  template?: string
}

interface BatchRenameResult {
  success: boolean
  renamed: Array<{ oldPath: string; newPath: string; oldName: string; newName: string; error?: string }>
  summary: string
}

export function previewRename(
  files: string[],
  rule: RenameRule
): Array<{ oldPath: string; newPath: string; oldName: string; newName: string }> {
  return files.map((filePath, i) => {
    const dir = path.dirname(filePath)
    const ext = path.extname(filePath)
    const base = path.basename(filePath, ext)
    let newBase: string

    switch (rule.type) {
      case 'sequence':
        const num = String((rule.seqStart ?? 1) + i).padStart(rule.seqDigits ?? 3, '0')
        newBase = (rule.template || '{num}').replace('{num}', num).replace('{name}', base)
        break
      case 'replace':
        if (rule.useRegex && rule.findText) {
          newBase = base.replace(new RegExp(rule.findText, 'g'), rule.replaceText || '')
        } else {
          newBase = base.split(rule.findText || '').join(rule.replaceText || '')
        }
        break
      case 'prefix':
        newBase = (rule.prefix || '') + base
        break
      case 'suffix':
        newBase = base + (rule.suffix || '')
        break
      case 'date':
        const d = new Date()
        const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
        newBase = (rule.template || '{date}_{name}').replace('{date}', ds).replace('{name}', base)
        break
      default:
        newBase = base
    }

    return {
      oldPath: filePath,
      newPath: path.join(dir, newBase + ext),
      oldName: path.basename(filePath),
      newName: newBase + ext,
    }
  })
}

export function executeRename(
  previews: Array<{ oldPath: string; newPath: string; oldName: string; newName: string }>
): BatchRenameResult {
  const renamed: BatchRenameResult['renamed'] = []

  for (const p of previews) {
    try {
      if (fs.existsSync(p.newPath)) {
        renamed.push({ ...p, error: '目标文件已存在' })
        continue
      }
      fs.renameSync(p.oldPath, p.newPath)
      renamed.push(p)
    } catch (err: any) {
      renamed.push({ ...p, error: err.message })
    }
  }

  return {
    success: renamed.every(r => !r.error),
    renamed,
    summary: `共重命名 ${renamed.length} 个文件，成功 ${renamed.filter(r => !r.error).length} 个`
  }
}
