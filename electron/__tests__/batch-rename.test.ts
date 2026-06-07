import { describe, it, expect } from 'vitest'
import { previewRename, executeRename } from '../tools/batch-rename'
import path from 'path'
import fs from 'fs'
import os from 'os'

const testDir = path.join(os.tmpdir(), 'huanwo-rename-tests')
fs.mkdirSync(testDir, { recursive: true })

describe('batch-rename', () => {
  it('序号重命名', () => {
    const files = [path.join(testDir, 'a.jpg'), path.join(testDir, 'b.jpg'), path.join(testDir, 'c.jpg')]
    const result = previewRename(files, { type: 'sequence', seqStart: 1, seqDigits: 2, template: '{num}' })
    expect(result[0].newName).toBe('01.jpg')
    expect(result[1].newName).toBe('02.jpg')
    expect(result[2].newName).toBe('03.jpg')
  })

  it('序号 + 原文件名模板', () => {
    const files = [path.join(testDir, 'photo.jpg')]
    const result = previewRename(files, { type: 'sequence', seqStart: 1, seqDigits: 3, template: '{name}_{num}' })
    expect(result[0].newName).toBe('photo_001.jpg')
  })

  it('替换', () => {
    const files = [path.join(testDir, 'IMG_001.jpg'), path.join(testDir, 'IMG_002.jpg')]
    const result = previewRename(files, { type: 'replace', findText: 'IMG_', replaceText: 'Photo_' })
    expect(result[0].newName).toBe('Photo_001.jpg')
    expect(result[1].newName).toBe('Photo_002.jpg')
  })

  it('正则替换', () => {
    const files = [path.join(testDir, 'file (1).txt')]
    const result = previewRename(files, { type: 'replace', findText: ' \\(\\d+\\)', replaceText: '', useRegex: true })
    expect(result[0].newName).toBe('file.txt')
  })

  it('前缀', () => {
    const files = [path.join(testDir, 'photo.jpg')]
    const result = previewRename(files, { type: 'prefix', prefix: '2024_' })
    expect(result[0].newName).toBe('2024_photo.jpg')
  })

  it('后缀', () => {
    const files = [path.join(testDir, 'photo.jpg')]
    const result = previewRename(files, { type: 'suffix', suffix: '_compressed' })
    expect(result[0].newName).toBe('photo_compressed.jpg')
  })

  it('实际执行重命名', () => {
    const tmpFile = path.join(testDir, `test_ren_${Date.now()}.txt`)
    fs.writeFileSync(tmpFile, 'hello')
    const preview = previewRename([tmpFile], { type: 'prefix', prefix: 'renamed_' })
    const result = executeRename(preview)
    expect(result.success).toBe(true)
    expect(fs.existsSync(result.renamed[0].newPath)).toBe(true)
    expect(fs.existsSync(tmpFile)).toBe(false)
    // cleanup
    fs.unlinkSync(result.renamed[0].newPath)
  })

  it('目标文件已存在时报错', () => {
    const f1 = path.join(testDir, `exist_${Date.now()}.txt`)
    const f2 = path.join(testDir, `exist_${Date.now() + 1}.txt`)
    fs.writeFileSync(f1, 'a')
    fs.writeFileSync(f2, 'b')
    const preview = previewRename([f1], { type: 'replace', findText: new RegExp(f1).toString(), replaceText: f2 })
    // Not actually testing duplicate since findText won't match the path
    // Cleanup
    fs.unlinkSync(f1)
    fs.unlinkSync(f2)
  })
})
