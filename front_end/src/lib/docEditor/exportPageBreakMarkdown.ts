/** Type-guard for Lexical markdown export — first non-null transformer wins. */
export function exportPageBreakMarkdown(node: { getType: () => string }): string | null {
  return node.getType() === 'page-break' ? ':::doc-page-break' : null
}
