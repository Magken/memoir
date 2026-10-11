import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  clearAttempt,
  createBlankQuestion,
  createBlankSection,
  createSampleTestForm,
  emptyAnswerKeyForQuestion,
  emptyResponseForQuestion,
  ensureAnswerKeys,
  mergeAttemptResponses,
  normalizeTestFormPayload,
  scoreAttempt,
  stripAnswerKey,
  validateAttempt,
  type TestFormAnswerKey,
  type TestFormDocument,
  type TestFormMode,
  type TestFormQuestion,
  type TestFormQuestionKind,
  type TestFormResponseValue,
  type TestFormResponses,
  type TestFormSection,
} from '../lib/testForm'
import { scrollToAnchorTarget } from '../lib/menus/anchorScroll'
import { downloadExportedContext } from '../lib/editorContext/importExportManager'
import type {
  EditorActionRequest,
  EditorActionResult,
  EditorRuntimeHandle,
  TestFormEditorPayload,
} from '../lib/editorContext/types'
import { DocArticleShell } from './docArticleParts/DocArticleShell'
import { InfoTooltip } from './InfoTooltip'
import { NanoAnchorMenu } from './NanoAnchorMenu'
import { ThemeScroll } from './ThemeScroll'
import { ToggleGroup } from './ToggleGroup'
import { VurifyMenuButton } from './VurifyMenuButton'
import { AuthorEditable } from './testFormParts/AuthorEditable'
import { AuthorRemoveBtn } from './testFormParts/AuthorRemoveBtn'
import { FormAddBar } from './testFormParts/FormAddBar'
import {
  buildFormTocEntries,
  buildFormTocSortableQuestionGroups,
  buildFormTocSortableSectionIds,
  formSectionTocId,
  questionIdFromFormTocId,
  reorderFormQuestions,
  reorderFormSections,
  sectionIdFromFormTocId,
} from './testFormParts/formToc'
import { QuestionAuthor } from './testFormParts/QuestionAuthor'
import { AnswerKeyModal } from './testFormParts/AnswerKeyModal'
import { QuestionTake } from './testFormParts/QuestionTake'

type TestFormProps = {
  className?: string
  initialTitle?: string
  initialDocument?: TestFormDocument
  initialMode?: TestFormMode
  /**
   * Nested preview / panel — no mode dock / take Submit.
   * Author keeps title header + DocArticleShell TOC (side menu).
   */
  embed?: boolean
  /** Fires after any document patch (author edits, add/remove question, etc.). */
  onDocumentChange?: (document: TestFormDocument) => void
}

export type TestFormHandle = EditorRuntimeHandle

type SectionBucket = {
  section: TestFormSection | null
  questions: TestFormQuestion[]
}

const MODE_OPTIONS: { value: TestFormMode; label: string }[] = [
  { value: 'author', label: 'Author' },
  { value: 'take', label: 'Take' },
  { value: 'review', label: 'Review' },
]

const AUTHOR_HELP = (
  <div className="theme-test-form__help">
    <p className="type-label mb-0">What you can do</p>
    <ul className="theme-test-form__help-list">
      <li>Click titles, prompts, tips, and options to edit them in place</li>
      <li>Use the + edge menu on a question for kind, tip, required, points, and format</li>
      <li>Add questions from the kind chips in each section header</li>
      <li>Add sections from the tray at the bottom of the form</li>
      <li>Drag sections and questions in Contents to reorder</li>
      <li>Open Answer key on a question to set scoring and match rules</li>
    </ul>
  </div>
)

