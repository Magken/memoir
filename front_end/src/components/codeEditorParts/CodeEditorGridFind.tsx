import type { CodeEditorGridSearchHost } from '../../lib/codeEditor/searchHotwire'
import { DataGridEditorFind } from '../dataGridEditorParts/DataGridEditorFind'

type CodeEditorGridFindProps = {
  host: CodeEditorGridSearchHost
}

export function CodeEditorGridFind({ host }: CodeEditorGridFindProps) {
  return (
    <DataGridEditorFind
      layout="sidebar"
      open
      sheet={host.sheet}
      editable={host.editable}
      onMutateSheet={host.onMutateSheet}
      onSearchResultsChange={host.onSearchResultsChange}
      onSelectCell={host.selectCell}
      onScrollToCell={host.scrollToCell}
    />
  )
}
