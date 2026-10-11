import { ExternalLink } from 'lucide-react'
import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import {
  cellTypographyClass,
  dashboardActionIcon,
  dashboardActionLabel,
  dashboardPrimaryText,
  dashboardTagValues,
  parseDashboardActionIds,
  parseDashboardLink,
  parseDashboardUser,
  parseDashboardUsers,
  type DashboardUser,
  pickDataTableCellFormatter,
  resolveColumnDataType,
  resolveDashboardBadgeText,
  resolveDashboardCellDisplay,
  resolveStatusTone,
  resolveStructuredCellKind,
  scalarCellPreview,
  scalarCellShouldTruncate,
  structuredCellNeedsToggle,
  structuredCellPreviewText,
  structuredDashboardSummary,
  type DataColumn,
  type DataRow,
  type DataTableVariant,
} from '../lib/data'
import { semanticDotClass } from '../lib/ui/semanticTone'
import { Badge } from './Badge'
import { Chip } from './Chip'
import { IconButton } from './IconButton'
import { Switch } from './Switch'
import { Tag } from './Tag'
import { ThemeScroll } from './ThemeScroll'

type DataTableCellProps = {
  row: DataRow
  column: DataColumn
  variant?: DataTableVariant
  expanded?: boolean
  onToggleExpand?: () => void
  onBooleanChange?: (rowId: string, columnKey: string, next: boolean) => void
  onAction?: (rowId: string, actionId: string, columnKey: string) => void
  debug?: boolean
}

function DashboardUserChip({ user }: { user: DashboardUser }) {
  const shape = user.shape ?? 'round'
  const initial = user.name.trim().slice(0, 1).toUpperCase() || '?'
  return (
    <span className="theme-data-table__user-chip">
      <span
        className={[
          'theme-data-table__user-chip__media',
          shape === 'square' ? 'theme-data-table__user-chip__media--square' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {user.imageSrc ? (
          <img
            src={user.imageSrc}
            alt={user.imageAlt ?? user.name}
            className="theme-data-table__user-chip__img"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="theme-data-table__user-chip__initial" aria-hidden="true">
            {initial}
          </span>
        )}
      </span>
      <span className="theme-data-table__user-chip__name">{user.name}</span>
    </span>
  )
}

function StructuredCellBody({
  pretty,
  expanded,
  truncatePreview = false,
  scrollViewportRef,
}: {
  pretty: string
  expanded: boolean
  truncatePreview?: boolean
  scrollViewportRef?: RefObject<HTMLDivElement | null>
}) {
  const visible = expanded ? pretty : structuredCellPreviewText(pretty, truncatePreview)

  if (expanded) {
    return (
      <ThemeScroll
        rail="mini"
        scrollClouds={false}
        className="theme-data-table__cell-scroll"
        viewportRef={scrollViewportRef}
      >
        <pre className="theme-data-table__cell-structured-pre">{pretty}</pre>
      </ThemeScroll>
    )
  }

  return <pre className="theme-data-table__cell-structured-pre">{visible}</pre>
}

function ExpandableStructuredCell({
  pretty,
  expanded,
  hostClass,
  onToggleExpand,
}: {
  pretty: string
  expanded: boolean
  hostClass: string
  onToggleExpand?: () => void
}) {
  const scrollViewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!expanded) return
    scrollViewportRef.current?.focus({ preventScroll: true })
  }, [expanded])

  if (expanded) {
    return (
      <div
        className={hostClass}
        aria-expanded="true"
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        <StructuredCellBody pretty={pretty} expanded scrollViewportRef={scrollViewportRef} />
      </div>
    )
  }

  return (
    <button
      type="button"
      className={hostClass}
      aria-expanded="false"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        onToggleExpand?.()
      }}
    >
      <StructuredCellBody pretty={pretty} expanded={false} truncatePreview />
    </button>
  )
}

