import { EditorFeatureTable } from './EditorFeatureTable'

type DocEditorFeatureTableProps = {
  className?: string
}

/** DocEditor catalog table — thin wrapper over shared EditorFeatureTable. */
export function DocEditorFeatureTable({ className }: DocEditorFeatureTableProps) {
  return <EditorFeatureTable kind="doc" className={className} />
}
