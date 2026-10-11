import { Fragment } from 'react'
import { getEditorCatalog, type EditorCatalogKind } from '../../lib/editorCatalog/manifest'
import type { EditorAction, EditorFeature, FeatureFidelity } from '../../lib/editorCatalog/types'
import { ThemeScroll } from '../ThemeScroll'

type EditorFeatureTableProps = {
  kind: EditorCatalogKind
  className?: string
}

function fidelityClass(value: FeatureFidelity): string {
  switch (value) {
    case 'full':
      return 'theme-editor-feature-fidelity theme-editor-feature-fidelity--full'
    case 'partial':
      return 'theme-editor-feature-fidelity theme-editor-feature-fidelity--partial'
    case 'fallback':
      return 'theme-editor-feature-fidelity theme-editor-feature-fidelity--fallback'
    case 'native':
      return 'theme-editor-feature-fidelity theme-editor-feature-fidelity--native'
    default:
      return 'theme-editor-feature-fidelity theme-editor-feature-fidelity--na type-muted'
  }
}

function FidelityCell({
  value,
  labels,
}: {
  value: FeatureFidelity
  labels: Record<FeatureFidelity, string>
}) {
  return (
    <span className={fidelityClass(value)} title={labels[value]}>
      {labels[value]}
    </span>
  )
}

function formatPair(
  feature: EditorFeature,
  format: string,
  labels: Record<FeatureFidelity, string>,
) {
  const imp = feature.import[format] ?? 'na'
  const exp = feature.export[format] ?? 'na'
  if (imp === 'na' && exp === 'na') {
    return <FidelityCell value="na" labels={labels} />
  }
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className="type-caption type-muted">
        in <FidelityCell value={imp} labels={labels} />
      </span>
      <span className="type-caption type-muted">
        out <FidelityCell value={exp} labels={labels} />
      </span>
    </span>
  )
}

function FeatureActionsCell({
  actionIds,
  actionById,
}: {
  actionIds?: string[]
  actionById: (id: string) => EditorAction | undefined
}) {
  if (!actionIds?.length) {
    return <span className="type-muted type-caption">—</span>
  }

  return (
    <ul className="space-y-1">
      {actionIds.map((id) => {
        const action = actionById(id)
        return (
          <li key={id}>
            <code className="type-code type-caption block break-all" title={action?.notation}>
              {id}
            </code>
          </li>
        )
      })}
    </ul>
  )
}

function FeatureRow({
  feature,
  formatIds,
  labels,
  actionById,
}: {
  feature: EditorFeature
  formatIds: string[]
  labels: Record<FeatureFidelity, string>
  actionById: (id: string) => EditorAction | undefined
}) {
  return (
    <tr className="theme-shell-divider border-b align-top">
      <td className="type-mono type-code py-2.5 pr-3 text-xs">{feature.id}</td>
      <td className="py-2.5 pr-3">
        <span className="type-body-sm">{feature.label}</span>
        {feature.notes ? <p className="type-caption type-muted mt-1 max-w-md">{feature.notes}</p> : null}
      </td>
      <td className="py-2.5 pr-3">
        {feature.notation ? (
          <code className="type-code type-caption block max-w-xs whitespace-pre-wrap break-all">
            {feature.notation}
          </code>
        ) : (
          <span className="type-muted type-caption">—</span>
        )}
      </td>
      <td className="py-2.5 pr-3 max-w-[12rem]">
        <FeatureActionsCell actionIds={feature.actions} actionById={actionById} />
      </td>
      {formatIds.map((format) => (
        <td key={format} className="py-2.5 pr-2">
          {formatPair(feature, format, labels)}
        </td>
      ))}
    </tr>
  )
}

function ActionRow({
  action,
  actionKindLabels,
}: {
  action: EditorAction
  actionKindLabels: Record<string, string>
}) {
  return (
    <tr className="theme-shell-divider border-b align-top">
      <td className="type-mono type-code py-2.5 pr-3 text-xs">{action.id}</td>
      <td className="py-2.5 pr-3 type-body-sm">{action.label}</td>
      <td className="py-2.5 pr-3 type-caption">{actionKindLabels[action.kind] ?? action.kind}</td>
      <td className="py-2.5 pr-3">
        <code className="type-code type-caption block max-w-md whitespace-pre-wrap break-all">
          {action.notation}
        </code>
      </td>
      <td className="py-2.5 pr-3 type-caption type-muted">{action.target}</td>
      <td className="py-2.5 pr-3 type-caption">
        {action.defaultValue !== undefined ? (
          <code className="type-code">{String(action.defaultValue)}</code>
        ) : (
          <span className="type-muted">—</span>
        )}
      </td>
      <td className="py-2.5 pr-3 type-caption type-muted max-w-sm">{action.notes ?? '—'}</td>
    </tr>
  )
}