function DashboardCellBody({
  row,
  column,
  dataType,
  raw,
  onBooleanChange,
  onAction,
}: {
  row: DataRow
  column: DataColumn
  dataType: ReturnType<typeof resolveColumnDataType>
  raw: unknown
  onBooleanChange?: (rowId: string, columnKey: string, next: boolean) => void
  onAction?: (rowId: string, actionId: string, columnKey: string) => void
}) {
  const display = resolveDashboardCellDisplay(column, dataType)

  if (display === 'status') {
    const label = dashboardPrimaryText(raw, dataType)
    if (label === '—') {
      return <span className="type-faint">—</span>
    }
    const tone = resolveStatusTone(raw, column.toneMap)
    return (
      <span className="theme-data-table__cell-dot-text">
        <span className={['theme-data-table__cell-dot', semanticDotClass[tone]].join(' ')} aria-hidden />
        <span className="theme-data-table__cell-dot-text__label">{label}</span>
      </span>
    )
  }

  if (display === 'dot-text') {
    const label = dashboardPrimaryText(raw, dataType)
    if (label === '—') {
      return <span className="type-faint">—</span>
    }
    const tone = resolveStatusTone(raw, column.toneMap)
    return (
      <span className="theme-data-table__cell-dot-text">
        <span className={['theme-data-table__cell-dot', semanticDotClass[tone]].join(' ')} aria-hidden />
        <span className="theme-data-table__cell-dot-text__label">{label}</span>
      </span>
    )
  }

  if (display === 'link') {
    const link = parseDashboardLink(raw)
    if (!link) return <span className="type-faint">—</span>
    const content = (
      <>
        <span className="theme-data-table__cell-link__text">{link.label}</span>
        {link.external ? <ExternalLink className="theme-data-table__cell-link__icon" aria-hidden /> : null}
      </>
    )
    if (link.external) {
      return (
        <a
          className="theme-data-table__cell-link"
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          {content}
        </a>
      )
    }
    return (
      <span className="theme-data-table__cell-link theme-data-table__cell-link--path" title={link.label}>
        {content}
      </span>
    )
  }

  if (display === 'tags') {
    const tags = dashboardTagValues(raw)
    if (tags.length === 0) return <span className="type-faint">—</span>
    return (
      <span className="theme-data-table__cell-kit theme-tag-group">
        {tags.map((tag) => (
          <Tag key={tag} size="sm">
            {tag}
          </Tag>
        ))}
      </span>
    )
  }

  if (display === 'chips') {
    const tags = dashboardTagValues(raw)
    if (tags.length === 0) return <span className="type-faint">—</span>
    return (
      <span className="theme-data-table__cell-kit theme-chip-group">
        {tags.map((tag) => (
          <Chip key={tag} size="xs">
            {tag}
          </Chip>
        ))}
      </span>
    )
  }

  if (display === 'user') {
    const user = parseDashboardUser(raw)
    if (!user) return <span className="type-faint">—</span>
    return <DashboardUserChip user={user} />
  }

  if (display === 'users') {
    const users = parseDashboardUsers(raw)
    if (users.length === 0) return <span className="type-faint">—</span>
    return (
      <span className="theme-data-table__cell-kit theme-data-table__user-chip-group">
        {users.map((user) => (
          <DashboardUserChip key={`${user.name}-${user.imageSrc ?? 'initial'}`} user={user} />
        ))}
      </span>
    )
  }

  if (display === 'boolean-switch') {
    const checked = raw === true || raw === 'true' || raw === 1 || raw === '1'
    return (
      <span
        className="theme-data-table__cell-control"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Switch
          size="xs"
          checked={checked}
          onChange={(next) => onBooleanChange?.(row.id, column.key, next)}
          aria-label={`Toggle ${column.header}`}
        />
      </span>
    )
  }

  if (display === 'text-badge') {
    const primary = dashboardPrimaryText(raw, dataType)
    const badgeText = resolveDashboardBadgeText(row.values, column)
    if (primary === '—' && !badgeText) return <span className="type-faint">—</span>
    return (
      <span className="theme-data-table__cell-text-badge">
        {primary !== '—' ? (
          <span className="theme-data-table__cell-text-badge__primary">{primary}</span>
        ) : null}
        {badgeText ? (
          <Badge tone={resolveStatusTone(badgeText, column.toneMap)}>{badgeText}</Badge>
        ) : null}
      </span>
    )
  }

  if (display === 'actions') {
    const actionIds = parseDashboardActionIds(raw)
    return (
      <span className="theme-data-table__cell-actions">
        {actionIds.map((actionId) => (
          <IconButton
            key={actionId}
            icon={dashboardActionIcon(actionId)}
            aria-label={dashboardActionLabel(actionId)}
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation()
              onAction?.(row.id, actionId, column.key)
            }}
          />
        ))}
      </span>
    )
  }

  const text = dashboardPrimaryText(raw, dataType)
  const truncate = scalarCellShouldTruncate(dataType)
  return (
    <span
      className={[
        'theme-data-table__cell-preview',
        truncate ? 'theme-data-table__cell-preview--truncate' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {text}
    </span>
  )
}

/**
 * Typed table body cell — scalar clamp or structured list/dict/json formatter
 * (in-cell expand, no overlay card). Dashboard variant uses the cell toolkit.
 */
export function DataTableCell({
  row,
  column,
  variant = 'spreadsheet',
  expanded = false,
  onToggleExpand,
  onBooleanChange,
  onAction,
  debug = false,
}: DataTableCellProps) {
  const dataType = resolveColumnDataType(column)
  const raw = row.values[column.key]
  const customCell = row.cells?.[column.key]
  const isDashboard = variant === 'dashboard'
  const hostClassName = (extra = '') =>
    ['theme-data-table__cell-host', isDashboard ? '' : cellTypographyClass(dataType), extra]
      .filter(Boolean)
      .join(' ')

  if (customCell !== undefined && customCell !== null) {
    return (
      <span className={hostClassName()}>
        <span className="theme-data-table__cell-preview">{customCell as ReactNode}</span>
      </span>
    )
  }

  const formatter = pickDataTableCellFormatter({ value: raw, dataType })
  const structuredKind = resolveStructuredCellKind(raw, dataType)

  if (isDashboard) {
    const display = resolveDashboardCellDisplay(column, dataType)
    const useToolkit =
      display === 'tags' ||
      display === 'chips' ||
      display === 'status' ||
      display === 'dot-text' ||
      display === 'link' ||
      display === 'boolean-switch' ||
      display === 'text-badge' ||
      display === 'actions' ||
      display === 'user' ||
      display === 'users' ||
      !structuredKind

    if (useToolkit) {
      if (debug) {
        console.debug('[DataTableCell:dashboard]', { rowId: row.id, col: column.key, display, dataType })
      }
      return (
        <span className={hostClassName()}>
          <DashboardCellBody
            row={row}
            column={column}
            dataType={dataType}
            raw={raw}
            onBooleanChange={onBooleanChange}
            onAction={onAction}
          />
        </span>
      )
    }

    if (formatter && structuredKind) {
      const summary = structuredDashboardSummary(raw, dataType)
      if (debug) {
        console.debug('[DataTableCell:dashboard-summary]', {
          rowId: row.id,
          col: column.key,
          kind: structuredKind,
          summary,
        })
      }
      return (
        <span className="theme-data-table__cell-host">
          <Badge tone="info" className="theme-data-table__cell-summary">
            {summary}
          </Badge>
        </span>
      )
    }
  }

  if (formatter && structuredKind) {
    const pretty = formatter.formatPretty(raw).trim()
    if (!pretty) {
      return (
        <span className="theme-data-table__cell-host theme-data-table__cell-host--structured type-faint">
          —
        </span>
      )
    }

    const needsToggle = structuredCellNeedsToggle(pretty)
    const hostClass = [
      'theme-data-table__cell-host',
      'theme-data-table__cell-host--structured',
      'theme-data-table__cell-val--json',
      'type-code',
      expanded ? 'theme-data-table__cell-host--expanded' : '',
      needsToggle ? 'theme-data-table__cell-host--toggleable' : '',
    ]
      .filter(Boolean)
      .join(' ')

    if (debug) {
      console.debug('[DataTableCell]', {
        rowId: row.id,
        col: column.key,
        kind: structuredKind,
        formatter: formatter.id,
        expanded,
        needsToggle,
      })
    }

    if (!needsToggle) {
      return (
        <span className={hostClass}>
          <StructuredCellBody pretty={pretty} expanded={false} />
        </span>
      )
    }

    return (
      <ExpandableStructuredCell
        pretty={pretty}
        expanded={expanded}
        hostClass={hostClass}
        onToggleExpand={onToggleExpand}
      />
    )
  }

  const preview = scalarCellPreview(raw, dataType)
  const truncate = scalarCellShouldTruncate(dataType)

  if (debug) {
    console.debug('[DataTableCell]', { rowId: row.id, col: column.key, dataType, preview, truncate })
  }

  return (
    <span className={hostClassName()}>
      <span
        className={[
          'theme-data-table__cell-preview',
          truncate ? 'theme-data-table__cell-preview--truncate' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {preview}
      </span>
    </span>
  )
}