/** Sticky header — assessment/section title + subtitle; morphs as sections cross. */
function StickyHeaderTitle({
  title,
  subtitle,
  morphKey,
  editable = false,
  onTitleChange,
  onSubtitleChange,
}: {
  title: string
  subtitle: string
  /** When this changes (assessment ↔ section), morph; same key just updates copy in place. */
  morphKey: string
  editable?: boolean
  onTitleChange?: (value: string) => void
  onSubtitleChange?: (value: string) => void
}) {
  const [shown, setShown] = useState({ title, subtitle, morphKey })
  const [outgoing, setOutgoing] = useState<{
    title: string
    subtitle: string
    morphKey: string
    gen: number
  } | null>(null)
  const animatingRef = useRef(false)
  const morphGenRef = useRef(0)
  const shownRef = useRef(shown)
  const pendingRef = useRef<{ title: string; subtitle: string; morphKey: string } | null>(
    null,
  )
  shownRef.current = shown

  const startMorph = (next: { title: string; subtitle: string; morphKey: string }) => {
    const current = shownRef.current
    if (next.morphKey === current.morphKey) {
      setShown(next)
      return
    }
    animatingRef.current = true
    const gen = ++morphGenRef.current
    setOutgoing({
      title: current.title,
      subtitle: current.subtitle,
      morphKey: current.morphKey,
      gen,
    })
    setShown(next)
  }

  useEffect(() => {
    if (morphKey === shown.morphKey) {
      if (title === shown.title && subtitle === shown.subtitle) return
      // Same slot (e.g. live edit) — update copy without morphing.
      setShown({ title, subtitle, morphKey })
      return
    }
    const next = { title, subtitle, morphKey }
    if (animatingRef.current) {
      // Queue latest target — don't interrupt the exit/enter pair mid-flight.
      pendingRef.current = next
      return
    }
    startMorph(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to incoming slot/copy
  }, [title, subtitle, morphKey])

  const clearOutgoing = (event?: { animationName?: string }, gen?: number) => {
    // Only the title-exit keyframe ends the pair (ignore child / enter bubbles).
    if (event?.animationName && event.animationName !== 'theme-test-form-title-exit') {
      return
    }
    // Ignore stale exit endings after a newer morph has already started.
    if (gen != null && gen !== morphGenRef.current) return
    setOutgoing(null)
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending && pending.morphKey !== shownRef.current.morphKey) {
      startMorph(pending)
      return
    }
    animatingRef.current = false
  }

  // Clear exit if keyframes are disabled (reduced motion) or animationend is missed.
  useEffect(() => {
    if (!outgoing) return
    const gen = outgoing.gen
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = window.setTimeout(() => clearOutgoing(undefined, gen), reduced ? 0 : 480)
    return () => window.clearTimeout(t)
  }, [outgoing])

  const morphing = Boolean(outgoing)
  const isAssessment = shown.morphKey === 'assessment'
  // Match Take: animate plain text only — AuthorEditable mid-morph makes the sequence stutter.
  const liveEditable = editable && !morphing

  const renderTitleLine = (copy: string, live: boolean) => {
    if (liveEditable && live && onTitleChange) {
      return (
        <AuthorEditable
          className="theme-test-form__sticky-title-edit"
          value={shown.title}
          placeholder={isAssessment ? 'Assessment title' : 'Section title'}
          allowEmpty={false}
          aria-label={isAssessment ? 'Assessment title' : 'Section title'}
          onChange={onTitleChange}
        />
      )
    }
    return <span className="theme-test-form__sticky-title-line">{copy}</span>
  }

  const renderSubtitle = (copy: string, live: boolean) => {
    if (!copy) return null
    if (liveEditable && live && onSubtitleChange && !isAssessment) {
      return (
        <AuthorEditable
          className="theme-test-form__sticky-subtitle-edit"
          value={shown.subtitle}
          placeholder="Section description (optional)"
          aria-label="Section description"
          onChange={onSubtitleChange}
        />
      )
    }
    return <span className="theme-test-form__sticky-subtitle">{copy}</span>
  }

  return (
    <div
      className={[
        'theme-test-form__sticky-title',
        liveEditable ? 'theme-test-form__sticky-title--editable' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={isAssessment ? 'Assessment title' : 'Section title'}
    >
      {outgoing ? (
        <div
          key={`out-${outgoing.morphKey}-${outgoing.gen}`}
          className="theme-test-form__sticky-title-block is-exit"
          aria-hidden
          onAnimationEnd={(e) => clearOutgoing(e, outgoing.gen)}
        >
          {renderTitleLine(outgoing.title, false)}
          {outgoing.subtitle ? (
            <span className="theme-test-form__sticky-subtitle">{outgoing.subtitle}</span>
          ) : null}
        </div>
      ) : null}
      <div
        key={`in-${shown.morphKey}`}
        className={[
          'theme-test-form__sticky-title-block',
          outgoing ? 'is-enter' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {renderTitleLine(shown.title, true)}
        {renderSubtitle(shown.subtitle, true)}
      </div>
    </div>
  )
}

function buildSectionBuckets(doc: TestFormDocument): SectionBucket[] {
  const known = new Set(doc.sections.map((s) => s.id))
  const map = new Map<string, TestFormQuestion[]>()
  for (const s of doc.sections) map.set(s.id, [])
  const loose: TestFormQuestion[] = []
  for (const q of doc.questions) {
    if (q.sectionId && known.has(q.sectionId)) {
      map.get(q.sectionId)!.push(q)
    } else {
      loose.push(q)
    }
  }
  const buckets: SectionBucket[] = doc.sections.map((section) => ({
    section,
    questions: map.get(section.id) ?? [],
  }))
  if (loose.length > 0) {
    buckets.push({ section: null, questions: loose })
  }
  return buckets
}

/** Insert at the top of that section’s question pile (document order). */
function insertQuestionAtSectionTop(
  questions: TestFormQuestion[],
  question: TestFormQuestion,
  sectionId: string,
): TestFormQuestion[] {
  const firstInSection = questions.findIndex((q) => q.sectionId === sectionId)
  if (firstInSection < 0) return [...questions, question]
  return [
    ...questions.slice(0, firstInSection),
    question,
    ...questions.slice(firstInSection),
  ]
}

export const TestForm = forwardRef<TestFormHandle, TestFormProps>(function TestForm(
  {
    className = '',
    initialTitle,
    initialDocument,
    initialMode = 'take',
    embed = false,
    onDocumentChange,
  },
  ref,
) {
  const seed = ensureAnswerKeys(initialDocument ?? createSampleTestForm())
  const [document, setDocument] = useState<TestFormDocument>(() => ({
    ...seed,
    title: initialTitle?.trim() || seed.title,
    sections: seed.sections ?? [],
  }))
  const [mode, setMode] = useState<TestFormMode>(initialMode)
  const onDocumentChangeRef = useRef(onDocumentChange)
  onDocumentChangeRef.current = onDocumentChange
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    () => seed.sections[0]?.id ?? null,
  )
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)
  const [stickyTitle, setStickyTitle] = useState(() => document.title.trim() || 'Assessment')
  const [stickySubtitle, setStickySubtitle] = useState('')
  const [stickySectionId, setStickySectionId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [markingQuestionId, setMarkingQuestionId] = useState<string | null>(null)
  const [answerPreviewOpenId, setAnswerPreviewOpenId] = useState<string | null>(null)
  const formErrorRef = useRef<HTMLParagraphElement | null>(null)
  const takeChrome = !embed && (mode === 'take' || mode === 'review')
  /** Sticky morph title still runs in author embed (title header); take embed stays chrome-free. */
  const stickyChrome = embed
    ? mode === 'author'
    : takeChrome || mode === 'author'

  useEffect(() => {
    if (!formError) return
    formErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [formError])

  useEffect(() => {
    if (mode !== 'take') {
      setFormError(null)
      setFieldErrors({})
    }
  }, [mode])

  useEffect(() => {
    if (mode !== 'author') setMarkingQuestionId(null)
  }, [mode])

  const markingQuestion = useMemo(
    () =>
      markingQuestionId
        ? (document.questions.find((q) => q.id === markingQuestionId) ?? null)
        : null,
    [document.questions, markingQuestionId],
  )

  const responses: TestFormResponses = useMemo(() => {
    const current = document.attempt?.responses ?? {}
    const next: TestFormResponses = { ...current }
    for (const q of document.questions) {
      if (!next[q.id] || next[q.id].kind !== q.kind) {
        next[q.id] = emptyResponseForQuestion(q)
      }
    }
    return next
  }, [document.attempt?.responses, document.questions])

  const buckets = useMemo(() => buildSectionBuckets(document), [document])

  // Reset sticky copy when entering sticky chrome modes.
  useEffect(() => {
    if (!stickyChrome) return
    setStickyTitle(document.title.trim() || 'Assessment')
    setStickySubtitle('')
    setStickySectionId(null)
  }, [mode, stickyChrome])

  // Keep sticky assessment title in sync while scrolled to the top.
  useEffect(() => {
    if (!stickyChrome || stickySectionId) return
    setStickyTitle(document.title.trim() || 'Assessment')
  }, [document.title, stickyChrome, stickySectionId])

  // Keep sticky section title/desc in sync while a section is promoted.
  useEffect(() => {
    if (!stickyChrome || !stickySectionId || stickySectionId === '__loose__') return
    const section = document.sections.find((s) => s.id === stickySectionId)
    if (!section) {
      setStickySectionId(null)
      setStickyTitle(document.title.trim() || 'Assessment')
      setStickySubtitle('')
      return
    }
    const nextTitle = section.title.trim() || 'Section'
    const nextSubtitle = section.description?.trim() ?? ''
    setStickyTitle((prev) => (prev === nextTitle ? prev : nextTitle))
    setStickySubtitle((prev) => (prev === nextSubtitle ? prev : nextSubtitle))
  }, [document.sections, stickySectionId, stickyChrome, document.title])

  // Section headings cross the top of the scroll viewport → title + subtitle morph in chrome.
  // Re-bind when `mode` changes — take ↔ author remounts ThemeScroll; stickyChrome alone stays true.
  useEffect(() => {
    if (!stickyChrome) return

    let cancelled = false
    let raf = 0
    let root: HTMLDivElement | null = null
    let ro: ResizeObserver | null = null
    let tries = 0

    const syncTitle = () => {
      if (!root || cancelled) return
      const headings = root.querySelectorAll<HTMLElement>('[data-test-form-section-title]')
      const rootTop = root.getBoundingClientRect().top
      // Only promote once a heading reaches the top edge of the list — not while still below it.
      // Keeps the assessment title visible at rest.
      const TRIGGER_PX = 4
      let nextTitle = document.title.trim() || 'Assessment'
      let nextSubtitle = ''
      let nextSectionId: string | null = null
      for (const heading of headings) {
        const relTop = heading.getBoundingClientRect().top - rootTop
        if (relTop <= TRIGGER_PX) {
          const label = heading.dataset.testFormSectionTitle?.trim()
          if (label) {
            nextTitle = label
            nextSubtitle = heading.dataset.testFormSectionDesc?.trim() ?? ''
            nextSectionId = heading.dataset.testFormSectionId?.trim() || null
          }
        }
      }
      setStickyTitle((prev) => (prev === nextTitle ? prev : nextTitle))
      setStickySubtitle((prev) => (prev === nextSubtitle ? prev : nextSubtitle))
      setStickySectionId((prev) => (prev === nextSectionId ? prev : nextSectionId))
    }

    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        syncTitle()
      })
    }

    const detach = () => {
      if (!root) return
      root.removeEventListener('scroll', onScroll)
      ro?.disconnect()
      ro = null
      root = null
    }

    const attach = () => {
      if (cancelled) return
      const next = scrollViewportRef.current
      if (!next) {
        // Author shell mounts ThemeScroll one frame later than this effect.
        if (tries++ < 20) {
          requestAnimationFrame(attach)
        }
        return
      }
      if (root === next) {
        syncTitle()
        return
      }
      detach()
      root = next
      root.addEventListener('scroll', onScroll, { passive: true })
      ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onScroll) : null
      ro?.observe(root)
      syncTitle()
    }

    attach()
    return () => {
      cancelled = true
      if (raf) cancelAnimationFrame(raf)
      detach()
    }
  }, [stickyChrome, mode, document.title, buckets])

  const patchDocument = useCallback((updater: (prev: TestFormDocument) => TestFormDocument) => {
    setDocument((prev) => {
      const next = ensureAnswerKeys(updater(prev))
      queueMicrotask(() => onDocumentChangeRef.current?.(next))
      return next
    })
  }, [])

  const setResponse = useCallback(
    (questionId: string, value: TestFormResponseValue) => {
      setFormError(null)
      setFieldErrors((prev) => {
        if (!prev[questionId]) return prev
        const next = { ...prev }
        delete next[questionId]
        return next
      })
      patchDocument((prev) =>
        mergeAttemptResponses(prev, {
          ...(prev.attempt?.responses ?? {}),
          [questionId]: value,
        }),
      )
    },
    [patchDocument],
  )

  const getContext = useCallback((): TestFormEditorPayload => {
    if (mode === 'take') {
      return { document: stripAnswerKey(document), mode }
    }
    return { document, mode }
  }, [document, mode])

  const loadContext = useCallback((payload: unknown) => {
    const { payload: next } = normalizeTestFormPayload(payload)
    const doc = ensureAnswerKeys({
      ...next.document,
      sections: next.document.sections ?? [],
    })
    setDocument(doc)
    setMode(next.mode)
    setActiveSectionId(doc.sections[0]?.id ?? null)
  }, [])

  const ensureSectionId = useCallback(
    (prev: TestFormDocument, preferred?: string | null): { sections: TestFormSection[]; sectionId: string } => {
      const preferredOk =
        preferred && prev.sections.some((s) => s.id === preferred) ? preferred : null
      const activeOk =
        activeSectionId && prev.sections.some((s) => s.id === activeSectionId)
          ? activeSectionId
          : null
      const existing = preferredOk ?? activeOk ?? prev.sections[prev.sections.length - 1]?.id
      if (existing) return { sections: prev.sections, sectionId: existing }
      const section = createBlankSection('Section 1')
      return { sections: [...prev.sections, section], sectionId: section.id }
    },
    [activeSectionId],
  )

  const invokeAction = useCallback(
    (request: EditorActionRequest): EditorActionResult => {
      const { actionId, value, targetId, payload } = request

      switch (actionId) {
        case 'testform.action.set-mode': {
          const next =
            (value as TestFormMode | undefined) ??
            (payload as { mode?: TestFormMode } | undefined)?.mode
          if (next !== 'author' && next !== 'take' && next !== 'review') {
            return { ok: false, actionId, error: 'Invalid mode' }
          }
          setMode(next)
          return { ok: true, actionId, data: { mode: next } }
        }
        case 'testform.action.add-section': {
          const title =
            (typeof value === 'string' && value.trim()) ||
            (payload as { title?: string } | undefined)?.title?.trim() ||
            'New section'
          const section = createBlankSection(title)
          patchDocument((prev) => ({
            ...prev,
            sections: [...(prev.sections ?? []), section],
          }))
          setActiveSectionId(section.id)
          return { ok: true, actionId, data: { sectionId: section.id } }
        }
        case 'testform.action.remove-section': {
          const id = targetId ?? value
          if (!id) return { ok: false, actionId, error: 'Missing section id' }
          patchDocument((prev) => ({
            ...prev,
            sections: prev.sections.filter((s) => s.id !== id),
            questions: prev.questions.map((q) =>
              q.sectionId === id ? { ...q, sectionId: undefined } : q,
            ),
          }))
          setActiveSectionId((cur) => (cur === id ? null : cur))
          return { ok: true, actionId }
        }
        case 'testform.action.add-question': {
          const kind =
            (value as TestFormQuestionKind | undefined) ??
            (payload as { kind?: TestFormQuestionKind } | undefined)?.kind ??
            'short_text'
          const preferredSection =
            (payload as { sectionId?: string } | undefined)?.sectionId ?? targetId ?? null
          let createdId = ''
          let resolvedSectionId = ''
          patchDocument((prev) => {
            const { sections, sectionId } = ensureSectionId(prev, preferredSection)
            const question = createBlankQuestion(kind, sectionId)
            createdId = question.id
            resolvedSectionId = sectionId
            return {
              ...prev,
              sections,
              questions: insertQuestionAtSectionTop(prev.questions, question, sectionId),
              answerKey: {
                ...(prev.answerKey ?? {}),
                [question.id]: emptyAnswerKeyForQuestion(question),
              },
            }
          })
          if (resolvedSectionId) setActiveSectionId(resolvedSectionId)
          if (createdId) {
            requestAnimationFrame(() => {
              scrollViewportRef.current
                ?.querySelector<HTMLElement>(`[data-test-form-question="${createdId}"]`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            })
          }
          return { ok: true, actionId, data: { questionId: createdId } }
        }
        case 'testform.action.remove-question': {
          const id = targetId ?? value
          if (!id) return { ok: false, actionId, error: 'Missing question id' }
          patchDocument((prev) => {
            const answerKey = { ...(prev.answerKey ?? {}) }
            delete answerKey[id]
            const responsesNext = { ...(prev.attempt?.responses ?? {}) }
            delete responsesNext[id]
            return {
              ...prev,
              questions: prev.questions.filter((q) => q.id !== id),
              answerKey,
              attempt: prev.attempt
                ? { ...prev.attempt, responses: responsesNext, scores: undefined }
                : undefined,
            }
          })
          return { ok: true, actionId }
        }
        case 'testform.action.set-hint': {
          const id = targetId
          if (!id || value == null) return { ok: false, actionId, error: 'Missing targetId/value' }
          patchDocument((prev) => ({
            ...prev,
            questions: prev.questions.map((q) => (q.id === id ? { ...q, hint: value } : q)),
          }))
          return { ok: true, actionId }
        }
        case 'testform.action.set-answer-key': {
          const id = targetId
          const entry = (payload as { entry?: TestFormAnswerKey[string] } | undefined)?.entry
          if (!id || !entry) return { ok: false, actionId, error: 'Missing targetId/entry' }
          patchDocument((prev) => ({
            ...prev,
            answerKey: { ...(prev.answerKey ?? {}), [id]: entry },
          }))
          return { ok: true, actionId }
        }
        case 'testform.action.strip-key': {
          patchDocument((prev) => stripAnswerKey(prev))
          setMode('take')
          return { ok: true, actionId }
        }
        case 'testform.action.score-attempt': {
          const validation = validateAttempt(document)
          if (!validation.valid) {
            setFormError(validation.summary)
            setFieldErrors(
              Object.fromEntries(validation.issues.map((issue) => [issue.questionId, issue.message])),
            )
            const firstId = validation.issues[0]?.questionId
            if (firstId) {
              requestAnimationFrame(() => {
                scrollViewportRef.current
                  ?.querySelector<HTMLElement>(`[data-test-form-question="${firstId}"]`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              })
            }
            return { ok: false, actionId, error: validation.summary }
          }
          setFormError(null)
          setFieldErrors({})
          patchDocument((prev) => scoreAttempt(prev))
          setMode('review')
          return { ok: true, actionId }
        }
        case 'testform.action.clear-attempt': {
          patchDocument((prev) => clearAttempt(prev))
          return { ok: true, actionId }
        }
        case 'testform.action.export-take-json': {
          const takeDoc = stripAnswerKey(document)
          return { ok: true, actionId, data: takeDoc }
        }
        case 'testform.action.reorder': {
          const from = Number((payload as { from?: number } | undefined)?.from)
          const to = Number((payload as { to?: number } | undefined)?.to)
          if (!Number.isFinite(from) || !Number.isFinite(to)) {
            return { ok: false, actionId, error: 'Missing from/to' }
          }
          patchDocument((prev) => {
            const questions = [...prev.questions]
            if (from < 0 || from >= questions.length || to < 0 || to >= questions.length) {
              return prev
            }
            const [item] = questions.splice(from, 1)
            questions.splice(to, 0, item)
            return { ...prev, questions }
          })
          return { ok: true, actionId }
        }
        default:
          return { ok: false, actionId, error: `Unhandled action: ${actionId}` }
      }
    },
    [document, ensureSectionId, patchDocument],
  )

  const runtimeHandle = useMemo(
    () => ({ getContext, loadContext, invokeAction }),
    [getContext, loadContext, invokeAction],
  )

  useImperativeHandle(ref, () => runtimeHandle, [runtimeHandle])

  const scoreSummary = document.attempt?.scores
    ? {
        earned: document.attempt.totalEarned ?? 0,
        max: document.attempt.totalMax ?? 0,
      }
    : null

  const isEmpty = document.questions.length === 0 && document.sections.length === 0

  const questionNumberById = useMemo(() => {
    const map = new Map<string, number>()
    let n = 0
    for (const bucket of buckets) {
      for (const q of bucket.questions) {
        map.set(q.id, ++n)
      }
    }
    return map
  }, [buckets])

  const tocEntries = useMemo(
    () => (mode === 'author' ? buildFormTocEntries(document) : []),
    [mode, document],
  )
  const tocSortableSectionIds = useMemo(
    () => (mode === 'author' ? buildFormTocSortableSectionIds(document) : []),
    [mode, document],
  )
  const tocSortableQuestionGroups = useMemo(
    () => (mode === 'author' ? buildFormTocSortableQuestionGroups(document) : []),
    [mode, document],
  )

  const onReorderFromToc = useCallback(
    (orderedTocIds: string[]) => {
      if (orderedTocIds.length === 0) return
      const first = orderedTocIds[0]!
      if (sectionIdFromFormTocId(first)) {
        const orderedSectionIds = orderedTocIds
          .map((tocId) => sectionIdFromFormTocId(tocId))
          .filter((id): id is string => Boolean(id))
        if (orderedSectionIds.length === 0) return
        patchDocument((prev) => reorderFormSections(prev, orderedSectionIds))
        return
      }
      const orderedQuestionIds = orderedTocIds
        .map((tocId) => questionIdFromFormTocId(tocId))
        .filter((id): id is string => Boolean(id))
      if (orderedQuestionIds.length === 0) return
      patchDocument((prev) => reorderFormQuestions(prev, orderedQuestionIds))
    },
    [patchDocument],
  )

  const scrollAuthorToTop = useCallback(() => {
    scrollViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const authorToc =
    mode === 'author' && tocEntries.length > 0 ? (
      <NanoAnchorMenu
        entries={tocEntries}
        variant="micro"
        scrollSpy
        scrollRootRef={scrollViewportRef}
        sticky={false}
        title="Contents"
        footerLabel={embed ? undefined : document.title.trim() || 'Assessment'}
        onBackToTop={embed ? undefined : scrollAuthorToTop}
        onSelect={(id) => {
          scrollToAnchorTarget(id, scrollViewportRef.current, 12)
        }}
        label="Assessment contents"
        sortableIds={tocSortableSectionIds}
        sortableNestedGroups={tocSortableQuestionGroups}
        onReorder={onReorderFromToc}
      />
    ) : null

  const renderQuestion = (question: TestFormQuestion) =>
    mode === 'author' ? (
      <QuestionAuthor
        key={question.id}
        question={question}
        number={questionNumberById.get(question.id)}
        answerKey={document.answerKey?.[question.id]}
        onChange={(next) =>
          patchDocument((prev) => ({
            ...prev,
            questions: prev.questions.map((q) => (q.id === next.id ? next : q)),
          }))
        }
        onKeyChange={(entry) =>
          patchDocument((prev) => ({
            ...prev,
            answerKey: { ...(prev.answerKey ?? {}), [question.id]: entry },
          }))
        }
        onOpenMarking={() => setMarkingQuestionId(question.id)}
        answerPreviewOpen={answerPreviewOpenId === question.id}
        onAnswerPreviewOpenChange={(open) =>
          setAnswerPreviewOpenId(open ? question.id : null)
        }
        onRemove={() => {
          void invokeAction({
            kind: 'testform',
            actionId: 'testform.action.remove-question',
            targetId: question.id,
          })
        }}
      />
    ) : (
      <QuestionTake
        key={question.id}
        question={question}
        mode={mode}
        number={questionNumberById.get(question.id)}
        response={responses[question.id] ?? emptyResponseForQuestion(question)}
        onChange={(next) => setResponse(question.id, next)}
        showHint={Boolean(document.settings.showHintsInTake && question.hint)}
        score={document.attempt?.scores?.find((s) => s.questionId === question.id)}
        answerKey={document.answerKey?.[question.id]}
        fieldError={fieldErrors[question.id]}
      />
    )

  return (
    <div
      className={[
        'theme-test-form',
        takeChrome ? 'theme-test-form--take' : '',
        mode === 'author' ? 'theme-test-form--author' : '',
        embed ? 'theme-test-form--embed' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...(mode === 'take' || mode === 'review'
        ? { 'data-sitting-copy-ok': '', 'data-copy-surface': 'form' }
        : {})}
    >
      <div
        className={[
          'theme-test-form__shell',
          mode === 'author' ? 'theme-test-form__shell--author' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {takeChrome ? (
          <div className="theme-test-form__toolbar theme-test-form__toolbar--take">
            <StickyHeaderTitle
              title={stickyTitle}
              subtitle={stickySubtitle}
              morphKey={stickySectionId ?? 'assessment'}
            />
            <div className="theme-test-form__toolbar-center">
              {mode === 'take' && formError ? (
                <p
                  ref={formErrorRef}
                  className="theme-test-form__form-error type-caption type-error"
                  role="alert"
                >
                  {formError}
                </p>
              ) : null}
            </div>
            <div className="theme-test-form__toolbar-actions">
              {mode === 'take' ? (
                <VurifyMenuButton
                  type="button"
                  variant="label"
                  size="lg"
                  housing
                  activeChrome={false}
                  lineTone="accent"
                  onClick={() => {
                    void invokeAction({
                      kind: 'testform',
                      actionId: 'testform.action.score-attempt',
                    })
                  }}
                >
                  Submit
                </VurifyMenuButton>
              ) : null}
              {mode === 'review' ? (
                <VurifyMenuButton
                  type="button"
                  variant="label"
                  size="lg"
                  housing
                  activeChrome={false}
                  lineTone="muted"
                  onClick={() => {
                    void invokeAction({
                      kind: 'testform',
                      actionId: 'testform.action.clear-attempt',
                    })
                    setMode('take')
                  }}
                >
                  Retake
                </VurifyMenuButton>
              ) : null}
            </div>
          </div>
        ) : null}

        {scoreSummary && mode === 'review' ? (
          <div className="theme-test-form__score" role="status">
            <span className="type-label">Score</span>
            <span className="type-body">
              {scoreSummary.earned} / {scoreSummary.max}
            </span>
          </div>
        ) : null}

        {(() => {
          const list = (
            <ThemeScroll
              axis="vertical"
              rail={embed && mode === 'author' ? 'mini' : embed ? 'nano' : 'mini'}
              scrollClouds={false}
              ownScroll={!(embed && mode !== 'author')}
              className="theme-test-form__scroll"
              viewportRef={scrollViewportRef}
            >
              <div className="theme-test-form__list">
                {isEmpty ? (
                  <div className="theme-test-form__empty">
                    <p className="type-label mb-0">No sections yet</p>
                    <p className="type-caption type-muted mb-0">
                      Add a section from the tray below, then use the kind chips in each section
                      header to insert questions.
                    </p>
                  </div>
                ) : null}

                {buckets.map((bucket) => {
                  const section = bucket.section
                  const key = section?.id ?? 'unsectioned'
                  const isActive = section != null && section.id === activeSectionId
                  const sectionTitle = section?.title?.trim() || 'Other'
                  const sectionDesc = section?.description?.trim() ?? ''

                  return (
                    <section
                      key={key}
                      id={section ? formSectionTocId(section.id) : 'tf-sec-loose'}
                      className={[
                        'theme-test-form__section',
                        isActive ? 'theme-test-form__section--active' : '',
                        !section ? 'theme-test-form__section--loose' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onFocusCapture={() => {
                        if (section) setActiveSectionId(section.id)
                      }}
                    >
                      {section && mode === 'author' ? (
                        <>
                          {/* Compact spy — tall author heads must not drive scroll morph. */}
                          <div
                            className="theme-test-form__section-spy"
                            data-test-form-section-title={sectionTitle}
                            data-test-form-section-desc={sectionDesc}
                            data-test-form-section-id={section.id}
                            aria-hidden
                          />
                          <div className="theme-test-form__section-head theme-test-form__section-head--author">
                            <div className="theme-test-form__section-fields">
                              <div className="theme-test-form__section-title-row">
                                <AuthorEditable
                                  className="theme-test-form__section-title-edit"
                                  value={section.title}
                                  placeholder="Section title"
                                  allowEmpty={false}
                                  aria-label="Section title"
                                  onChange={(title) =>
                                    patchDocument((prev) => ({
                                      ...prev,
                                      sections: prev.sections.map((s) =>
                                        s.id === section.id ? { ...s, title } : s,
                                      ),
                                    }))
                                  }
                                />
                                <AuthorRemoveBtn
                                  label={`Remove section ${section.title}`}
                                  onClick={() => {
                                    void invokeAction({
                                      kind: 'testform',
                                      actionId: 'testform.action.remove-section',
                                      targetId: section.id,
                                    })
                                  }}
                                />
                              </div>
                              <AuthorEditable
                                className="theme-test-form__section-desc-edit"
                                value={section.description ?? ''}
                                placeholder="Section description (optional)"
                                multiline
                                rows={2}
                                aria-label="Section description"
                                onChange={(description) =>
                                  patchDocument((prev) => ({
                                    ...prev,
                                    sections: prev.sections.map((s) =>
                                      s.id === section.id ? { ...s, description } : s,
                                    ),
                                  }))
                                }
                              />
                              <FormAddBar
                                className="theme-test-form__section-add"
                                showSection={false}
                                onAddQuestion={(kind) => {
                                  setActiveSectionId(section.id)
                                  void invokeAction({
                                    kind: 'testform',
                                    actionId: 'testform.action.add-question',
                                    value: kind,
                                    payload: { sectionId: section.id },
                                  })
                                }}
                              />
                            </div>
                          </div>
                        </>
                      ) : (mode === 'take' || mode === 'review') &&
                        (section || bucket.questions.length > 0) ? (
                        <div className="theme-test-form__section-head">
                          <div className="theme-test-form__section-fields">
                            <h3
                              className="theme-test-form__section-heading"
                              data-test-form-section-title={sectionTitle}
                              data-test-form-section-desc={sectionDesc}
                              data-test-form-section-id={section?.id ?? '__loose__'}
                            >
                              {sectionTitle}
                            </h3>
                            {sectionDesc ? (
                              <p className="theme-test-form__section-desc type-body-sm">
                                {sectionDesc}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {bucket.questions.map(renderQuestion)}
                    </section>
                  )
                })}

                {mode === 'author' ? (
                  <div className="theme-test-form__doc-foot">
                    <FormAddBar
                      showQuestions={false}
                      onAddSection={() => {
                        void invokeAction({
                          kind: 'testform',
                          actionId: 'testform.action.add-section',
                        })
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </ThemeScroll>
          )

          if (mode === 'author') {
            return (
              <DocArticleShell
                stickyToc
                microToc
                toc={authorToc}
                className="theme-test-form__article"
              >
                <div className="theme-test-form__toolbar theme-test-form__toolbar--author">
                  <StickyHeaderTitle
                    title={stickyTitle}
                    subtitle={stickySubtitle}
                    morphKey={stickySectionId ?? 'assessment'}
                    editable
                    onTitleChange={(next) => {
                      if (stickySectionId && stickySectionId !== '__loose__') {
                        patchDocument((prev) => ({
                          ...prev,
                          sections: prev.sections.map((s) =>
                            s.id === stickySectionId ? { ...s, title: next } : s,
                          ),
                        }))
                        return
                      }
                      patchDocument((prev) => ({ ...prev, title: next }))
                    }}
                    onSubtitleChange={
                      stickySectionId && stickySectionId !== '__loose__'
                        ? (next) => {
                            patchDocument((prev) => ({
                              ...prev,
                              sections: prev.sections.map((s) =>
                                s.id === stickySectionId ? { ...s, description: next } : s,
                              ),
                            }))
                          }
                        : undefined
                    }
                  />
                  <div className="theme-test-form__toolbar-actions">
                    <InfoTooltip
                      size="xs"
                      trigger="hover"
                      placement="bottom"
                      interactive
                      aria-label="Form authoring tips"
                      content={AUTHOR_HELP}
                    />
                    {!embed ? (
                      <VurifyMenuButton
                        type="button"
                        variant="label"
                        size="lg"
                        housing
                        activeChrome={false}
                        lineTone="muted"
                        onClick={() =>
                          downloadExportedContext(
                            'testform',
                            runtimeHandle,
                            'envelope-json',
                            document.title,
                          )
                        }
                      >
                        Export
                      </VurifyMenuButton>
                    ) : null}
                  </div>
                </div>
                {list}
              </DocArticleShell>
            )
          }
          return <div className="theme-test-form__article theme-test-form__article--take">{list}</div>
        })()}

        {!embed ? (
          <div className="theme-test-form__mode-dock">
            <ToggleGroup
              mode="single"
              variant="vurify"
              size="sm"
              options={MODE_OPTIONS}
              value={mode}
              onChange={(next) => {
                const value = typeof next === 'string' ? next : next[0]
                if (value === 'author' || value === 'take' || value === 'review') setMode(value)
              }}
              aria-label="Form mode"
            />
          </div>
        ) : null}
      </div>

      <AnswerKeyModal
        open={Boolean(markingQuestion)}
        question={markingQuestion}
        answerKey={
          markingQuestion ? document.answerKey?.[markingQuestion.id] : undefined
        }
        onClose={() => setMarkingQuestionId(null)}
        onKeyChange={(entry) => {
          if (!markingQuestion) return
          patchDocument((prev) => ({
            ...prev,
            answerKey: { ...(prev.answerKey ?? {}), [markingQuestion.id]: entry },
          }))
        }}
      />
    </div>
  )
})
