import {
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Copy,
  ListChecks,
  RefreshCw,
  Smile,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type {
  ChatAttachment,
  ChatMessage,
  ChatParticipant,
  ChatPlanQuestion,
  MessagePart,
} from '../../lib/chat/types'
import { buildChatErrorMessage, CHAT_ERROR_SENDER } from '../../lib/chat/errorBubble'
import { ensureChatHtmlSanitizer, sanitizeChatHtml } from '../../lib/chat/sanitizeHtml'
import { formatBytes, planningIsClosed } from '../../lib/chat/utils'
import { formatMessageClock } from '../../lib/chat/time'
import { gsap, useGSAP } from '../../lib/gsap'
import { Button } from '../Button'
import { ImagePickerCarousel } from '../ImagePickerCarousel'
import { ImagePickerCarouselHost } from '../ImagePickerCarouselHost'
import { IconButton } from '../IconButton'
import { MarkdownRendererEmbed } from '../MarkdownRenderer'
import { MenuButton } from '../MenuButton'
import { Tag } from '../Tag'
import { VurifyMenuButton } from '../VurifyMenuButton'
import { ChatAvatar } from './ChatAvatar'
import { ChatCopyControl } from './ChatCopyControl'

const DEFAULT_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']
const CHAT_FOG_COLLAPSED_PX = 112
const CHAT_COLLAPSE_MS = 0.34
const BOARD_ASSISTANT_FALLBACK = 'Vurex'

function boardHeadName(isBot: boolean, displayName?: string, kind?: ChatMessage['kind']): string {
  if (kind === 'error') return 'Error'
  if (!isBot) return 'You'
  const name = displayName?.trim()
  return name || BOARD_ASSISTANT_FALLBACK
}

/** Plain text shorter than this never gets See more (avoids false positives on 1–2 liners). */
function textLooksLongEnoughForFog(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (trimmed.length > 220) return true
  return trimmed.split(/\n/).filter((line) => line.trim().length > 0).length > 3
}

type ChatMessagePartsProps = {
  parts: readonly MessagePart[]
  onCardAction?: (actionId: string, value?: string) => void | Promise<void>
  onOpenAttachment?: (attachment: ChatAttachment) => void
  /** Board peel — Vurify-style action buttons, less card chrome. */
  cardChrome?: 'default' | 'vurify'
  /** Latest assistant reply — fog parts start expanded until a newer bot reply arrives. */
  fogDefaultOpen?: boolean
  /** Reopen pending questionnaire (composer Questions sheet). */
  onPlanningReopen?: (partIndex: number) => void
  /** Only this part index may reopen — older questionnaires stay locked. */
  livePlanningPartIndex?: number | null
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function CollapseToggle({
  open,
  label,
  onClick,
}: {
  open: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="theme-chat-part__collapse-toggle type-caption"
      aria-expanded={open}
      onClick={onClick}
    >
      <span className="theme-chat-part__collapse-summary">{label}</span>
      <ChevronDown className="theme-chat-part__collapse-chevron size-4 shrink-0" aria-hidden />
    </button>
  )
}

function useClipHeight(open: boolean, collapsedPx: number, contentKey: string) {
  const clipRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const primed = useRef(false)
  const prevContentKeyRef = useRef(contentKey)
  const [needsToggle, setNeedsToggle] = useState(false)
  const [measureTick, setMeasureTick] = useState(0)

  useEffect(() => {
    const prev = prevContentKeyRef.current
    prevContentKeyRef.current = contentKey
    if (!prev || prev === contentKey) return
    // Type-in grows the same reply; stripping the final ask shrinks it.
    // Re-priming here snaps the clip after the stream finishes.
    const related = contentKey.startsWith(prev) || prev.startsWith(contentKey)
    if (!related) primed.current = false
  }, [contentKey])

  useEffect(() => {
    const inner = innerRef.current
    if (!inner || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      setMeasureTick((n) => n + 1)
    })
    ro.observe(inner)
    return () => ro.disconnect()
  }, [contentKey])

  useGSAP(
    () => {
      const clip = clipRef.current
      const inner = innerRef.current
      if (!clip || !inner) return

      const full = Math.max(inner.scrollHeight, 0)
      const overflow = full > collapsedPx + 24
      setNeedsToggle(overflow)

      const end = !overflow || open ? full : Math.min(collapsedPx, full)

      if (!overflow) {
        gsap.set(clip, { height: 'auto', clearProps: 'height' })
        primed.current = true
        return
      }

      if (!primed.current || prefersReducedMotion()) {
        primed.current = true
        gsap.set(clip, { height: end })
        return
      }

      gsap.fromTo(
        clip,
        { height: clip.offsetHeight },
        {
          height: end,
          duration: CHAT_COLLAPSE_MS,
          ease: 'power2.inOut',
          onComplete: () => {
            if (open) gsap.set(clip, { height: 'auto' })
          },
        },
      )
    },
    { dependencies: [open, collapsedPx, contentKey, measureTick] },
  )

  return { clipRef, innerRef, needsToggle }
}

function thinkingSummaryLabel(part: {
  summary?: string
  durationMs?: number
  collapsed?: boolean
}): string {
  if (part.summary?.trim()) return part.summary.trim()
  if (typeof part.durationMs === 'number' && part.durationMs > 0) {
    const seconds = Math.max(1, Math.round(part.durationMs / 1000))
    return `Thought for ${seconds}s`
  }
  return 'Thinking'
}

function ThinkingPart({
  text,
  collapsed: collapsedProp,
  summary,
  durationMs,
  streaming = false,
}: {
  text: string
  collapsed?: boolean
  summary?: string
  durationMs?: number
  streaming?: boolean
}) {
  const [collapsed, setCollapsed] = useState(collapsedProp ?? true)
  const open = !collapsed
  const label = thinkingSummaryLabel({ summary, durationMs })
  const { clipRef, innerRef } = useClipHeight(open, 0, text)
  const streamPortalRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (collapsedProp != null) setCollapsed(collapsedProp)
  }, [collapsedProp])

  useEffect(() => {
    if (!streaming) return
    const el = streamPortalRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [streaming, text])

  if (streaming) {
    return (
      <div
        className="theme-chat-part theme-chat-part--thinking theme-chat-part--thinking-stream"
        data-streaming="true"
        aria-live="polite"
        aria-label="Thinking"
      >
        <div ref={streamPortalRef} className="theme-chat-part__thinking-portal">
          <div className="theme-chat-part__thinking-pre-wrap">
            <pre className="theme-chat-part__thinking-body theme-chat-part__thinking-body--stream type-caption type-muted">
              {text}
              <span className="theme-chat-part__thinking-caret" aria-hidden />
            </pre>
            {text.trim() ? <ChatCopyControl text={text} className="theme-chat-part__thinking-copy" /> : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="theme-chat-part theme-chat-part--thinking" data-open={open ? 'true' : 'false'}>
      <CollapseToggle
        open={open}
        label={label}
        onClick={() => setCollapsed((v) => !v)}
      />
      <div
        ref={clipRef}
        className="theme-chat-part__collapse-clip theme-chat-part__thinking-clip"
        data-open={open ? 'true' : 'false'}
      >
        <div ref={innerRef}>
          <div className="theme-chat-part__thinking-pre-wrap">
            <pre className="theme-chat-part__thinking-body type-caption">{text}</pre>
            {text.trim() ? <ChatCopyControl text={text} className="theme-chat-part__thinking-copy" /> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusPart({
  label,
  tone = 'thinking',
  loading = false,
}: {
  label: string
  tone?: 'thinking' | 'editing'
  loading?: boolean
}) {
  return (
    <div
      className={[
        'theme-chat-part',
        'theme-chat-part--status',
        `theme-chat-part--status-${tone}`,
      ].join(' ')}
      data-loading={loading ? 'true' : 'false'}
      aria-live="polite"
      aria-busy={loading || undefined}
    >
      <span
        className={[
          'theme-chat-part__status-label',
          'type-display-sm',
          'type-accent',
          loading ? 'theme-chat-part__status-label--loading' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {label}
      </span>
    </div>
  )
}

const PLAN_OPTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const PLAN_CUSTOM_ID = '__custom'

function planOptionLetter(index: number) {
  return PLAN_OPTION_LETTERS[index] ?? String(index + 1)
}

type PlanAnswerChip = { letter?: string; label: string }

function resolvePlanAnswerChips(
  question: ChatPlanQuestion,
  value: string | string[] | undefined,
  textExtra?: string,
): PlanAnswerChip[] {
  const options = question.options ?? []
  const note = textExtra?.trim()

  if (question.kind === 'text') {
    const text = typeof value === 'string' ? value.trim() : ''
    return text ? [{ label: text }] : []
  }

  if (question.kind === 'multi' && Array.isArray(value)) {
    const chips = value.map((id) => {
      const idx = options.findIndex((o) => o.id === id)
      return {
        letter: idx >= 0 ? planOptionLetter(idx) : undefined,
        label: options[idx]?.label ?? id,
      }
    })
    if (note) chips.push({ letter: planOptionLetter(options.length), label: note })
    return chips
  }

  if (question.kind === 'single' && typeof value === 'string') {
    if (value === PLAN_CUSTOM_ID) {
      return note ? [{ letter: planOptionLetter(options.length), label: note }] : []
    }
    const idx = options.findIndex((o) => o.id === value)
    const chips: PlanAnswerChip[] = []
    if (idx >= 0) {
      chips.push({ letter: planOptionLetter(idx), label: options[idx]?.label ?? value })
    } else if (value.trim()) {
      chips.push({ label: value })
    }
    if (note) chips.push({ letter: planOptionLetter(options.length), label: note })
    return chips
  }

  return note ? [{ label: note }] : []
}

function countAnsweredPlanQuestions(
  questions: ChatPlanQuestion[],
  answers: Record<string, string | string[]>,
): number {
  return questions.reduce((n, q) => {
    const value = answers[q.id]
    if (Array.isArray(value) && value.length > 0) return n + 1
    if (typeof value === 'string' && value.trim() && value !== PLAN_CUSTOM_ID) return n + 1
    if (value === PLAN_CUSTOM_ID) {
      const text = answers[`${q.id}__text`]
      if (typeof text === 'string' && text.trim()) return n + 1
    }
    const text = answers[`${q.id}__text`]
    if (typeof text === 'string' && text.trim()) return n + 1
    return n
  }, 0)
}

function PlanningSpentTimebar() {
  return (
    <div className="theme-chat-part__planning-timebar is-spent" role="presentation" aria-hidden>
      <div className="theme-chat-part__planning-timebar-fill" />
    </div>
  )
}

function PlanningPart({
  part,
  onReopen,
  canReopen = false,
}: {
  part: Extract<MessagePart, { type: 'planning' }>
  onReopen?: () => void
  canReopen?: boolean
}) {
  const answered = Boolean(part.answered)
  const closed = planningIsClosed(part)
  const [collapsed, setCollapsed] = useState(part.collapsed ?? (answered || closed))
  const open = !collapsed
  const { clipRef, innerRef } = useClipHeight(open, 0, `${answered}:${part.questions.length}`)
  const answers = part.answers ?? {}
  const answeredCount = countAnsweredPlanQuestions(part.questions, answers)
  const title = part.title?.trim() || 'Questions'
  const pendingLabel = part.summary?.trim() || 'Answer questionnaire'
  const livePending = !closed && canReopen

  useEffect(() => {
    if (part.collapsed != null) setCollapsed(part.collapsed)
  }, [part.collapsed])

  if (livePending) {
    return (
      <div
        className="theme-chat-part theme-chat-part--planning theme-chat-part--planning-pending"
        data-answered="false"
      >
        <button
          type="button"
          className="theme-chat-part__planning-pending"
          onClick={() => onReopen?.()}
          aria-label={`${pendingLabel} — ${part.questions.length} questions`}
        >
          <ListChecks className="theme-chat-part__planning-pending-icon size-4 shrink-0" aria-hidden />
          <span className="theme-chat-part__planning-pending-copy">
            <span className="type-label theme-chat-part__planning-pending-title">{pendingLabel}</span>
            <span className="type-caption type-muted theme-chat-part__planning-pending-meta">
              {part.questions.length} question{part.questions.length === 1 ? '' : 's'} · tap to open
            </span>
          </span>
        </button>
      </div>
    )
  }

  if (!answered) {
    return (
      <div
        className="theme-chat-part theme-chat-part--planning theme-chat-part--planning-pending theme-chat-part--planning-closed"
        data-answered="false"
        data-locked="true"
      >
        <div className="theme-chat-part__planning-pending" aria-disabled="true">
          <ListChecks className="theme-chat-part__planning-pending-icon size-4 shrink-0" aria-hidden />
          <span className="theme-chat-part__planning-pending-copy">
            <span className="type-label theme-chat-part__planning-pending-title">{title}</span>
            <span className="type-caption type-muted theme-chat-part__planning-pending-meta">
              Already answered
            </span>
          </span>
        </div>
        <PlanningSpentTimebar />
      </div>
    )
  }

  return (
    <div
      className="theme-chat-part theme-chat-part--planning theme-chat-part--planning-closed"
      data-open={open ? 'true' : 'false'}
      data-answered="true"
    >
      <button
        type="button"
        className="theme-chat-part__planning-toggle"
        aria-expanded={open}
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className="theme-chat-part__planning-toggle-lead">
          <ListChecks className="theme-chat-part__planning-toggle-icon size-4 shrink-0" aria-hidden />
          <span className="theme-chat-part__planning-toggle-copy">
            <span className="type-label theme-chat-part__planning-toggle-title">{title}</span>
            <span className="type-caption type-muted theme-chat-part__planning-toggle-meta">
              {answeredCount === 0
                ? 'Skipped'
                : `Already answered · ${answeredCount}/${part.questions.length}`}
            </span>
          </span>
        </span>
        <ChevronDown className="theme-chat-part__collapse-chevron size-4 shrink-0" aria-hidden />
      </button>
      <PlanningSpentTimebar />
      <div
        ref={clipRef}
        className="theme-chat-part__collapse-clip theme-chat-part__planning-clip"
        data-open={open ? 'true' : 'false'}
      >
        <div ref={innerRef} className="theme-chat-part__planning-body">
          <ol className="theme-chat-part__planning-list">
            {part.questions.map((q, qi) => {
              const chips = resolvePlanAnswerChips(
                q,
                answers[q.id],
                typeof answers[`${q.id}__text`] === 'string'
                  ? (answers[`${q.id}__text`] as string)
                  : undefined,
              )
              return (
                <li key={q.id} className="theme-chat-part__planning-item">
                  <div className="theme-chat-part__planning-item-q">
                    <span className="theme-chat-part__planning-qi" aria-hidden>
                      {qi + 1}
                    </span>
                    <p className="type-caption theme-chat-part__planning-prompt">{q.prompt}</p>
                  </div>
                  {chips.length > 0 ? (
                    <ul className="theme-chat-part__planning-chips">
                      {chips.map((chip, ci) => (
                        <li
                          key={`${q.id}-${chip.letter ?? 't'}-${ci}`}
                          className="theme-chat-part__planning-chip"
                        >
                          {chip.letter ? (
                            <span className="theme-chat-part__planning-chip-letter" aria-hidden>
                              {chip.letter}
                            </span>
                          ) : null}
                          <span className="theme-chat-part__planning-chip-label">{chip.label}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="type-caption type-muted theme-chat-part__planning-empty">Skipped</p>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}

function FogClipBody({
  contentKey,
  enableFog,
  defaultOpen = false,
  partClass,
  children,
}: {
  contentKey: string
  enableFog: boolean
  /** Latest bot reply starts open; older replies collapse when a newer one arrives. */
  defaultOpen?: boolean
  partClass: string
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(!defaultOpen)
  const open = !collapsed
  const { clipRef, innerRef, needsToggle } = useClipHeight(
    enableFog ? open : true,
    CHAT_FOG_COLLAPSED_PX,
    contentKey,
  )
  const showFog = enableFog && needsToggle && collapsed

  useEffect(() => {
    setCollapsed(!defaultOpen)
  }, [defaultOpen])

  return (
    <div
      className={[
        'theme-chat-part',
        partClass,
        enableFog && needsToggle ? `${partClass}-fog` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-open={enableFog && needsToggle ? (open ? 'true' : 'false') : undefined}
    >
      <div
        ref={clipRef}
        className="theme-chat-part__collapse-clip theme-chat-part__fog-clip"
        data-fog={showFog ? 'true' : 'false'}
      >
        <div ref={innerRef}>{children}</div>
        {showFog ? <div className="theme-chat-part__fog-veil" aria-hidden /> : null}
      </div>
      {enableFog && needsToggle ? (
        <CollapseToggle
          open={open}
          label={open ? 'See less' : 'See more'}
          onClick={() => setCollapsed((v) => !v)}
        />
      ) : null}
    </div>
  )
}

function FogMarkdownPart({
  source,
  enableFog,
  defaultOpen = false,
}: {
  source: string
  enableFog: boolean
  defaultOpen?: boolean
}) {
  return (
    <FogClipBody
      contentKey={source}
      enableFog={enableFog}
      defaultOpen={defaultOpen}
      partClass="theme-chat-part--markdown"
    >
      <MarkdownRendererEmbed source={source} density="chat" />
    </FogClipBody>
  )
}

function FogTextPart({
  text,
  enableFog,
  defaultOpen = false,
}: {
  text: string
  enableFog: boolean
  defaultOpen?: boolean
}) {
  const allowFog = enableFog && textLooksLongEnoughForFog(text)
  return (
    <FogClipBody
      contentKey={text}
      enableFog={allowFog}
      defaultOpen={defaultOpen}
      partClass="theme-chat-part--text"
    >
      <p className="theme-chat-part__text-body type-body-sm">{text}</p>
    </FogClipBody>
  )
}

function HtmlPart({ html, title }: { html: string; title?: string }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    void ensureChatHtmlSanitizer().then(() => setReady(true))
  }, [])
  const safe = useMemo(() => (ready ? sanitizeChatHtml(html) : sanitizeChatHtml(html)), [html, ready])
  return (
    <div className="theme-chat-part theme-chat-part--html">
      {title ? <p className="type-caption type-muted theme-chat-part__html-title">{title}</p> : null}
      <div className="theme-chat-part__html-host" dangerouslySetInnerHTML={{ __html: safe }} />
    </div>
  )
}

function GalleryPart({
  items,
  layout = 'grid',
}: {
  items: Extract<MessagePart, { type: 'gallery' }>['items']
  layout?: 'grid' | 'carousel' | 'host'
}) {
  const [index, setIndex] = useState(0)
  if (items.length === 0) {
    return <p className="type-caption type-muted">Empty gallery</p>
  }
  if (layout === 'host') {
    return (
      <div className="theme-chat-part theme-chat-part--gallery">
        <ImagePickerCarouselHost
          images={items.map((i) => ({ id: i.id, src: i.src, alt: i.alt }))}
          size="sm"
          label="Message gallery"
        />
      </div>
    )
  }
  if (layout === 'carousel') {
    return (
      <div className="theme-chat-part theme-chat-part--gallery">
        <ImagePickerCarousel
          images={items.map((i) => ({ id: i.id, src: i.src, alt: i.alt }))}
          selectedIndex={index}
          onSelect={setIndex}
          axis="horizontal"
          layout="strip"
          size="sm"
          label="Message images"
        />
        <img
          src={items[index]?.src}
          alt={items[index]?.alt ?? ''}
          className="theme-chat-part__gallery-focus"
        />
      </div>
    )
  }
  const visible = items.slice(0, 4)
  const overflow = items.length - visible.length
  return (
    <div className="theme-chat-part theme-chat-part--gallery-grid">
      {visible.map((item, i) => (
        <button
          key={item.id}
          type="button"
          className="theme-chat-part__gallery-cell"
          onClick={() => setIndex(i)}
        >
          <img src={item.src} alt={item.alt ?? ''} />
          {i === visible.length - 1 && overflow > 0 ? (
            <span className="theme-chat-part__gallery-more">+{overflow}</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

function AttachmentPart({
  attachment,
  onOpen,
}: {
  attachment: ChatAttachment
  onOpen?: (attachment: ChatAttachment) => void
}) {
  if (attachment.kind === 'image' && attachment.url && !attachment.error) {
    return (
      <button
        type="button"
        className="theme-chat-part theme-chat-part--image"
        onClick={() => onOpen?.(attachment)}
      >
        <img src={attachment.url} alt={attachment.name} />
      </button>
    )
  }
  if (attachment.kind === 'video' && attachment.url && !attachment.error) {
    return (
      <div className="theme-chat-part theme-chat-part--video">
        <video
          src={attachment.url}
          poster={attachment.posterUrl}
          controls
          playsInline
          preload="metadata"
        />
      </div>
    )
  }
  return (
    <button
      type="button"
      className="theme-chat-part theme-chat-part--file"
      onClick={() => onOpen?.(attachment)}
    >
      <span className="type-body-sm">{attachment.name}</span>
      <span className="type-caption type-muted">
        {attachment.error ?? formatBytes(attachment.sizeBytes) ?? attachment.kind}
      </span>
    </button>
  )
}

function ToolPart({ part }: { part: Extract<MessagePart, { type: 'tool' }> }) {
  const [open, setOpen] = useState(part.state === 'error')
  return (
    <div className={`theme-chat-part theme-chat-part--tool theme-chat-part--tool-${part.state}`}>
      <button type="button" className="theme-chat-part__tool-head" onClick={() => setOpen((v) => !v)}>
        <span className="type-caption">{part.name}</span>
        <span className="type-caption type-muted">{part.state}</span>
      </button>
      {open ? (
        <div className="theme-chat-part__tool-body">
          {part.request ? <pre className="type-caption">{part.request}</pre> : null}
          {part.result ? <pre className="type-caption">{part.result}</pre> : null}
          {part.error ? <p className="type-caption theme-chat-composer__error">{part.error}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

/** Board peel: never leave an "Actions" label/hairline with zero buttons. */
function scrubOrphanActionFooter(parts: readonly MessagePart[]): MessagePart[] {
  const next: MessagePart[] = []
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i]!
    if (part.type === 'card') {
      const actions = part.actions?.filter((a) => a.label.trim() && a.actionId) ?? []
      if (actions.length === 0) continue
      next.push({ ...part, actions })
      continue
    }
    if (part.type === 'divider' && /^actions$/i.test(part.label?.trim() ?? '')) {
      let hasActions = false
      for (let j = i + 1; j < parts.length; j += 1) {
        const look = parts[j]!
        if (look.type === 'divider') break
        if (look.type === 'card') {
          const actions = look.actions?.filter((a) => a.label.trim() && a.actionId) ?? []
          if (actions.length > 0) {
            hasActions = true
            break
          }
          continue
        }
        if (look.type === 'markdown' || look.type === 'text' || look.type === 'thinking') break
      }
      if (!hasActions) continue
    }
    next.push(part)
  }
  return next
}

export function ChatMessageParts({
  parts,
  onCardAction,
  onOpenAttachment,
  cardChrome = 'default',
  fogDefaultOpen = false,
  onPlanningReopen,
  livePlanningPartIndex = null,
}: ChatMessagePartsProps) {
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null)
  const displayParts =
    cardChrome === 'vurify' ? scrubOrphanActionFooter(parts) : parts

  const runCardAction = async (actionId: string | undefined, value: string | undefined, actionKey: string) => {
    if (!actionId || !onCardAction) return
    const isSave = actionId === 'creator2.action.save'
    if (isSave) setLoadingActionId(actionKey)
    try {
      await onCardAction(actionId, value)
    } finally {
      if (isSave) setLoadingActionId(null)
    }
  }

  const renderPart = (part: MessagePart, index: number) => {
    const key = `${part.type}-${index}`
    switch (part.type) {
      case 'text':
        return (
          <FogTextPart key={key} text={part.text} enableFog defaultOpen={fogDefaultOpen} />
        )
      case 'markdown':
        return (
          <FogMarkdownPart
            key={key}
            source={part.markdown}
            enableFog
            defaultOpen={fogDefaultOpen}
          />
        )
      case 'thinking':
        return (
          <ThinkingPart
            key={key}
            text={part.text}
            collapsed={part.collapsed}
            summary={part.summary}
            durationMs={part.durationMs}
            streaming={part.streaming}
          />
        )
      case 'status':
        return (
          <StatusPart key={key} label={part.label} tone={part.tone} loading={part.loading} />
        )
      case 'planning':
        return (
          <PlanningPart
            key={key}
            part={part}
            canReopen={livePlanningPartIndex === index}
            onReopen={onPlanningReopen ? () => onPlanningReopen(index) : undefined}
          />
        )
      case 'html':
        return <HtmlPart key={key} html={part.html} title={part.title} />
      case 'gallery':
        return <GalleryPart key={key} items={part.items} layout={part.layout} />
      case 'divider': {
        const tone = part.tone ?? 'default'
        const ruleClass = [
          'theme-divider',
          'theme-chat-part__divider-rule',
          cardChrome === 'vurify' ? 'theme-md-chat__hr' : '',
          tone === 'strong' ? 'theme-divider--strong' : '',
          tone === 'accent' ? 'theme-divider--accent' : '',
        ]
          .filter(Boolean)
          .join(' ')
        if (part.label?.trim()) {
          /* Board peel: match markdown ### + hr (not sandwich divider-row). */
          if (cardChrome === 'vurify') {
            return (
              <div
                key={key}
                className="theme-chat-part theme-chat-part--divider theme-chat-part--divider-board"
                role="separator"
                aria-label={part.label}
              >
                <p className="theme-md-chat__h3 theme-chat-part__divider-label mb-0">{part.label}</p>
                <hr className={ruleClass} />
              </div>
            )
          }
          return (
            <div
              key={key}
              className="theme-chat-part theme-chat-part--divider theme-divider-row"
              role="separator"
              aria-label={part.label}
            >
              <hr className={ruleClass} />
              <span className="theme-divider-row__label type-overline">{part.label}</span>
              <hr className={ruleClass} />
            </div>
          )
        }
        return (
          <hr
            key={key}
            className={['theme-chat-part', 'theme-chat-part--divider', ruleClass].join(' ')}
            role="separator"
          />
        )
      }
      case 'card': {
        const vurifyChrome = cardChrome === 'vurify'
        const presentation = part.presentation ?? (vurifyChrome ? 'buttons' : 'buttons')
        const soleAction = part.actions?.length === 1 ? part.actions[0] : null
        const titleDupesAction =
          Boolean(soleAction) &&
          part.title.trim().toLowerCase() === soleAction!.label.trim().toLowerCase()
        const showTitle =
          Boolean(part.title.trim()) &&
          !(vurifyChrome && titleDupesAction && presentation === 'buttons')
        return (
          <div
            key={key}
            className={[
              'theme-chat-part',
              'theme-chat-part--card',
              vurifyChrome ? 'theme-chat-part--card-vurify' : '',
              presentation === 'links' ? 'theme-chat-part--card-links' : '',
              presentation === 'vurify-menu' ? 'theme-chat-part--card-menu' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {showTitle ? (
              <p
                className={
                  vurifyChrome && presentation !== 'links'
                    ? 'theme-md-chat__h2 theme-chat-part__card-title mb-0'
                    : 'type-label theme-chat-part__card-kicker theme-chat-part__card-title mb-0'
                }
              >
                {part.title}
              </p>
            ) : null}
            {part.body ? (
              <p className="type-caption type-muted theme-chat-part__card-body">{part.body}</p>
            ) : null}
            {part.actions?.length ? (
              <div
                className={[
                  'theme-chat-part__card-actions',
                  presentation === 'links' ? 'theme-chat-part__card-actions--links' : '',
                  presentation === 'vurify-menu' ? 'theme-chat-part__card-actions--menu' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {part.actions.map((action) => {
                  if (presentation === 'links') {
                    return (
                      <button
                        key={action.id}
                        type="button"
                        className="theme-chat-part__card-link type-link type-body-sm"
                        onClick={() =>
                          void runCardAction(action.actionId, action.value, action.id)
                        }
                      >
                        <span className="theme-chat-part__card-link-label">{action.label}</span>
                        <ArrowUpRight
                          className="theme-chat-part__card-link-icon"
                          size={12}
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </button>
                    )
                  }
                  if (presentation === 'vurify-menu') {
                    return (
                      <VurifyMenuButton
                        key={action.id}
                        type="button"
                        size="sm"
                        variant="label"
                        lineTone="accent"
                        loading={loadingActionId === action.id}
                        onClick={() =>
                          void runCardAction(action.actionId, action.value, action.id)
                        }
                      >
                        {action.label}
                      </VurifyMenuButton>
                    )
                  }
                  if (vurifyChrome) {
                    return (
                      <Button
                        key={action.id}
                        type="button"
                        size="xs"
                        variant="action"
                        labelAnim={false}
                        shadowVariant="float"
                        className="theme-chat-part__card-action-btn"
                        onClick={() =>
                          action.actionId && onCardAction?.(action.actionId, action.value)
                        }
                      >
                        {action.label}
                      </Button>
                    )
                  }
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className="theme-chat-part__card-action type-caption"
                      onClick={() =>
                        action.actionId && onCardAction?.(action.actionId, action.value)
                      }
                    >
                      {action.label}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        )
      }
      case 'attachment':
        return (
          <AttachmentPart key={key} attachment={part.attachment} onOpen={onOpenAttachment} />
        )
      case 'tool':
        return <ToolPart key={key} part={part} />
      case 'system':
        return (
          <p key={key} className="theme-chat-part theme-chat-part--system type-caption type-muted">
            {part.text}
          </p>
        )
      default:
        return null
    }
  }

  return (
    <div className="theme-chat-parts">{displayParts.map((part, index) => renderPart(part, index))}</div>
  )
}

type ChatBubbleProps = {
  message: ChatMessage
  sender?: ChatParticipant
  align?: 'start' | 'end'
  showAvatar?: boolean
  replyPreview?: string | null
  onCopy?: () => void
  onRegenerate?: () => void
  onReply?: () => void
  onReact?: (emoji: string) => void
  onDelete?: () => void
  onCardAction?: (actionId: string, value?: string) => void | Promise<void>
  /** Reopen pending questionnaire from an in-bubble tag. */
  onPlanningReopen?: (partIndex: number) => void
  /** Live unanswered questionnaire part on this message, if any. */
  livePlanningPartIndex?: number | null
  /** Latest assistant message — keep fog parts expanded until a newer bot reply. */
  fogDefaultOpen?: boolean
  /** Override the emoji quick-react picker — defaults to a WhatsApp-style set */
  reactionEmojis?: readonly string[]
  /**
   * `board` — peel / Talk: full-width bubble, greyscale Vurify mark + name header,
   * hairline under the head, Verify card actions, no side avatar.
   */
  chrome?: 'default' | 'board'
  /** Board slot below the name/time divider (Aid home Chip). */
  boardTrail?: ReactNode
  /** Error bubble Retry — resend the last user turn. */
  onRetry?: () => void
}

function DeliveryIcon({ delivery }: { delivery?: ChatMessage['delivery'] }) {
  if (delivery === 'sending') return <Clock size={12} aria-label="Sending" />
  if (delivery === 'sent') return <Check size={12} aria-label="Sent" />
  if (delivery === 'delivered') return <CheckCheck size={12} aria-label="Delivered" />
  if (delivery === 'read') return <CheckCheck size={12} className="theme-chat-bubble__read" aria-label="Read" />
  if (delivery === 'failed') return <span className="type-caption theme-chat-composer__error">Failed</span>
  return null
}

export function ChatBubble({
  message,
  sender,
  align = 'start',
  showAvatar = true,
  replyPreview,
  onCopy,
  onRegenerate,
  onReply,
  onReact,
  onDelete,
  onCardAction,
  onPlanningReopen,
  livePlanningPartIndex = null,
  fogDefaultOpen = false,
  reactionEmojis = DEFAULT_REACTION_EMOJIS,
  chrome = 'default',
  boardTrail,
  onRetry,
}: ChatBubbleProps) {
  const board = chrome === 'board'
  const isError = message.kind === 'error'
  const isBot = message.role === 'assistant' || sender?.role === 'bot' || isError
  const hasActions = Boolean(onCopy || onRegenerate || onReply || onReact || onDelete)

  if (message.parts.length === 1 && message.parts[0]?.type === 'system') {
    return (
      <div className="theme-chat-system-row">
        <ChatMessageParts parts={message.parts} />
      </div>
    )
  }

  return (
    <article
      className={[
        'theme-chat-bubble',
        `theme-chat-bubble--${align}`,
        board ? 'theme-chat-bubble--board' : '',
        isError ? 'theme-chat-bubble--error' : '',
        message.streaming ? 'theme-chat-bubble--streaming' : '',
        message.delivery === 'failed' ? 'theme-chat-bubble--failed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role={isError ? 'alert' : undefined}
    >
      {board ? null : showAvatar ? (
        <ChatAvatar participant={sender} size="sm" />
      ) : (
        <span className="theme-chat-bubble__avatar-spacer" />
      )}
      <div className="theme-chat-bubble__body">
        {board ? null : (
          <div className="theme-chat-bubble__meta">
            <span className="type-caption">{sender?.displayName ?? message.role}</span>
            <span className="type-caption type-muted">{formatMessageClock(message.createdAt ?? '')}</span>
            <DeliveryIcon delivery={message.delivery} />
          </div>
        )}
        {replyPreview ? (
          <div className="theme-chat-bubble__reply type-caption type-muted">{replyPreview}</div>
        ) : null}
        {!board && message.tags?.length ? (
          <div className="theme-chat-bubble__tags">
            {message.tags.map((tag) => (
              <Tag key={tag} size="xs" className="theme-chat-bubble__tag">
                {tag}
              </Tag>
            ))}
          </div>
        ) : null}
        <div className="theme-chat-bubble__content">
          {board ? (
            <div className="theme-chat-bubble__board-head">
              <span className="type-caption theme-chat-bubble__board-name">
                {boardHeadName(isBot, sender?.displayName, message.kind)}
              </span>
              <span className="type-caption type-muted theme-chat-bubble__board-time">
                {formatMessageClock(message.createdAt ?? '')}
              </span>
              <DeliveryIcon delivery={message.delivery} />
            </div>
          ) : null}
          {board && boardTrail ? (
            <div className="theme-chat-bubble__board-trail">{boardTrail}</div>
          ) : null}
          <ChatMessageParts
            parts={message.parts}
            onCardAction={onCardAction}
            onPlanningReopen={onPlanningReopen}
            livePlanningPartIndex={livePlanningPartIndex}
            cardChrome={board ? 'vurify' : 'default'}
            fogDefaultOpen={fogDefaultOpen}
          />
          {isError && onRetry ? (
            <div className="theme-chat-bubble__error-retry">
              <Button
                type="button"
                size="xs"
                variant="error"
                icon={RefreshCw}
                labelAnim={false}
                onClick={onRetry}
              >
                Retry
              </Button>
            </div>
          ) : null}
          {message.streaming ? <span className="theme-chat-bubble__caret" aria-hidden /> : null}
        </div>
        {message.reactions?.length ? (
          <div className="theme-chat-bubble__reactions">
            {message.reactions.map((r) =>
              onReact ? (
                <button
                  key={r.emoji}
                  type="button"
                  className="theme-chat-bubble__reaction type-caption"
                  onClick={() => onReact(r.emoji)}
                >
                  {r.emoji} {r.participantIds.length}
                </button>
              ) : (
                <span key={r.emoji} className="theme-chat-bubble__reaction type-caption">
                  {r.emoji} {r.participantIds.length}
                </span>
              ),
            )}
          </div>
        ) : null}
        {hasActions ? (
          <div className="theme-chat-bubble__actions">
            {onCopy ? (
              <IconButton type="button" size="xxs" variant="ghost" icon={Copy} aria-label="Copy" onClick={onCopy} />
            ) : null}
            {onRegenerate ? (
              <IconButton
                type="button"
                size="xxs"
                variant="ghost"
                icon={RefreshCw}
                aria-label="Regenerate"
                onClick={onRegenerate}
              />
            ) : null}
            {onReact ? (
              <MenuButton
                variant="ghost"
                size="xxs"
                iconOnly
                icon={Smile}
                label="React"
                menuSize="compact"
                scrollRail="hidden"
                triggerLabelAnim={false}
                items={reactionEmojis.map((emoji) => ({ id: emoji, label: emoji }))}
                onSelect={onReact}
              />
            ) : null}
            {onReply ? (
              <button type="button" className="type-caption theme-chat-bubble__reply-btn" onClick={onReply}>
                Reply
              </button>
            ) : null}
            {onDelete ? (
              <IconButton
                type="button"
                size="xxs"
                variant="ghost"
                icon={Trash2}
                aria-label="Delete for me"
                onClick={onDelete}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}

type ChatErrorBubbleProps = {
  text: string
  chrome?: ChatBubbleProps['chrome']
  sender?: ChatParticipant
  onRetry?: () => void
  conversationId?: string
}

export function ChatErrorBubble({
  text,
  chrome = 'default',
  sender = CHAT_ERROR_SENDER,
  onRetry,
  conversationId = 'chat-error',
}: ChatErrorBubbleProps) {
  return (
    <ChatBubble
      message={buildChatErrorMessage({
        text,
        conversationId,
        senderId: sender.id,
      })}
      sender={sender}
      align="start"
      chrome={chrome}
      onRetry={onRetry}
    />
  )
}
