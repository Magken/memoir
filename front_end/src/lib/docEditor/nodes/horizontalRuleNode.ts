import {
  $applyNodeReplacement,
  ElementNode,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type SerializedElementNode,
} from 'lexical'

export type SerializedHorizontalRuleNode = SerializedElementNode & {
  type: 'horizontalrule'
  version: 1
}

export class HorizontalRuleNode extends ElementNode {
  static getType(): string {
    return 'horizontalrule'
  }

  static clone(node: HorizontalRuleNode): HorizontalRuleNode {
    return new HorizontalRuleNode(node.__key)
  }

  createDOM(config: EditorConfig): HTMLElement {
    const hr = document.createElement('hr')
    const themeClass = config.theme.hr
    if (themeClass) hr.className = themeClass
    return hr
  }

  updateDOM(): boolean {
    return false
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const hr = document.createElement('hr')
    hr.className = 'doc-export-hr'
    return { element: hr }
  }

  static importJSON(_serialized: SerializedHorizontalRuleNode): HorizontalRuleNode {
    return $createHorizontalRuleNode()
  }

  exportJSON(): SerializedHorizontalRuleNode {
    return { ...super.exportJSON(), type: 'horizontalrule', version: 1 }
  }

  getTextContent(): string {
    return '\n'
  }

  canInsertTextBefore(): boolean {
    return false
  }

  canInsertTextAfter(): boolean {
    return false
  }

  canBeEmpty(): boolean {
    return true
  }

  isInline(): boolean {
    return false
  }
}

export function $createHorizontalRuleNode(): HorizontalRuleNode {
  return $applyNodeReplacement(new HorizontalRuleNode())
}

export function $isHorizontalRuleNode(
  node: LexicalNode | null | undefined,
): node is HorizontalRuleNode {
  return node instanceof HorizontalRuleNode
}
