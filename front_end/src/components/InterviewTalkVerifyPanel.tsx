/**
 * Talk Soft Decision Verify panel — paired transcript + marking sections.
 * Each mark sticks only while its chat section is in view (CSS sticky in-pair,
 * same idea as Interview Creator flow-timeline TOC). Multiple marks on one
 * stretch use chip tabs + one full-width marker bubble (no inner h-scroll).
 * Expanding a mark clears other pairs (chat + marks) and keeps the matching
 * section only. Assist Conversation uses board bubbles, not Talk flush.
 */
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Crosshair,
  HelpCircle,
  MessageSquareText,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ChatBubble } from './chatParts/ChatBubble'
import { Chip } from './Chip'
import { DocArticleDivider } from './DocArticle'
import { InterviewVerifyQuestionOverview } from './InterviewVerifyQuestionOverview'
import { ResultRadar, ResultRadarKey } from './InterviewFlowReportBeats'
import { Tag } from './Tag'
import { ThemeScroll } from './ThemeScroll'
import { VurifyMenuButton } from './VurifyMenuButton'
import { ensureTalkMarkdownEmphasisSpacing } from '../lib/interviewRunApi/stripToFinalAsk'
import type { TalkVerifyMarkingCard, TalkVerifyModal } from '../lib/interviewRunApi/talkVerifyModal'
import { markBeatFromCard, radarFromMarkBeat } from '../lib/interviewRunApi/markBeats'
import type { ChatMessage, ChatParticipant } from '../lib/chat/types'

type InterviewTalkVerifyPanelProps = {
  modal: TalkVerifyModal
  highlightMessageId?: string | null
  onCiteMessage?: (messageId: string) => void
  onAskAboutCard?: (card: TalkVerifyMarkingCard) => void
  onPromoteTitle?: (title: string | null) => void
  revealMessageCount?: number
  showMarkingRail?: boolean
  /** Kept for Results callers; lead is title + collapsed overview, never contrib / JSON. */
  hideStageMeta?: boolean
  className?: string
  debug?: boolean
}

type VerifyPair = {
  id: string
  topicId?: string
  topicTitle?: string
  showTopicBreak: boolean
  messageIds: string[]
  cards: TalkVerifyMarkingCard[]
}

const VERIFY_CONV_ID = 'interview-talk-verify'
const MARK_FOG_COLLAPSED_PX = 72

function markingIcon(card: TalkVerifyMarkingCard): LucideIcon {
  if (card.scored === false) return HelpCircle
  if (card.kind === 'general') return ClipboardCheck
  if (card.kind === 'topic') return BookOpen
  return MessageSquareText
}

function laneLabel(lane: TalkVerifyMarkingCard['lane']): string {
  if (lane === 'delivery') return 'Delivery'
  if (lane === 'content') return 'Content'
  return 'Package'
}

function MarkSeeToggle({
  expanded,
  onClick,
}: {
  expanded: boolean
  onClick: () => void
}) {
  return (
    <div className="theme-interview-flow-section__toolbar-actions theme-interview-landing__verify-mark-more">
      <VurifyMenuButton
        type="button"
        variant="label"
        size="sm"
        housing
        activeChrome={false}
        lineTone="muted"
        icon={expanded ? ChevronUp : ChevronDown}
        iconPosition="right"
        switchAnimation="clip"
        aria-expanded={expanded}
        onClick={onClick}
      >
        {expanded ? 'See less' : 'See more'}
      </VurifyMenuButton>
    </div>
  )
}

function buildParticipants(personaName: string): ChatParticipant[] {
  return [
    { id: 'talk-bot', displayName: personaName || 'Interviewer', role: 'bot' },
    { id: 'talk-candidate', displayName: 'You', role: 'member' },
  ]
}

function buildChatMessages(modal: TalkVerifyModal): ChatMessage[] {
  return modal.messages.map((m) => {
    const isCandidate = m.role === 'candidate'
    return {
      id: m.id,
      conversationId: VERIFY_CONV_ID,
      role: isCandidate ? 'user' : 'assistant',
      senderId: isCandidate ? 'talk-candidate' : 'talk-bot',
      createdAt: m.at,
      parts: [
        {
          type: 'markdown',
          markdown: ensureTalkMarkdownEmphasisSpacing(m.text || ''),
        },
      ],
    }
  })
}

