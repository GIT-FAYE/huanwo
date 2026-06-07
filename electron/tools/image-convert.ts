import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

export type ConvertFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff' | 'bmp'

const FORMAT_TO_EXT: Record<ConvertFormat, string> = {
  jpeg: '.jpg', png: '.png', webp: '.webp',
  avif: '.avif', tiff: '.tiff', bmp: '.bmp'
}

interface FileResult {
  input: string
  output: string
  originalSize: number
  outputSize: number
  error?: string
}

interface ConvertResult {
  success: boolean
  results: FileResult[]
  summary: string
}

export async function convertImages(
  files: string[],
  targetFormat: ConvertFormat,
  quality: number,
  outputDir?: string,
  onProgress?: (current: number, total: number, file: string) => void
): Promise<ConvertResult> {
  const results: FileResult[] = []
  let failed = 0

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i]
    onProgress?.(i + 1, files.length, path.basename(filePath))

    try {
      const stat = fs.statSync(filePath)
      const basename = path.basename(filePath, path.extname(filePath))
      const outExt = FORMAT_TO_EXT[targetFormat]

      let outPath: string
      if (outputDir) {
        outPath = path.join(outputDir, basename + outExt)
      } else {
        outPath = path.join(path.dirname(filePath), basename + outExt)
      }

      let pipeline = sharp(filePath)

      switch (targetFormat) {
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality })
          break
        case 'png':
          pipeline = pipeline.png({ compressionLevel: 6 })
          break
        case 'webp':
          pipeline = pipeline.webp({ quality })
          break
        case 'avif':
          pipeline = pipeline.avif({ quality })
          break
        case 'tiff':
          pipeline = pipeline.tiff({ quality })
          break
        case 'bmp':
          pipeline = pipeline.bmp()
          break
      }

      await pipeline.toFile(outPath)

      const outStat = fs.statSync(outPath)
      results.push({
        input: filePath,
        output: outPath,
        originalSize: stat.size,
        outputSize: outStat.size
      })
    } catch (err: any) {
      results.push({
        input: filePath,
        output: '',
        originalSize: 0,
        outputSize: 0,
        error: err.message
      })
      failed++
    }
  }

  return {
    success: failed === 0,
    results,
    summary: `共转换 ${files.length} 张，成功 ${files.length - failed} 张，失败 ${failed} 张`
  }
}