const KIND_LABELS: Record<EditorCatalogKind, string> = {
  doc: 'DocEditor',
  code: 'CodeEditor',
  grid: 'DataGridEditor',
  markdown: 'MarkdownRenderer',
  draw: 'DrawCanvas',
  mermaid: 'MermaidRenderer',
  flow: 'FlowEditor',
  force: 'ForceGraphRenderer',
  files: 'FileExplorer',
  bot: 'BotChat',
  dm: 'DmChat',
  calendar: 'Calendar',
  testform: 'TestForm',
  creator2: 'InterviewCreator',
  copilot: 'Copilot',
}

export function EditorFeatureTable({ kind, className }: EditorFeatureTableProps) {
  const catalog = getEditorCatalog(kind)
  const formatIds = Object.keys(catalog.formatLabels)
  const usableFeatures = catalog.features.filter((f) => f.usable)
  const categories = Object.keys(catalog.categoryLabels).filter((category) =>
    usableFeatures.some((f) => f.category === category),
  )
  const colSpan = 4 + formatIds.length

  const actionById = (id: string) => catalog.actions.find((a) => a.id === id)

  return (
    <section className={className}>
      <div className="space-y-2">
        <p className="type-overline">{KIND_LABELS[kind]} feature map</p>
        <p className="type-body-sm type-muted prose-measure max-w-3xl">
          {usableFeatures.length} usable features from{' '}
          <code className="type-code">lib/editorCatalog/{kind}/features.ts</code> — notation ids, MCT
          action ids, and import/export fidelity per format.
        </p>
      </div>

      <ThemeScroll
        axis="horizontal"
        rail="mini"
        className="theme-table-wrap theme-editor-feature-table-scroll mt-4"
      >
        <table className="theme-table theme-table--compact min-w-[48rem]">
          <caption className="sr-only">{KIND_LABELS[kind]} usable features and conversion fidelity</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left">
                Notation id
              </th>
              <th scope="col" className="text-left">
                Feature
              </th>
              <th scope="col" className="text-left">
                Notation
              </th>
              <th scope="col" className="text-left">
                MCT actions
              </th>
              {formatIds.map((format) => (
                <th key={format} scope="col" className="text-left">
                  {catalog.formatLabels[format as keyof typeof catalog.formatLabels]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const rows = usableFeatures.filter((f) => f.category === category)
              return (
                <Fragment key={category}>
                  <tr className="theme-editor-feature-category-row">
                    <th colSpan={colSpan} scope="colgroup" className="type-caption text-left py-2">
                      {catalog.categoryLabels[category as keyof typeof catalog.categoryLabels]} ({rows.length})
                    </th>
                  </tr>
                  {rows.map((feature) => (
                    <FeatureRow
                      key={feature.id}
                      feature={feature}
                      formatIds={formatIds}
                      labels={catalog.fidelityLabels}
                      actionById={actionById}
                    />
                  ))}
                </Fragment>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={colSpan} className="type-caption type-muted">
                {usableFeatures.length} features · {catalog.actions.length} MCT actions
              </td>
            </tr>
          </tfoot>
        </table>
      </ThemeScroll>

      <div className="space-y-2 mt-8">
        <p className="type-overline">MCT action catalog</p>
        <p className="type-body-sm type-muted prose-measure max-w-3xl">
          Toggle and control affordances for the MCT protocol. Source:{' '}
          <code className="type-code">editorCatalog/{kind}/actions.ts</code>.
        </p>
      </div>

      <ThemeScroll
        axis="horizontal"
        rail="mini"
        className="theme-table-wrap theme-editor-feature-table-scroll mt-4"
      >
        <table className="theme-table theme-table--compact min-w-[56rem]">
          <caption className="sr-only">{KIND_LABELS[kind]} MCT actions</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left">
                Action id
              </th>
              <th scope="col" className="text-left">
                Label
              </th>
              <th scope="col" className="text-left">
                Kind
              </th>
              <th scope="col" className="text-left">
                Notation
              </th>
              <th scope="col" className="text-left">
                Target
              </th>
              <th scope="col" className="text-left">
                Default
              </th>
              <th scope="col" className="text-left">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {catalog.actions.map((action) => (
              <ActionRow
                key={action.id}
                action={action}
                actionKindLabels={catalog.actionKindLabels}
              />
            ))}
          </tbody>
        </table>
      </ThemeScroll>
    </section>
  )
}