function resolveJumpMessageId(
  card: TalkVerifyMarkingCard,
  messages: TalkVerifyModal['messages'],
): string {
  if (card.kind === 'utterance' && card.anchorMessageId) return card.anchorMessageId
  const ids = card.messageIds.length ? card.messageIds : [card.anchorMessageId]
  for (let i = ids.length - 1; i >= 0; i -= 1) {
    const id = ids[i]
    if (!id) continue
    const m = messages.find((x) => x.id === id)
    if (m?.role === 'candidate') return id
  }
  return card.anchorMessageId
}

function scrollMessageIntoView(
  viewport: HTMLElement | null,
  messageId: string,
) {
  if (!viewport || !messageId) return
  const el = viewport.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`)
  if (!(el instanceof HTMLElement)) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.add('is-cite-flash')
  window.setTimeout(() => el.classList.remove('is-cite-flash'), 1200)
}

function scrollMarkIntoView(
  viewport: HTMLElement | null,
  cardId: string,
) {
  if (!viewport || !cardId) return
  const el = viewport.querySelector(`[data-verify-mark-id="${CSS.escape(cardId)}"]`)
  if (!(el instanceof HTMLElement)) return
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  el.classList.add('is-cite-flash')
  window.setTimeout(() => el.classList.remove('is-cite-flash'), 1200)
}

/**
 * Pair each mark with the chat span it belongs to (utterance turn or topic block).
 * Sticky lives inside the pair so it cannot outrun its section.
 */
function buildVerifyPairs(input: {
  messages: ChatMessage[]
  cards: TalkVerifyMarkingCard[]
  topicByMessageId: Map<string, string>
  topicTitleById: Map<string, string>
}): VerifyPair[] {
  const { messages, cards, topicByMessageId, topicTitleById } = input
  const utteranceByAnchor = new Map<string, TalkVerifyMarkingCard[]>()
  const topicCardsByTopic = new Map<string, TalkVerifyMarkingCard[]>()
  const generalCards: TalkVerifyMarkingCard[] = []

  for (const card of cards) {
    if (card.kind === 'general') {
      generalCards.push(card)
      continue
    }
    if (card.kind === 'utterance') {
      const list = utteranceByAnchor.get(card.anchorMessageId) ?? []
      list.push(card)
      utteranceByAnchor.set(card.anchorMessageId, list)
      continue
    }
    const tid = card.topicId || '_topic'
    const list = topicCardsByTopic.get(tid) ?? []
    list.push(card)
    topicCardsByTopic.set(tid, list)
  }

  const topicOrder: string[] = []
  for (const m of messages) {
    const tid = topicByMessageId.get(m.id)
    if (tid && !topicOrder.includes(tid)) topicOrder.push(tid)
  }
  if (topicOrder.length === 0) topicOrder.push('_all')

  const pairs: VerifyPair[] = []
  let prevTopic: string | null = null

  for (const topicId of topicOrder) {
    const topicMsgs =
      topicId === '_all'
        ? messages
        : messages.filter((m) => topicByMessageId.get(m.id) === topicId)
    if (!topicMsgs.length) continue

    const topicTitle = topicId === '_all' ? undefined : topicTitleById.get(topicId)
    const showTopicBreak = Boolean(prevTopic && topicId !== prevTopic)
    prevTopic = topicId

    const anchors = topicMsgs
      .filter((m) => m.role === 'user' && utteranceByAnchor.has(m.id))
      .map((m) => m.id)
    const topicLevel = topicCardsByTopic.get(topicId) ?? []
    topicCardsByTopic.delete(topicId)

    if (anchors.length === 0) {
      pairs.push({
        id: `topic:${topicId}`,
        topicId,
        topicTitle,
        showTopicBreak,
        messageIds: topicMsgs.map((m) => m.id),
        cards: topicLevel,
      })
      continue
    }

    let cursor = 0
    anchors.forEach((anchorId, anchorIndex) => {
      const end = topicMsgs.findIndex((m) => m.id === anchorId)
      if (end < cursor) return
      const chunk = topicMsgs.slice(cursor, end + 1)
      cursor = end + 1
      const utts = utteranceByAnchor.get(anchorId) ?? []
      const isLast = anchorIndex === anchors.length - 1
      const restAfter = isLast ? topicMsgs.slice(cursor) : []
      if (isLast) cursor = topicMsgs.length
      const messageIds = [...chunk, ...restAfter].map((m) => m.id)
      const pairCards: TalkVerifyMarkingCard[] = [...utts]
      if (isLast) {
        // Topic marks stick with this stretch — jump must land on this utterance, not topic-first.
        for (const tc of topicLevel) {
          pairCards.push({
            ...tc,
            anchorMessageId: anchorId,
            messageIds: messageIds.length ? messageIds : tc.messageIds,
          })
        }
      }
      pairs.push({
        id: `utt:${anchorId}`,
        topicId,
        topicTitle: anchorIndex === 0 ? topicTitle : undefined,
        showTopicBreak: anchorIndex === 0 ? showTopicBreak : false,
        messageIds,
        cards: pairCards,
      })
    })

    if (cursor < topicMsgs.length) {
      const tailIds = topicMsgs.slice(cursor).map((m) => m.id)
      const tailAnchor =
        [...topicMsgs.slice(cursor)].reverse().find((m) => m.role === 'user')?.id ||
        tailIds[tailIds.length - 1] ||
        ''
      pairs.push({
        id: `topic-tail:${topicId}`,
        topicId,
        topicTitle: undefined,
        showTopicBreak: false,
        messageIds: tailIds,
        cards: topicLevel.map((tc) => ({
          ...tc,
          anchorMessageId: tailAnchor || tc.anchorMessageId,
          messageIds: tailIds.length ? tailIds : tc.messageIds,
        })),
      })
    }
  }

  for (const [tid, leftover] of topicCardsByTopic) {
    if (!leftover.length) continue
    pairs.push({
      id: `topic-loose:${tid}`,
      topicId: tid,
      topicTitle: topicTitleById.get(tid),
      showTopicBreak: false,
      messageIds: [],
      cards: leftover,
    })
  }

  if (generalCards.length) {
    // Overall Package / Soft Decision rollup sits after every utterance, like Talk.
    pairs.push({
      id: 'general',
      showTopicBreak: false,
      messageIds: [],
      cards: generalCards,
    })
  }

  return pairs
}

/**
 * Paired Talk Verify body for Soft Decision See more.
 */
export function InterviewTalkVerifyPanel({
  modal,
  highlightMessageId = null,
  onCiteMessage,
  onAskAboutCard,
  onPromoteTitle,
  revealMessageCount,
  showMarkingRail = true,
  className = '',
  debug = false,
}: InterviewTalkVerifyPanelProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const userScrolledRef = useRef(false)
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)
  const participants = useMemo(
    () => buildParticipants(modal.personaName),
    [modal.personaName],
  )
  const participantsById = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants],
  )
  const messages = useMemo(() => buildChatMessages(modal), [modal])
  const paintedMessages = useMemo(() => {
    if (revealMessageCount == null || revealMessageCount >= messages.length) {
      return messages
    }
    return messages.slice(0, Math.max(0, revealMessageCount))
  }, [messages, revealMessageCount])
  const latestAssistantId = useMemo(() => {
    for (let i = paintedMessages.length - 1; i >= 0; i -= 1) {
      if (paintedMessages[i]?.role === 'assistant') return paintedMessages[i]!.id
    }
    return null
  }, [paintedMessages])

  const messageTopicById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of modal.messages) {
      if (m.topicId) map.set(m.id, m.topicId)
    }
    return map
  }, [modal.messages])

  const topicTitleById = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of modal.talkSections) map.set(s.topicId, s.title)
    return map
  }, [modal.talkSections])

  const cardByMessage = useMemo(() => {
    const map = new Map<string, string>()
    for (const card of modal.cards) {
      if (card.kind === 'general') continue
      for (const id of card.messageIds) {
        if (!map.has(id)) map.set(id, card.id)
      }
      if (card.kind === 'utterance' && card.anchorMessageId) {
        map.set(card.anchorMessageId, card.id)
      }
    }
    return map
  }, [modal.cards])

  const allPairs = useMemo(
    () =>
      buildVerifyPairs({
        messages: paintedMessages,
        cards: modal.cards,
        topicByMessageId: messageTopicById,
        topicTitleById,
      }),
    [paintedMessages, modal.cards, messageTopicById, topicTitleById],
  )

  const visiblePairs = useMemo(() => {
    if (!expandedCardId) return allPairs
    const pair = allPairs.find((p) => p.cards.some((c) => c.id === expandedCardId))
    if (!pair) return allPairs
    const card = pair.cards.find((c) => c.id === expandedCardId)
    if (!card) return [{ ...pair, cards: pair.cards.filter((c) => c.id === expandedCardId) }]
    // Focus: only this mark + its chat section (pair messages, or card.messageIds when set)
    const focusIds =
      card.messageIds.length > 0
        ? pair.messageIds.filter((id) => card.messageIds.includes(id))
        : pair.messageIds
    return [
      {
        ...pair,
        messageIds: focusIds.length ? focusIds : pair.messageIds,
        cards: [card],
        showTopicBreak: false,
      },
    ]
  }, [allPairs, expandedCardId])

  // Fresh Verify open — stay at the lead (title/description), not the transcript end.
  useEffect(() => {
    userScrolledRef.current = false
    const viewport = viewportRef.current
    if (viewport) viewport.scrollTop = 0
  }, [modal.fixtureId, modal.sectionKey])

  // While messages / marks paint in, browsers often re-anchor to the bottom once
  // content overflows. Re-pin to top until the user scrolls themselves.
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || userScrolledRef.current) return
    viewport.scrollTop = 0
  }, [
    revealMessageCount,
    showMarkingRail,
    paintedMessages.length,
    visiblePairs.length,
  ])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !onPromoteTitle) return

    let raf = 0
    const sync = () => {
      const panelHeader = viewport
        .closest('.theme-interview-landing__verify-panel')
        ?.querySelector<HTMLElement>('.theme-interview-landing__verify-panel-header')
      const headings = [
        ...viewport.querySelectorAll<HTMLElement>('[data-interview-verify-title]'),
      ]
      if (!panelHeader || !headings.length) {
        onPromoteTitle(null)
        return
      }
      if (viewport.scrollTop <= 2) {
        onPromoteTitle(null)
        return
      }
      const threshold = panelHeader.getBoundingClientRect().bottom + 4
      let promoted: string | null = null
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= threshold) {
          promoted =
            heading.dataset.interviewVerifyTitleText?.trim() ||
            heading.textContent?.trim() ||
            null
        }
      }
      onPromoteTitle(promoted)
    }

    const onScroll = () => {
      if (viewport.scrollTop > 8) userScrolledRef.current = true
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        sync()
      })
    }

    sync()
    viewport.addEventListener('scroll', onScroll, { passive: true })
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onScroll) : null
    ro?.observe(viewport)
    return () => {
      viewport.removeEventListener('scroll', onScroll)
      ro?.disconnect()
      if (raf) cancelAnimationFrame(raf)
      onPromoteTitle(null)
    }
  }, [modal.title, onPromoteTitle, paintedMessages.length, visiblePairs.length])

  useEffect(() => {
    if (!highlightMessageId) return
    userScrolledRef.current = true
    scrollMessageIntoView(viewportRef.current, highlightMessageId)
  }, [highlightMessageId])

  useEffect(() => {
    if (!expandedCardId || !viewportRef.current) return
    userScrolledRef.current = true
    const el = viewportRef.current.querySelector(
      `[data-verify-mark-id="${CSS.escape(expandedCardId)}"]`,
    )
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [expandedCardId])

  const jumpToCard = useCallback(
    (card: TalkVerifyMarkingCard) => {
      userScrolledRef.current = true
      setActiveCardId(card.id)
      const messageId = resolveJumpMessageId(card, modal.messages)
      scrollMessageIntoView(viewportRef.current, messageId)
      onCiteMessage?.(messageId)
    },
    [modal.messages, onCiteMessage],
  )

  const focusMarkingFromMessage = useCallback(
    (messageId: string) => {
      const cardId = cardByMessage.get(messageId)
      if (!cardId) return
      userScrolledRef.current = true
      setExpandedCardId(null)
      setActiveCardId(cardId)
      window.requestAnimationFrame(() => {
        scrollMarkIntoView(viewportRef.current, cardId)
      })
    },
    [cardByMessage],
  )

  const toggleExpanded = useCallback((cardId: string) => {
    setExpandedCardId((prev) => {
      const next = prev === cardId ? null : cardId
      if (next) setActiveCardId(cardId)
      return next
    })
  }, [])

  const isAssistChat = modal.personaName.trim().toLowerCase() === 'assist'

  if (debug) {
    console.debug('[InterviewTalkVerifyPanel]', {
      messages: paintedMessages.length,
      pairs: visiblePairs.length,
      activeCardId,
      expandedCardId,
      showMarkingRail,
    })
  }

  const messagesById = useMemo(
    () => new Map(paintedMessages.map((m) => [m.id, m])),
    [paintedMessages],
  )

  return (
    <div
      className={['theme-interview-landing__verify-talk', className].filter(Boolean).join(' ')}
      data-mark-expanded={expandedCardId ? 'true' : 'false'}
    >
      <ThemeScroll
        rail="mini"
        className="theme-interview-landing__verify-talk-scroll"
        viewportRef={viewportRef}
        tabIndex={-1}
      >
        <div
          className="theme-interview-talk-page theme-interview-creator-chat theme-interview-landing__verify-talk-page"
          data-talk-flush-assistant={isAssistChat ? undefined : 'true'}
        >
          <div
            className="theme-interview-landing__verify-lead"
            data-focus={expandedCardId ? 'true' : undefined}
          >
            <h2
              className="type-h3 type-serif-italic mb-0 theme-interview-gate__title"
              data-interview-verify-title
              data-interview-verify-title-text={modal.title}
            >
              {modal.title}
            </h2>
            {modal.description?.trim() ? (
              <InterviewVerifyQuestionOverview label="Overview of the section">
                <p className="type-body mb-0 theme-interview-gate__description">
                  {modal.description}
                </p>
              </InterviewVerifyQuestionOverview>
            ) : null}
            {expandedCardId ? (
              <>
                <div
                  className="theme-interview-landing__verify-focus-rule"
                  aria-hidden
                >
                  <DocArticleDivider />
                </div>
                <div className="theme-interview-landing__verify-focus-bar">
                  <VurifyMenuButton
                    type="button"
                    variant="label"
                    size="sm"
                    housing
                    activeChrome={false}
                    lineTone="muted"
                    icon={ArrowLeft}
                    iconPosition="left"
                    onClick={() => setExpandedCardId(null)}
                  >
                    Back to conversation
                  </VurifyMenuButton>
                </div>
              </>
            ) : null}
          </div>

          <div className="theme-interview-landing__verify-pairs">
            {visiblePairs.map((pair) => {
              const pairMessages = pair.messageIds
                .map((id) => messagesById.get(id))
                .filter((m): m is ChatMessage => Boolean(m))
              const hasCards = pair.cards.length > 0
              const isRollup = pair.id === 'general'
              // Keep mark column reserved whenever cards exist so chat width does not
              // stretch full-bleed then shrink when the rail paints.
              const showRail = showMarkingRail && hasCards
              return (
                <Fragment key={pair.id}>
                  {isRollup ? (
                    <div
                      className="theme-interview-landing__verify-rollup"
                      aria-label="Rollup"
                    >
                      <DocArticleDivider />
                      <h3 className="theme-interview-flow-timeline__title type-h3 type-serif-italic mb-0">
                        Rollup
                      </h3>
                    </div>
                  ) : null}
                <section
                  className="theme-interview-landing__verify-pair"
                  data-pair-id={pair.id}
                  data-has-mark={hasCards ? 'true' : 'false'}
                  data-rollup={isRollup ? 'true' : undefined}
                >
                  <div className="theme-interview-landing__verify-pair-chat">
                    {pair.showTopicBreak && pair.topicTitle ? (
                      <p className="type-caption type-muted mb-0 theme-interview-landing__verify-topic-break">
                        {pair.topicTitle}
                      </p>
                    ) : null}
                    <div className="theme-interview-talk-page__thread theme-bot-chat__thread-inner">
                      {pairMessages.map((message) => {
                        const align = message.role === 'user' ? 'end' : 'start'
                        const linkedMarkId =
                          align === 'end' ? cardByMessage.get(message.id) ?? null : null
                        return (
                          <div
                            key={message.id}
                            data-message-id={message.id}
                            className={[
                              'theme-interview-talk-page__row',
                              align === 'end'
                                ? 'theme-interview-talk-page__row--end'
                                : 'theme-interview-talk-page__row--start',
                              highlightMessageId === message.id ? 'is-cite-flash' : '',
                              linkedMarkId ? 'is-mark-linked' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            role={linkedMarkId ? 'button' : undefined}
                            tabIndex={linkedMarkId ? 0 : undefined}
                            onClick={
                              linkedMarkId
                                ? () => focusMarkingFromMessage(message.id)
                                : undefined
                            }
                            onKeyDown={
                              linkedMarkId
                                ? (e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault()
                                      focusMarkingFromMessage(message.id)
                                    }
                                  }
                                : undefined
                            }
                          >
                            <ChatBubble
                              message={message}
                              sender={participantsById.get(message.senderId)}
                              align={align}
                              chrome="board"
                              fogDefaultOpen={
                                message.role === 'assistant' &&
                                message.id === latestAssistantId
                              }
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {hasCards ? (
                    <aside
                      className="theme-interview-landing__verify-pair-mark"
                      aria-label={showRail ? 'Marking' : undefined}
                      aria-hidden={showRail ? undefined : true}
                      data-rail-ready={showRail ? 'true' : 'false'}
                    >
                      {showRail ? (
                        <div className="theme-interview-landing__verify-pair-mark-sticky">
                          {pair.cards.length > 1 ? (
                            <VerifyMarkStrip
                              cards={pair.cards}
                              activeCardId={activeCardId}
                              expandedCardId={expandedCardId}
                              onSelectCard={(card) => setActiveCardId(card.id)}
                              onToggleExpand={toggleExpanded}
                              onJump={jumpToCard}
                              onAsk={onAskAboutCard}
                            />
                          ) : (
                            pair.cards.map((card) => (
                              <MarkingCardView
                                key={card.id}
                                card={card}
                                active={card.id === activeCardId}
                                expanded={expandedCardId === card.id}
                                onToggleExpand={() => toggleExpanded(card.id)}
                                onJump={() => jumpToCard(card)}
                                onAsk={
                                  onAskAboutCard
                                    ? () => onAskAboutCard(card)
                                    : undefined
                                }
                              />
                            ))
                          )}
                        </div>
                      ) : null}
                    </aside>
                  ) : null}
                </section>
                </Fragment>
              )
            })}
          </div>
        </div>
      </ThemeScroll>
    </div>
  )
}

function VerifyMarkStrip({
  cards,
  activeCardId,
  expandedCardId,
  onSelectCard,
  onToggleExpand,
  onJump,
  onAsk,
}: {
  cards: TalkVerifyMarkingCard[]
  activeCardId: string | null
  expandedCardId: string | null
  onSelectCard: (card: TalkVerifyMarkingCard) => void
  onToggleExpand: (cardId: string) => void
  onJump: (card: TalkVerifyMarkingCard) => void
  onAsk?: (card: TalkVerifyMarkingCard) => void
}) {
  const found = cards.findIndex((c) => c.id === activeCardId)
  const index = found >= 0 ? found : 0
  const active = cards[index] ?? cards[0]
  if (!active) return null

  return (
    <div className="theme-interview-landing__verify-mark-strip">
      <div
        className="theme-interview-landing__verify-mark-strip-tabs"
        role="tablist"
        aria-label="Markings on this stretch"
      >
        {cards.map((card, i) => (
          <Chip
            key={card.id}
            size="xs"
            selected={i === index}
            onClick={() => onSelectCard(card)}
            className="theme-interview-landing__verify-mark-strip-tab"
          >
            {card.title}
          </Chip>
        ))}
      </div>
      <div className="theme-interview-landing__verify-mark-strip-body">
        <MarkingCardView
          key={active.id}
          card={active}
          active={active.id === activeCardId}
          expanded={expandedCardId === active.id}
          onToggleExpand={() => onToggleExpand(active.id)}
          onJump={() => onJump(active)}
          onAsk={onAsk ? () => onAsk(active) : undefined}
        />
      </div>
    </div>
  )
}

function MarkingCardView({
  card,
  active = false,
  expanded = false,
  onToggleExpand,
  onJump,
  onAsk,
}: {
  card: TalkVerifyMarkingCard
  active?: boolean
  expanded?: boolean
  onToggleExpand: () => void
  onJump: () => void
  onAsk?: () => void
}) {
  const Icon = markingIcon(card)
  const unscored = card.scored === false
  const summary =
    card.boardSummary?.trim() ||
    card.justification?.trim() ||
    card.synthesisText?.trim() ||
    (card.evidence[0]?.trim() ?? '')
  const plot = radarFromMarkBeat(markBeatFromCard(card))
  const hasRadar = Boolean(plot && plot.axes.length >= 3)
  const summaryCap = card.kind === 'topic' ? 720 : 140
  const needsToggle =
    summary.length > summaryCap ||
    card.evidence.length > 0 ||
    card.dimensions.length > 2 ||
    Boolean(card.boardSummaryDetail || (card.synthesisText && card.justification)) ||
    Boolean(card.bucketNotes?.length || card.pasteBursts?.length) ||
    card.dimensions.some((d) => Boolean(d.notes?.trim())) ||
    hasRadar
  const dimTags = unscored ? [] : card.dimensions.slice(0, expanded ? 8 : 2)

  return (
    <article
      data-verify-mark-id={card.id}
      className={[
        'theme-chat-bubble',
        'theme-chat-bubble--board',
        'theme-chat-bubble--start',
        'theme-interview-landing__verify-mark-card',
        active ? 'is-active' : '',
        card.emphasized ? 'is-emphasized' : 'is-secondary',
        `is-${card.kind}`,
        unscored ? 'is-unscored' : '',
        expanded ? 'is-expanded' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-lane={card.lane}
      data-kind={card.kind}
      data-scored={unscored ? 'false' : 'true'}
    >
      <div className="theme-chat-bubble__body">
        <div className="theme-chat-bubble__content">
          <div className="theme-chat-bubble__board-head">
            <span className="theme-chat-bubble__board-mark" aria-hidden>
              <Icon className="theme-chat-bubble__board-mark-icon" />
            </span>
            <span className="type-caption theme-interview-landing__verify-mark-title">
              {card.title}
            </span>
            {unscored && card.status === 'pending' ? (
              <span className="type-caption type-muted theme-interview-landing__verify-mark-score">
                Pending
              </span>
            ) : unscored ? (
              <span className="type-caption type-muted theme-interview-landing__verify-mark-score">
                Not scored
              </span>
            ) : card.dimensions[0]?.score ? (
              <span className="type-caption type-muted theme-interview-landing__verify-mark-score">
                {card.dimensions[0].score}
              </span>
            ) : null}
          </div>

          <div className="theme-chat-bubble__tags" aria-label="Marking tags">
            <Tag size="xs" className="theme-chat-bubble__tag">
              {unscored ? 'Location only' : laneLabel(card.lane)}
            </Tag>
            {unscored ? (
              <Tag size="xs" className="theme-chat-bubble__tag">
                Clarification
              </Tag>
            ) : null}
            {dimTags.map((d) => (
              <Tag key={d.key || d.label} size="xs" className="theme-chat-bubble__tag">
                {d.label}
                {d.score ? ` · ${d.score}` : ''}
              </Tag>
            ))}
          </div>

          {summary ? (
            <div
              className={[
                'theme-chat-part',
                'theme-chat-part--text',
                needsToggle ? 'theme-chat-part--text-fog' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-open={needsToggle ? (expanded ? 'true' : 'false') : undefined}
            >
              <div
                className="theme-chat-part__collapse-clip theme-chat-part__fog-clip"
                data-fog={needsToggle && !expanded ? 'true' : 'false'}
                style={
                  needsToggle && !expanded
                    ? { maxHeight: MARK_FOG_COLLAPSED_PX }
                    : undefined
                }
              >
                <div>
                  <p className="theme-chat-part__text-body type-body whitespace-pre-line">{summary}</p>
                  {expanded ? <MarkingExpandedDetail card={card} /> : null}
                </div>
                {needsToggle && !expanded ? (
                  <div className="theme-chat-part__fog-veil" aria-hidden />
                ) : null}
              </div>
              {needsToggle ? (
                <MarkSeeToggle expanded={expanded} onClick={onToggleExpand} />
              ) : null}
            </div>
          ) : needsToggle ? (
            <>
              {expanded ? <MarkingExpandedDetail card={card} /> : null}
              <MarkSeeToggle expanded={expanded} onClick={onToggleExpand} />
            </>
          ) : null}

          <div className="theme-chat-part theme-chat-part--card theme-chat-part--card-links theme-interview-landing__verify-mark-links">
            <div className="theme-chat-part__card-actions theme-chat-part__card-actions--links">
              <button
                type="button"
                className="theme-chat-part__card-link type-link type-body-sm"
                onClick={onJump}
              >
                <Crosshair
                  className="theme-interview-landing__verify-mark-link-lead"
                  size={14}
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="theme-chat-part__card-link-label">Jump to utterance</span>
                <ArrowUpRight
                  className="theme-chat-part__card-link-icon"
                  size={12}
                  strokeWidth={1.75}
                  aria-hidden
                />
              </button>
              {onAsk ? (
                <button
                  type="button"
                  className="theme-chat-part__card-link type-link type-body-sm"
                  onClick={onAsk}
                >
                  <Sparkles
                    className="theme-interview-landing__verify-mark-link-lead"
                    size={14}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="theme-chat-part__card-link-label">Ask Aid</span>
                  <ArrowUpRight
                    className="theme-chat-part__card-link-icon"
                    size={12}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function MarkingExpandedDetail({ card }: { card: TalkVerifyMarkingCard }) {
  const plot = radarFromMarkBeat(markBeatFromCard(card))
  const nodes: ReactNode[] = []
  if (plot && plot.axes.length >= 3) {
    nodes.push(
      <div key="radar" className="theme-interview-landing__verify-mark-radar">
        <ResultRadar radar={plot} />
        <ResultRadarKey radar={plot} />
      </div>,
    )
  }
  if (card.boardSummaryDetail?.trim() && card.boardSummaryDetail.trim() !== card.boardSummary?.trim()) {
    nodes.push(
      <p key="detail" className="type-body mb-0">
        {card.boardSummaryDetail}
      </p>,
    )
  }
  if (card.synthesisText?.trim() && card.justification?.trim()) {
    nodes.push(
      <p key="synth" className="type-body mb-0 theme-interview-landing__verify-mark-synth">
        {card.synthesisText}
      </p>,
    )
  }
  if (card.dimensions.some((d) => d.notes?.trim())) {
    nodes.push(
      <ul key="axis-notes" className="theme-interview-landing__verify-mark-evidence">
        {card.dimensions
          .filter((d) => d.notes?.trim())
          .map((d) => (
            <li key={d.key || d.label} className="type-body">
              <strong>{d.label}:</strong> {d.notes}
            </li>
          ))}
      </ul>,
    )
  }
  if (card.evidence.length) {
    nodes.push(
      <ul key="ev" className="theme-interview-landing__verify-mark-evidence">
        {card.evidence.map((e) => (
          <li key={e.slice(0, 48)} className="type-body type-muted">
            {e}
          </li>
        ))}
      </ul>,
    )
  }
  if (!nodes.length) return null
  return <div className="theme-interview-landing__verify-mark-detail">{nodes}</div>
}
