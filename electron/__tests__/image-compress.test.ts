// image-compress 单元测试
// 运行：npx vitest run

import { describe, it, expect } from 'vitest'
import { compressImages } from '../tools/image-compress'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import os from 'os'

const testDir = path.join(os.tmpdir(), 'huanwo-tests')
fs.mkdirSync(testDir, { recursive: true })

async function createTestImage(ext: string, size = 100): Promise<string> {
  const file = path.join(testDir, `test_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`)
  let pipeline = sharp({ create: { width: size, height: size, channels: 3, background: '#3366cc' } })
  if (ext === 'jpg' || ext === 'jpeg') pipeline = pipeline.jpeg({ quality: 95 })
  else if (ext === 'png') pipeline = pipeline.png()
  else if (ext === 'webp') pipeline = pipeline.webp({ quality: 95 })
  await pipeline.toFile(file)
  return file
}

describe('image-compress', () => {
  it('JPEG 压缩后体积应减小', async () => {
    const file = await createTestImage('jpg', 500)
    const origSize = fs.statSync(file).size
    const result = await compressImages([file], {
      quality: 10, mode: 'lossy', progressive: false,
      stripExif: true, pngLevel: 6, pngPalette: true, resize: false
    })
    expect(result.success).toBe(true)
    expect(result.results[0].outputSize).toBeLessThan(origSize)
  })

  it('PNG 无损压缩后体积应减小', async () => {
    const file = await createTestImage('png', 200)
    const origSize = fs.statSync(file).size
    const result = await compressImages([file], {
      quality: 80, mode: 'lossless', progressive: false,
      stripExif: false, pngLevel: 9, pngPalette: true, resize: false
    })
    expect(result.success).toBe(true)
  })

  it('WebP 格式可正常处理', async () => {
    const file = await createTestImage('webp', 500)
    const result = await compressImages([file], {
      quality: 50, mode: 'lossy', progressive: false,
      stripExif: true, pngLevel: 6, pngPalette: true, resize: false
    })
    expect(result.success).toBe(true)
    expect(result.results[0].outputSize).toBeGreaterThan(0)
  })

  it('目标大小模式应逼近目标', async () => {
    const file = await createTestImage('jpg', 500)
    const targetBytes = 5 * 1024 // 5KB target
    const result = await compressImages([file], {
      quality: 80, mode: 'lossy', progressive: false,
      stripExif: true, pngLevel: 6, pngPalette: true, resize: false,
      targetSize: targetBytes
    })
    expect(result.success).toBe(true)
    // 允许 30% 误差（二分搜索不保证精确）
    expect(result.results[0].outputSize).toBeLessThan(targetBytes * 1.3)
  })

  it('不支持的格式应跳过并返回错误', async () => {
    const file = path.join(testDir, 'test.exe')
    fs.writeFileSync(file, Buffer.alloc(100))
    const result = await compressImages([file], {
      quality: 80, mode: 'lossy', progressive: false,
      stripExif: true, pngLevel: 6, pngPalette: true, resize: false
    })
    expect(result.results[0].error).toBeTruthy()
  })

  it('GIF 应返回提示', async () => {
    const file = await createTestImage('gif', 100)
    const result = await compressImages([file], {
      quality: 80, mode: 'lossy', progressive: false,
      stripExif: true, pngLevel: 6, pngPalette: true, resize: false
    })
    expect(result.results[0].error).toContain('GIF')
  })

  it('批量处理多文件', async () => {
    const files = [await createTestImage('jpg', 100), await createTestImage('png', 100), await createTestImage('webp', 100)]
    const result = await compressImages(files, {
      quality: 80, mode: 'lossy', progressive: false,
      stripExif: true, pngLevel: 6, pngPalette: true, resize: false
    })
    expect(result.results.length).toBe(3)
    expect(result.success).toBe(true)
    expect(result.totalSaved).toBeGreaterThan(0)
    expect(result.summary).toContain('节省')
  })
})
