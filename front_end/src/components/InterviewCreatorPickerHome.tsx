import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Code2,
  Copy,
  FilePlus,
  FileText,
  Layers,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react'
import { SearchInput } from './SearchInput'
import { IconButton } from './IconButton'
import { Tag } from './Tag'
import { VurifyIcon } from './VurifyIcon'
import { VurifyMenuButton } from './VurifyMenuButton'
import { gsap, useGSAP, useGsapPageOptional } from '../lib/gsap'
import {
  CREATE_TEMPLATE_CATALOG,
  CREATE_TEMPLATE_KIND_LABEL,
  cachedCreateTemplatePreview,
  type CreateTemplateId,
  type InterviewManagerListItem,
  interviewManagerCategoryIcon,
  interviewManagerCategoryLabel,
  interviewWindowFields,
} from '../lib/interviewBrief'

const TEMPLATE_ICONS: Record<CreateTemplateId, LucideIcon> = {
  'create.form': ClipboardList,
  'create.talk': MessageCircle,
  'create.coding': Code2,
  'create.doc': FileText,
  'create.full': Layers,
}

export type InterviewCreatorPickerHomeProps = {
  items: InterviewManagerListItem[]
  starting?: boolean
  startingId?: string | null
  listError?: string | null
  onBack: () => void
  onBlank: () => void
  onTemplate: (id: CreateTemplateId) => void
  onCopyExisting: (item: InterviewManagerListItem) => void
}

