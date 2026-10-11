import { useState, type KeyboardEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card } from './Card'
import { Tag } from './Tag'
import { VurifyIcon } from './VurifyIcon'
import { MOCKUP_ICON_MAP, type MockupIconId, type MockupKind } from '../lib/mockups/types'

type MockupBlockProps = {
  kind: MockupKind
  title?: string
  kicker?: string
  body?: string
  pills?: readonly string[]
  iconId?: MockupIconId
  gleam?: boolean
  defaultOpen?: boolean
  step?: string
  metric?: string
  compact?: boolean
  /** Skip the outer Card — flow nodes already ship a Card shell. */
  embedded?: boolean
  className?: string
}

function mockupClasses(props: MockupBlockProps, gleam: boolean): string {
  return [
    'theme-mockup',
    `theme-mockup--${props.kind}`,
    gleam ? 'theme-mockup--gleam' : '',
    props.compact ? 'theme-mockup--compact' : '',
    props.embedded ? 'theme-mockup--embedded' : '',
    props.className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}

function TitleBlock({
  kicker,
  title,
  body,
}: {
  kicker?: string
  title?: string
  body?: string
}) {
  return (
    <div className="theme-mockup__copy min-w-0">
      {kicker ? <p className="theme-mockup__kicker type-overline mb-0">{kicker}</p> : null}
      {title ? <p className="theme-mockup__title type-h5 mb-0">{title}</p> : null}
      {body ? <p className="theme-mockup__body type-body-sm type-muted mb-0">{body}</p> : null}
    </div>
  )
}

function PillsRow({ pills, iconId }: { pills: readonly string[]; iconId: MockupIconId }) {
  const Icon = MOCKUP_ICON_MAP[iconId]
  return (
    <div className="theme-mockup__pills">
      <VurifyIcon icon={Icon} size="sm" tone="accent" variant="bordered" />
      <div className="theme-mockup__pill-list">
        {pills.map((pill) => (
          <Tag key={pill} size="xs">
            {pill}
          </Tag>
        ))}
      </div>
    </div>
  )
}

function ExpandBody({
  title,
  kicker,
  body,
  defaultOpen,
}: {
  title?: string
  kicker?: string
  body?: string
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const heading = title || kicker || 'Details'

  const onToggle = () => setOpen((value) => !value)
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onToggle()
    }
  }

  return (
    <div className="theme-mockup__expand">
      {kicker ? <p className="theme-mockup__kicker type-overline mb-0">{kicker}</p> : null}
      <button
        type="button"
        className="theme-mockup__fold-trigger"
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={onKeyDown}
      >
        <span className="theme-mockup__title type-label mb-0">{heading}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          aria-hidden
          className={['theme-mockup__chevron', open ? 'theme-mockup__chevron--open' : '']
            .filter(Boolean)
            .join(' ')}
        />
      </button>
      <div
        className={['theme-mockup__fold', open ? 'theme-mockup__fold--open' : ''].filter(Boolean).join(' ')}
      >
        <div className="theme-mockup__fold-inner">
          {body ? <p className="theme-mockup__body type-body-sm type-muted mb-0">{body}</p> : null}
        </div>
      </div>
    </div>
  )
}

function MockupInner(props: MockupBlockProps) {
  const iconId = props.iconId ?? 'sparkles'
  const Icon = MOCKUP_ICON_MAP[iconId]
  const pills = props.pills ?? []

  switch (props.kind) {
    case 'expand':
      return (
        <ExpandBody
          title={props.title}
          kicker={props.kicker}
          body={props.body}
          defaultOpen={Boolean(props.defaultOpen)}
        />
      )
    case 'pills':
      return (
        <div className="theme-mockup__stack min-w-0">
          {props.title ? <p className="theme-mockup__title type-label mb-0">{props.title}</p> : null}
          {props.body ? <p className="theme-mockup__body type-body-sm type-muted mb-0">{props.body}</p> : null}
          <PillsRow pills={pills} iconId={iconId} />
        </div>
      )
    case 'callout':
      return (
        <div className="theme-mockup__callout">
          <VurifyIcon icon={Icon} size="sm" tone="accent" variant="bordered" />
          <TitleBlock title={props.title} body={props.body} />
        </div>
      )
    case 'step':
      return (
        <div className="theme-mockup__step">
          <span className="theme-mockup__step-index type-caption type-tabular" aria-hidden>
            {props.step || '01'}
          </span>
          <TitleBlock title={props.title} body={props.body} />
        </div>
      )
    case 'metric':
      return (
        <div className="theme-mockup__metric">
          <p className="theme-mockup__metric-value type-h3 type-tabular mb-0">{props.metric || '—'}</p>
          <TitleBlock kicker={props.kicker} title={props.title} body={props.body} />
        </div>
      )
    case 'window':
      return (
        <>
          <div className="theme-mockup__window-bar">
            <span className="theme-mockup__window-dot" aria-hidden />
            <span className="theme-mockup__window-dot" aria-hidden />
            <span className="theme-mockup__window-dot" aria-hidden />
            {props.kicker ? (
              <span className="theme-mockup__window-url type-caption type-faint">{props.kicker}</span>
            ) : null}
          </div>
          <div className="theme-mockup__window-body">
            <TitleBlock title={props.title} body={props.body} />
          </div>
        </>
      )
    default:
      return <TitleBlock kicker={props.kicker} title={props.title} body={props.body} />
  }
}

export function MockupBlock(props: MockupBlockProps) {
  const gleam = props.kind === 'gleam' || Boolean(props.gleam)
  const className = mockupClasses(props, gleam)
  const inner = <MockupInner {...props} />

  if (props.embedded) {
    return <div className={className}>{inner}</div>
  }

  return (
    <Card variant="raised" shadowVariant="none" className={className}>
      {inner}
    </Card>
  )
}
