import {
  buildNanoAnchorMenuTree,
  type NanoAnchorMenuEntry,
} from '../menus/nanoAnchorMenu'
import type { DocArticleTocEntry, DocArticleTocNode } from './docArticleTypes'

export function buildDocArticleTocTree(entries: readonly DocArticleTocEntry[]): DocArticleTocNode[] {
  const menuEntries: NanoAnchorMenuEntry[] = entries.map((entry) => ({
    id: entry.id,
    label: entry.label,
    level: entry.level,
  }))
  return buildNanoAnchorMenuTree(menuEntries) as DocArticleTocNode[]
}
