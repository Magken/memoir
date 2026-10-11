import { $insertNodeToNearestRoot } from '@lexical/utils'
import type { LexicalNode } from 'lexical'

/** Insert a top-level block and leave the caret in a trailing paragraph when needed. */
export function $insertBlockNode(node: LexicalNode): LexicalNode {
  return $insertNodeToNearestRoot(node)
}
