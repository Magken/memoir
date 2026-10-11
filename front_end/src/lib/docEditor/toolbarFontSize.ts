export type DocEditorHeadingBlock = 'paragraph' | 'h1' | 'h2' | 'h3'

/** CSS defaults from doc-editor.css — 1rem = 16px */
export const BLOCK_DEFAULT_FONT_SIZE_PX: Record<DocEditorHeadingBlock, number> = {
  paragraph: 16,
  h1: 32,
  h2: 24,
  h3: 18,
}

export function blockDefaultFontSizePx(blockType: string): number {
  if (blockType === 'h1') return BLOCK_DEFAULT_FONT_SIZE_PX.h1
  if (blockType === 'h2') return BLOCK_DEFAULT_FONT_SIZE_PX.h2
  if (blockType === 'h3') return BLOCK_DEFAULT_FONT_SIZE_PX.h3
  return BLOCK_DEFAULT_FONT_SIZE_PX.paragraph
}

export function resolveToolbarFontSizePx(inlineFontSize: string, blockType: string): number {
  const trimmed = inlineFontSize.trim()
  if (trimmed) {
    const match = trimmed.match(/^(\d+(?:\.\d+)?)px$/)
    if (match) {
      const parsed = Math.round(Number(match[1]))
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return blockDefaultFontSizePx(blockType)
}
