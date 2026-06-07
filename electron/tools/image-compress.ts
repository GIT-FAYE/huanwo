import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import os from 'os'

export interface CompressOptions {
  quality: number
  mode: 'smart' | 'lossy' | 'lossless'
  progressive: boolean
  stripExif: boolean
  pngLevel: number
  pngPalette: boolean
  resize: boolean
  maxWidth?: number
  maxHeight?: number
  targetSize?: number
}

interface FileResult {
  input: string
  output: string
  originalSize: number
  outputSize: number
  error?: string
}

interface CompressResult {
  success: boolean
  results: FileResult[]
  summary: string
  totalSaved: number
}

export async function compressImages(
  files: string[],
  options: CompressOptions,
  outputDir?: string,
  onProgress?: (current: number, total: number, file: string) => void
): Promise<CompressResult> {
  const results: FileResult[] = []
  let totalSaved = 0
  let failed = 0

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i]
    onProgress?.(i + 1, files.length, path.basename(filePath))

    try {
      const stat = fs.statSync(filePath)
      const ext = path.extname(filePath).toLowerCase()
      const basename = path.basename(filePath, ext)
      const outExt = ext === '.jpg' ? '.jpg' : ext  // 保持输出格式一致

      let outPath: string
      if (outputDir) {
        outPath = path.join(outputDir, basename + '_compressed' + outExt)
      } else {
        outPath = path.join(path.dirname(filePath), basename + '_compressed' + outExt)
      }

      // GIF 跳过
      if (ext === '.gif') {
        results.push({ input: filePath, output: filePath, originalSize: stat.size, outputSize: stat.size, error: 'GIF 需使用图片转格式工具转为 WebP 动图' })
        failed++
        continue
      }

      let outStat: fs.Stats

      // 目标大小模式（仅 JPEG/WebP 支持）
      if (options.targetSize && options.targetSize > 0 && (outExt === '.jpg' || outExt === '.jpeg' || outExt === '.webp')) {
        const { pipeline } = await compressToTarget(sharp(filePath), outExt, options.targetSize, stat.size)
        await pipeline.toFile(outPath)
        outStat = fs.statSync(outPath)
      } else {
        // 标准质量模式
        let pipeline = sharp(filePath)

        if (options.resize && (options.maxWidth || options.maxHeight)) {
          pipeline = pipeline.resize({ width: options.maxWidth, height: options.maxHeight, fit: 'inside', withoutEnlargement: true })
        }

        if (outExt === '.jpg' || outExt === '.jpeg') {
          pipeline = pipeline.jpeg({ quality: options.quality, progressive: options.progressive })
        } else if (outExt === '.png') {
          pipeline = pipeline.png({ compressionLevel: options.pngLevel, palette: options.pngPalette })
        } else if (outExt === '.webp') {
          pipeline = pipeline.webp({ quality: options.quality })
        }

        await pipeline.toFile(outPath)
        outStat = fs.statSync(outPath)

        // 压缩无收益，保留原始
        const saved = stat.size - outStat.size
        if (saved <= 0 && options.mode !== 'lossless') {
          fs.unlinkSync(outPath)
          fs.copyFileSync(filePath, outPath)
          results.push({ input: filePath, output: outPath, originalSize: stat.size, outputSize: stat.size, error: '压缩无收益，保留原始文件' })
          continue
        }
      }

      const saved = stat.size - outStat.size
      totalSaved += Math.max(0, saved)
      results.push({ input: filePath, output: outPath, originalSize: stat.size, outputSize: outStat.size })
    } catch (err: any) {
      results.push({ input: filePath, output: '', originalSize: 0, outputSize: 0, error: err.message })
      failed++
    }
  }

  return {
    success: failed === 0,
    results,
    totalSaved,
    summary: `共处理 ${files.length} 张，成功 ${files.length - failed} 张，失败 ${failed} 张，节省 ${formatSize(totalSaved)}`
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

// 二分搜索逼近目标文件大小
async function compressToTarget(
  basePipeline: sharp.Sharp,
  ext: string,
  targetBytes: number,
  originalSize: number
): Promise<{ pipeline: sharp.Sharp; quality: number }> {
  if (originalSize <= targetBytes) {
    const q100 = ext === '.webp' ? basePipeline.clone().webp({ quality: 100 }) : basePipeline.clone().jpeg({ quality: 100 })
    return { pipeline: q100, quality: 100 }
  }

  let lo = 1, hi = 95, bestQ = 1

  for (let iter = 0; iter < 8; iter++) {
    const mid = Math.floor((lo + hi) / 2)
    const testPipeline = basePipeline.clone()
    const buf = ext === '.webp'
      ? await testPipeline.webp({ quality: mid }).toBuffer()
      : await testPipeline.jpeg({ quality: mid }).toBuffer()

    if (buf.length <= targetBytes) {
      bestQ = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  if (ext === '.webp') {
    return { pipeline: basePipeline.webp({ quality: bestQ }), quality: bestQ }
  }
  return { pipeline: basePipeline.jpeg({ quality: bestQ }), quality: bestQ }
}