export function InterviewCreatorPickerHome({
  items,
  starting = false,
  startingId = null,
  listError = null,
  onBack,
  onBlank,
  onTemplate,
  onCopyExisting,
}: InterviewCreatorPickerHomeProps) {
  const [listQuery, setListQuery] = useState('')
  const [copyMode, setCopyMode] = useState(false)
  const homeRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const revealedCountRef = useRef(0)
  const gsapPage = useGsapPageOptional()
  const reducedMotion = gsapPage?.reducedMotion ?? false

  const templates = useMemo(() => {
    const q = listQuery.trim().toLowerCase()
    if (!q || copyMode) return [...CREATE_TEMPLATE_CATALOG]
    return CREATE_TEMPLATE_CATALOG.filter((row) => {
      const steps = row.kinds.map((kind) => CREATE_TEMPLATE_KIND_LABEL[kind]).join(' ')
      const hay = `${row.title} ${row.summary} ${row.description} ${steps}`.toLowerCase()
      return hay.includes(q)
    })
  }, [copyMode, listQuery])

  const copyItems = useMemo(() => {
    const scoped = items.filter((item) => item.status !== 'archived')
    const q = listQuery.trim().toLowerCase()
    if (!q) return scoped
    return scoped.filter((item) => {
      const hay = [item.title, item.roleTitle, item.category, item.description].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [items, listQuery])

  useEffect(() => {
    revealedCountRef.current = 0
  }, [copyMode, listQuery])

  const visibleKey = copyMode
    ? copyItems.map((item) => item.id).join('|')
    : templates.map((row) => row.id).join('|')

  useGSAP(
    () => {
      const root = listRef.current
      if (!root) return
      const rows = Array.from(root.querySelectorAll('.theme-interview-creator__list-item'))
      if (!rows.length) {
        revealedCountRef.current = 0
        return
      }
      const fresh = rows.slice(revealedCountRef.current)
      revealedCountRef.current = rows.length
      if (!fresh.length) return
      if (reducedMotion) {
        gsap.set(fresh, { clearProps: 'opacity,transform' })
        return
      }
      gsap.fromTo(
        fresh,
        { y: 10, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.34,
          stagger: 0.035,
          ease: 'power2.out',
          overwrite: 'auto',
        },
      )
    },
    { dependencies: [visibleKey, reducedMotion], scope: listRef },
  )

  useLayoutEffect(() => {
    homeRef.current?.querySelector<HTMLElement>('button')?.focus()
  }, [])

  const busy = starting
  const searchLabel = copyMode ? 'Search interviews' : 'Search assessment templates'

  return (
    <div ref={homeRef} className="theme-interview-creator__manage-home">
      <header className="theme-interview-creator__manage-header">
        <h2 className="type-display-md mb-0 theme-interview-creator__manage-title" data-dash-anim>
          New interview
        </h2>
        <div className="theme-interview-creator__manage-divider" aria-hidden data-dash-anim />
        <div className="theme-interview-creator__manage-create" data-dash-anim>
          <VurifyMenuButton
            variant="label"
            size="md"
            housing
            activeChrome={false}
            icon={ArrowLeft}
            iconPosition="left"
            lineTone="muted"
            onClick={onBack}
            disabled={busy}
          >
            Back
          </VurifyMenuButton>
        </div>
      </header>

      <div className="theme-interview-creator__manage-body">
        <div className="theme-interview-creator__manage-toolbar theme-interview-creator__manage-toolbar--picker" data-dash-anim>
          <div className="theme-interview-creator__manage-search">
            <SearchInput
              size="lg"
              variant="vurify"
              label={searchLabel}
              value={listQuery}
              onValueChange={setListQuery}
              ariaLabel={searchLabel}
            />
          </div>
          <ul className="theme-interview-creator__picker-actions" aria-label="Create actions">
            <li>
              <VurifyMenuButton
                variant="label"
                size="md"
                housing
                activeChrome={false}
                icon={FilePlus}
                iconPosition="left"
                lineTone="accent"
                onClick={onBlank}
                disabled={busy}
                className="theme-interview-creator__picker-action"
              >
                Create from blank
              </VurifyMenuButton>
            </li>
            <li aria-hidden>
              <span className="theme-interview-creator__picker-rule" />
            </li>
            <li>
              <VurifyMenuButton
                variant="label"
                size="md"
                housing
                activeChrome={copyMode}
                icon={Copy}
                iconPosition="left"
                lineTone="complement"
                onClick={() => setCopyMode((v) => !v)}
                disabled={busy}
                className="theme-interview-creator__picker-action"
              >
                Copy from existing
              </VurifyMenuButton>
            </li>
          </ul>
        </div>

        <section
          className="theme-interview-creator__library"
          data-dash-anim
          aria-label={copyMode ? 'Your interviews' : 'Assessment templates'}
        >
          <div className="theme-interview-creator__library-head">
            <p className="type-overline mb-0">{copyMode ? 'Your interviews' : 'Assessment templates'}</p>
            <p className="type-caption type-muted mb-0 theme-interview-creator__library-count">
              {copyMode ? `${copyItems.length} briefs` : `${templates.length} templates`}
            </p>
          </div>
          {listError ? (
            <p className="type-caption type-error mb-0" role="alert">
              {listError}
            </p>
          ) : null}
          {copyMode ? (
            copyItems.length ? (
              <ul ref={listRef} className="theme-interview-creator__list">
                {copyItems.map((item) => (
                  <PickerCopyRow
                    key={item.id}
                    item={item}
                    loading={startingId === item.id}
                    disabled={busy}
                    onSelect={onCopyExisting}
                  />
                ))}
              </ul>
            ) : (
              <p className="theme-interview-creator__list-empty-title type-body mb-0">
                No interviews to copy yet.
              </p>
            )
          ) : templates.length ? (
            <ul ref={listRef} className="theme-interview-creator__list">
              {templates.map((row) => (
                <PickerTemplateRow
                  key={row.id}
                  id={row.id}
                  loading={startingId === row.id}
                  disabled={busy}
                  onSelect={onTemplate}
                />
              ))}
            </ul>
          ) : (
            <p className="theme-interview-creator__list-empty-title type-body mb-0">
              No assessment templates match that search.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

function PickerTemplateRow({
  id,
  loading,
  disabled,
  onSelect,
}: {
  id: CreateTemplateId
  loading: boolean
  disabled: boolean
  onSelect: (id: CreateTemplateId) => void
}) {
  const preview = cachedCreateTemplatePreview(id)
  const Icon = TEMPLATE_ICONS[id]
  const stepLine =
    preview.phaseCount === 1 ? '1 step' : `${preview.phaseCount} steps`

  return (
    <li
      className={[
        'theme-interview-creator__list-item',
        loading ? 'is-opening' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-template-id={id}
      aria-busy={loading ? true : undefined}
    >
      <article
        className="theme-interview-creator__list-row"
        role="button"
        tabIndex={loading || disabled ? -1 : 0}
        aria-label={loading ? `Starting ${preview.title}` : `Start ${preview.title}`}
        aria-disabled={loading || disabled || undefined}
        onClick={() => {
          if (loading || disabled) return
          onSelect(id)
        }}
        onKeyDown={(event) => {
          if (loading || disabled) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect(id)
          }
        }}
      >
        <span className="theme-interview-creator__list-mark" aria-hidden>
          <VurifyIcon icon={Icon} variant="plain" tone="muted" size="sm" />
        </span>
        <div className="theme-interview-creator__list-main">
          <div className="theme-interview-creator__list-rest">
            <div className="theme-interview-creator__list-heading">
              <h3 className="mb-0 theme-interview-creator__list-title" title={preview.title}>
                {preview.title}
              </h3>
              <div className="theme-interview-creator__list-heading-trail">
                <IconButton
                  icon={ChevronDown}
                  size="xs"
                  variant="ghost"
                  aria-label="More details on hover"
                  className="theme-interview-creator__list-expand"
                  onClick={(event) => event.stopPropagation()}
                />
              </div>
            </div>
            <div className="theme-interview-creator__list-sub">
              <div
                className="theme-interview-creator__list-tags theme-tag-group theme-interview-flow-timeline__tags"
                aria-label={`${preview.title} summary`}
              >
                {preview.restTags.map((tag) => {
                  const StepIcon =
                    tag.label === 'Form'
                      ? ClipboardList
                      : tag.label === 'Conversation'
                        ? MessageCircle
                        : tag.label === 'Coding'
                          ? Code2
                          : tag.label === 'Writing'
                            ? FileText
                            : ClipboardList
                  return (
                    <Tag key={tag.label} size="sm" className="theme-interview-flow-timeline__tag">
                      <StepIcon
                        className="theme-interview-flow-timeline__tag-icon size-3 shrink-0"
                        aria-hidden
                      />
                      <span>{tag.label}</span>
                    </Tag>
                  )
                })}
              </div>
            </div>
            {preview.description?.trim() ? (
              <p className="mb-0 theme-interview-creator__list-blurb">{preview.description.trim()}</p>
            ) : null}
          </div>
          <div className="theme-interview-creator__list-more">
            <div className="theme-interview-creator__list-more-inner">
              <div
                className="theme-interview-creator__list-meta-tags theme-tag-group theme-interview-flow-timeline__tags"
                aria-label={`${preview.title} details`}
              >
                <Tag size="sm" className="theme-interview-flow-timeline__tag">
                  <Layers
                    className="theme-interview-flow-timeline__tag-icon size-3 shrink-0"
                    aria-hidden
                  />
                  <span>{stepLine}</span>
                </Tag>
                <Tag size="sm" className="theme-interview-flow-timeline__tag">
                  <Clock
                    className="theme-interview-flow-timeline__tag-icon size-3 shrink-0"
                    aria-hidden
                  />
                  <span>{preview.estimatedMinutes}m</span>
                </Tag>
              </div>
            </div>
          </div>
        </div>
        <span
          className="theme-interview-creator__list-row-load-line"
          data-active={loading ? 'true' : 'false'}
          aria-hidden={loading ? undefined : true}
          role={loading ? 'status' : undefined}
        >
          {loading ? <span className="sr-only">Starting interview</span> : null}
        </span>
      </article>
    </li>
  )
}

function PickerCopyRow({
  item,
  loading,
  disabled,
  onSelect,
}: {
  item: InterviewManagerListItem
  loading: boolean
  disabled: boolean
  onSelect: (item: InterviewManagerListItem) => void
}) {
  const Icon = interviewManagerCategoryIcon(item.category)
  const categoryLabel = interviewManagerCategoryLabel(item.category)
  const window = interviewWindowFields(item)
  const StatusIcon =
    item.status === 'published' ? CheckCircle2 : item.status === 'archived' ? Archive : FileText
  const stepLine =
    item.toolPhaseCount > 0
      ? `${item.phaseCount} steps · ${item.toolPhaseCount} tools`
      : `${item.phaseCount} steps`

  return (
    <li
      className={[
        'theme-interview-creator__list-item',
        loading ? 'is-opening' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-interview-id={item.id}
      aria-busy={loading ? true : undefined}
    >
      <article
        className="theme-interview-creator__list-row"
        role="button"
        tabIndex={loading || disabled ? -1 : 0}
        aria-label={loading ? `Copying ${item.title}` : `Copy ${item.title}`}
        aria-disabled={loading || disabled || undefined}
        onClick={() => {
          if (loading || disabled) return
          onSelect(item)
        }}
        onKeyDown={(event) => {
          if (loading || disabled) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect(item)
          }
        }}
      >
        <span className="theme-interview-creator__list-mark" aria-hidden>
          <VurifyIcon icon={Icon} variant="plain" tone="muted" size="sm" />
        </span>
        <div className="theme-interview-creator__list-main">
          <div className="theme-interview-creator__list-rest">
            <div className="theme-interview-creator__list-heading">
              <h3 className="mb-0 theme-interview-creator__list-title" title={item.title}>
                {item.title}
              </h3>
              <p
                className="type-caption mb-0 theme-interview-creator__list-dates"
                aria-label={`Window ${window.openLabel} to ${window.closeLabel}`}
              >
                <time
                  className="theme-interview-creator__list-date"
                  data-tone={window.openTone}
                  dateTime={window.openIso}
                >
                  {window.openLabel}
                </time>
                <span className="theme-interview-creator__list-date-sep" aria-hidden>
                  –
                </span>
                <time
                  className="theme-interview-creator__list-date"
                  data-tone={window.closeTone}
                  dateTime={window.closeIso}
                >
                  {window.closeLabel}
                </time>
              </p>
            </div>
            <div className="theme-interview-creator__list-sub">
              <div
                className="theme-interview-creator__list-tags theme-tag-group theme-interview-flow-timeline__tags"
                aria-label={`${item.title} summary`}
              >
                <Tag size="sm" className="theme-interview-flow-timeline__tag">
                  <Icon
                    className="theme-interview-flow-timeline__tag-icon size-3 shrink-0"
                    aria-hidden
                  />
                  <span>{categoryLabel}</span>
                </Tag>
                {item.roleTitle ? (
                  <Tag size="sm" className="theme-interview-flow-timeline__tag">
                    <ClipboardList
                      className="theme-interview-flow-timeline__tag-icon size-3 shrink-0"
                      aria-hidden
                    />
                    <span>{item.roleTitle}</span>
                  </Tag>
                ) : null}
              </div>
            </div>
            {item.description?.trim() ? (
              <p className="mb-0 theme-interview-creator__list-blurb">{item.description.trim()}</p>
            ) : null}
          </div>
          <div className="theme-interview-creator__list-more">
            <div className="theme-interview-creator__list-more-inner">
              <div
                className="theme-interview-creator__list-meta-tags theme-tag-group theme-interview-flow-timeline__tags"
                aria-label={`${item.title} details`}
              >
                <Tag
                  size="sm"
                  className={`theme-interview-flow-timeline__tag theme-interview-creator__status-tag theme-interview-creator__status--${item.status}`}
                >
                  <StatusIcon
                    className="theme-interview-flow-timeline__tag-icon size-3 shrink-0"
                    aria-hidden
                  />
                  <span>{item.status}</span>
                </Tag>
                <Tag size="sm" className="theme-interview-flow-timeline__tag">
                  <Layers
                    className="theme-interview-flow-timeline__tag-icon size-3 shrink-0"
                    aria-hidden
                  />
                  <span>{stepLine}</span>
                </Tag>
                <Tag size="sm" className="theme-interview-flow-timeline__tag">
                  <Clock
                    className="theme-interview-flow-timeline__tag-icon size-3 shrink-0"
                    aria-hidden
                  />
                  <span>{item.estimatedMinutes}m</span>
                </Tag>
              </div>
            </div>
          </div>
        </div>
        <span
          className="theme-interview-creator__list-row-load-line"
          data-active={loading ? 'true' : 'false'}
          aria-hidden={loading ? undefined : true}
          role={loading ? 'status' : undefined}
        >
          {loading ? <span className="sr-only">Copying interview</span> : null}
        </span>
      </article>
    </li>
  )
}
