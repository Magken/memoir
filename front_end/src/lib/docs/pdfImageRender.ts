import { OPS } from 'pdfjs-dist'
import type { PDFPageProxy } from 'pdfjs-dist'

export const PDF_IMAGE_THUMB_WIDTH = 112

const IMAGE_OPS = new Set<number>([
  OPS.paintImageXObject,
  OPS.paintInlineImageXObject,
  OPS.paintImageXObjectRepeat,
  OPS.paintInlineImageXObjectGroup,
])

type PdfImageLike = {
  width?: number
  height?: number
  data?: Uint8ClampedArray | Uint8Array | null
  bitmap?: ImageBitmap | null
}

type PdfObjectStore = {
  get: (id: string, callback: (obj: unknown) => void) => void
}

function pdfObjectStore(page: PDFPageProxy, objectId: string): PdfObjectStore {
  return (objectId.startsWith('g_') ? page.commonObjs : page.objs) as PdfObjectStore
}

function promisifyPdfObjGet(store: PdfObjectStore, objectId: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    store.get(objectId, (obj: unknown) => {
      if (obj) resolve(obj)
      else reject(new Error(`PDF object not resolved: ${objectId}`))
    })
  })
}

async function resolveImageAtIndex(
  page: PDFPageProxy,
  indexOnPage: number,
): Promise<PdfImageLike | null> {
  const operatorList = await page.getOperatorList()
  let seen = -1

  for (let index = 0; index < operatorList.fnArray.length; index += 1) {
    if (!IMAGE_OPS.has(operatorList.fnArray[index]!)) continue
    seen += 1
    if (seen !== indexOnPage) continue

    const args = operatorList.argsArray[index]
    if (!Array.isArray(args) || args.length === 0) return null

    if (operatorList.fnArray[index] === OPS.paintInlineImageXObject) {
      return args[0] as PdfImageLike
    }

    const objectId = args[0]
    if (typeof objectId !== 'string') return null

    try {
      return (await promisifyPdfObjGet(pdfObjectStore(page, objectId), objectId)) as PdfImageLike
    } catch {
      return null
    }
  }

  return null
}

function pdfImageToDataUrl(image: PdfImageLike, maxWidth: number): string | null {
  const width = image.width
  const height = image.height
  if (!width || !height) return null

  const scale = maxWidth / width
  const layoutW = Math.max(1, Math.floor(width * scale))
  const layoutH = Math.max(1, Math.floor(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = layoutW
  canvas.height = layoutH
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return null

  if (image.bitmap) {
    ctx.drawImage(image.bitmap, 0, 0, layoutW, layoutH)
    return canvas.toDataURL('image/png')
  }

  const src = image.data
  if (!src || src.length === 0) return null

  const pixelCount = width * height
  let rgba: Uint8ClampedArray | null = null

  if (src.length === pixelCount * 4) {
    rgba = new Uint8ClampedArray(src.buffer, src.byteOffset, src.length)
  } else if (src.length === pixelCount * 3) {
    rgba = new Uint8ClampedArray(pixelCount * 4)
    for (let i = 0, j = 0; i < pixelCount; i += 1, j += 3) {
      const offset = i * 4
      rgba[offset] = src[j]!
      rgba[offset + 1] = src[j + 1]!
      rgba[offset + 2] = src[j + 2]!
      rgba[offset + 3] = 255
    }
  }

  if (!rgba) return null

  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = width
  srcCanvas.height = height
  const srcCtx = srcCanvas.getContext('2d')
  if (!srcCtx) return null

  srcCtx.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0)
  ctx.drawImage(srcCanvas, 0, 0, layoutW, layoutH)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export async function renderPdfImageThumbnail(
  page: PDFPageProxy,
  indexOnPage: number,
  maxWidth = PDF_IMAGE_THUMB_WIDTH,
): Promise<string | null> {
  const image = await resolveImageAtIndex(page, indexOnPage)
  if (!image) return null
  return pdfImageToDataUrl(image, maxWidth)
}
