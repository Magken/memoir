import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useContext,
  useState,
  type RefObject,
} from 'react'
import {
  ArrowDown,
  ArrowDownUp,
  ArrowLeft,
  ArrowUp,
  Archive,
  ArchiveRestore,
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Copy,
  Download,
  FileText,
  Layers,
  ListChecks,
  MessageCircle,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  UploadCloud,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { BgParallaxScene } from './BgParallaxScene'
import { Card } from './Card'
import { IconButton } from './IconButton'
import { InterviewCreatorPickerHome } from './InterviewCreatorPickerHome'
import { InterviewFlowTimeline, type InterviewFlowTimelineHandle } from './InterviewFlowTimeline'
import { SearchInput } from './SearchInput'
import { Tag } from './Tag'
import { Tooltip } from './Tooltip'
import { VurifyMenuButton } from './VurifyMenuButton'
import { VurifyIcon } from './VurifyIcon'
import {
  revealSectionIn,
  revealSectionOut,
  gsap,
  useGSAP,
  useGsapPageOptional,
} from '../lib/gsap'
import {
  applyComposeMetaToCreator2,
  applyComposeMetaToFlow,
  composeMetaFromCreator2,
  createComposeSession,
  composeSessionHasSaveablePlan,
  creator2BodyForPersist,
  creator2FromStoredBriefBody,
  emptyCreator2BriefDocument,
  INTERVIEW_FLOW_TIMELINE_SCROLL,
  draftFromComposeSession,
  ensureInterviewBriefToolkit,
  formatInterviewManagerDate,
  interviewManagerCategoryIcon,
  interviewManagerCategoryLabel,
  interviewManagerStats,
  interviewWindowFields,
  listedCheckWarningShorts,
  flowFromStoredBriefBody,
  listItemFromBrief,
  listItemFromComposeSession,
  mapCreator2BriefToTimeline,
  patchCreator2AnalysisShelf,
  patchCreator2CodingStep,
  patchCreator2DocStep,
  patchCreator2FormStep,
  patchCreator2Rollup,
  patchCreator2Spine,
  patchCreator2TalkStep,
  deleteCreator2Template,
  prefetchInterviewLanding,
  isCoverUrlWarmed,
  signCoverDownloadUrl,
  upsertInterviewBriefDocument,
  buildBlankCreateDocument,
  buildCreateTemplateDocument,
  createTemplateEntry,
  pickerStartWelcomeMarkdown,
  seedBoardChatFromEditReply,
  stampCopyTitleOnBriefBody,
  canOpenCreator2Builder,
  creatorOverviewPeelTags,
  matchInterviewPersonaTemplateId,
  type CreateTemplateId,
  type Creator2BriefDocument,
  type InterviewBriefDraft,
  type InterviewComposeSession,
  type InterviewManagerListItem,
  composeMetaPersonaFromDefinition,
  normalizeInterviewRoleCategoryValue,
} from '../lib/interviewBrief'
import { collectCheckSuite, checkSuiteBlocksTake, checkSuiteWarningShorts } from '../../../back_end/supabase/functions/interview-brief-edit/checkSuite.ts'
import { preserveLiveOverviewMeta } from '../../../back_end/supabase/functions/interview-brief-edit/generateAllowlist.ts'
import { rehydrateLockedToolAnalysisOnDoc } from '../../../back_end/supabase/functions/interview-brief-edit/templateRoster.ts'
import { scrollSectionHistoryFocus } from '../lib/interviewBrief/sectionHistoryFocus'
import type { CreatorOverviewChangePatch } from './InterviewFlowCreatorOverviewSection'
import * as assessmentApi from '../lib/assessmentApi'
import { toUserMessage } from '../lib/dataApi'
import type {
  EditorActionRequest,
  EditorActionResult,
  EditorRuntimeHandle,
} from '../lib/editorContext/types'
import { downloadJson } from '../lib/editorContext/download'
import { getDownloadUrl } from '../lib/fileApi'
import { listMyAccounts } from '../lib/userApi'
import { AppStageContext } from '../lib/appStage/appStageContext'
import { VURIFY_REF_PATHS } from '../lib/vurifyRef/paths'

ensureInterviewBriefToolkit()

function interviewBriefDownloadFilename(title: string, briefId: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return `${slug || 'interview-brief'}-${briefId.slice(0, 8)}.json`
}

async function hydrateDriveFile(
  url: string,
  name: string,
  fallbackType: string,
): Promise<File | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return new File([blob], name.trim() || 'file', {
      type: blob.type || fallbackType,
    })
  } catch {
    return null
  }
}

async function hydrateRolePdfFile(url: string, name: string): Promise<File | null> {
  return hydrateDriveFile(url, name || 'role-brief.pdf', 'application/pdf')
}

function revokeBlobUrl(url: string | null | undefined) {
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
}

function readSessionMetaString(meta: Record<string, unknown>, key: string): string {
  const v = meta[key]
  return typeof v === 'string' ? v.trim() : ''
}

function applyOverviewPatchToCreator2(
  prev: Creator2BriefDocument,
  patch: CreatorOverviewChangePatch,
): Creator2BriefDocument {
  const proposedRaw =
    patch.proposedMinutes != null ? Number.parseInt(patch.proposedMinutes, 10) : NaN
  const maxRaw =
    patch.maxInterviews != null ? Number.parseInt(patch.maxInterviews, 10) : NaN
  return {
    ...prev,
    definition: {
      ...prev.definition,
      meta: {
        ...prev.definition.meta,
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.roleTitle !== undefined ? { roleTitle: patch.roleTitle } : {}),
        ...(patch.roleDescription !== undefined
          ? { roleDescription: patch.roleDescription }
          : {}),
        ...(patch.candidateDescription !== undefined
          ? { candidateDescription: patch.candidateDescription }
          : {}),
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        ...(patch.proposedMinutes !== undefined
          ? {
              proposedMinutes:
                Number.isFinite(proposedRaw) && proposedRaw > 0 ? proposedRaw : undefined,
            }
          : {}),
        ...(patch.maxInterviews !== undefined
          ? {
              maxInterviews:
                Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : undefined,
            }
          : {}),
        ...(patch.opensAt !== undefined ? { opensAt: patch.opensAt || undefined } : {}),
        ...(patch.closesAt !== undefined ? { closesAt: patch.closesAt || undefined } : {}),
      },
      persona: patch.persona
        ? {
            ...prev.definition.persona,
            ...patch.persona,
          }
        : prev.definition.persona,
    },
  }
}

function applyOverviewPatchToSession(
  session: InterviewComposeSession,
  patch: CreatorOverviewChangePatch,
): InterviewComposeSession {
  return {
    ...session,
    meta: {
      ...session.meta,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.roleTitle !== undefined ? { roleTitle: patch.roleTitle } : {}),
      ...(patch.roleDescription !== undefined ? { description: patch.roleDescription } : {}),
      ...(patch.candidateDescription !== undefined
        ? { candidateDescription: patch.candidateDescription }
        : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.proposedMinutes !== undefined
        ? { proposedMinutes: patch.proposedMinutes }
        : {}),
      ...(patch.maxInterviews !== undefined ? { maxInterviews: patch.maxInterviews } : {}),
      ...(patch.opensAt !== undefined ? { opensAt: patch.opensAt } : {}),
      ...(patch.closesAt !== undefined ? { closesAt: patch.closesAt } : {}),
      ...(patch.persona
        ? {
            personaName: patch.persona.name,
            personaVoice: patch.persona.voice,
            personaBehaviour: patch.persona.behaviourPrompt ?? '',
            personaTemplateId:
              matchInterviewPersonaTemplateId({
                name: patch.persona.name,
                voice: patch.persona.voice,
                behaviourPrompt: patch.persona.behaviourPrompt ?? '',
              }) ?? '',
          }
        : {}),
    },
  }
}

async function resolveOrgAccountId(): Promise<string | null> {
  const accounts = await listMyAccounts()
  for (const row of accounts) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    if (r.kind === 'organisation' && r.id) return String(r.id)
  }
  return null
}

async function seedPickerStartWelcome(input: {
  accountId: string
  briefId: string
  title?: string
  kind: 'blank' | 'template' | 'copy'
  templateId?: string
  sourceTitle?: string
}): Promise<void> {
  try {
    await seedBoardChatFromEditReply({
      accountId: input.accountId,
      briefId: input.briefId,
      title: input.title,
      replyParts: [
        {
          type: 'markdown',
          text: pickerStartWelcomeMarkdown({
            kind: input.kind,
            templateId: input.templateId,
            sourceTitle: input.sourceTitle,
          }),
        },
      ],
    })
  } catch {
    /* Peel still opens; chat can stay empty. */
  }
}

type InterviewCreatorProps = {
  className?: string
  /** Dashboard / peel ThemeScroll viewport — Creator-2 glow + Contents scroll spy. */
  scrollRootRef?: RefObject<HTMLElement | null>
  /**
   * Fires when entering/leaving compose or builder (true) vs manage list (false).
   * Dashboard uses this to close the menu fully while editing, then restore.
   */
  onEditingChange?: (editing: boolean) => void
  /**
   * True when Creator-2 builder panel has finished its enter reveal — Dashboard opens the right chat peel.
   */
  onBuilderChange?: (active: boolean) => void
  /**
   * Close the right chat peel and wait for the width tween before leaving builder.
   * Dashboard implements; InterviewCreator awaits this before `setPanel('manage')`.
   */
  onBuilderLeave?: () => void | Promise<void>
  /**
   * Creator-2 MCT runtime for peel chat recommendation clicks (null when not in builder).
   */
  onCreator2Runtime?: (runtime: EditorRuntimeHandle | null) => void
  /**
   * Open the candidate interview shell to try this brief (agency test run).
   */
  onTestInterview?: (item: InterviewManagerListItem) => void
  /** @deprecated Local draft storage is off — briefs persist via assessmentApi. */
  persist?: boolean
  debug?: boolean
}

type PanelMode = 'manage' | 'picker' | 'builder'

const INTERVIEW_LIST_PAGE_SIZE = 6
/** Artificial pause so scroll-load feels deliberate (fixture / local list). */
const INTERVIEW_LIST_LOAD_MS = 1400
const INTERVIEW_LIST_LOAD_MS_REDUCED = 200
const BACK_TOP_SHOW_PX = 160

async function hydrateListedManagerItem(
  brief: assessmentApi.InterviewBrief,
): Promise<InterviewManagerListItem> {
  const snap = listedCheckWarningShorts(brief.metadata)
  if (snap !== null) {
    return listItemFromBrief(brief, { checkWarningShorts: snap })
  }
  try {
    const full = await assessmentApi.briefGet(brief.id, true)
    const doc = creator2FromStoredBriefBody(full.body ?? null)
    const shorts = doc
      ? checkSuiteWarningShorts(collectCheckSuite(doc as unknown as Record<string, unknown>))
      : []
    return listItemFromBrief(full, { checkWarningShorts: shorts })
  } catch {
    return listItemFromBrief(brief, { checkWarningShorts: [] })
  }
}

function liveManagerCheckWarningShorts(doc: unknown): string[] {
  return checkSuiteWarningShorts(collectCheckSuite(doc as Record<string, unknown>))
}

type InterviewDateSort = 'asc' | 'desc' | null

function interviewSortTime(item: InterviewManagerListItem): number {
  const iso = item.closesAt ?? item.opensAt ?? item.updatedAt
  const time = Date.parse(iso)
  return Number.isNaN(time) ? 0 : time
}

function nextInterviewDateSort(prev: InterviewDateSort): InterviewDateSort {
  if (prev === null) return 'asc'
  if (prev === 'asc') return 'desc'
  return null
}

function resolveDashScrollViewport(from: HTMLElement | null): HTMLElement | null {
  const host = from?.closest('.theme-scroll')
  if (!host) return null
  return host.querySelector('.theme-scroll__viewport')
}

function InterviewManageCover({
  coverNodeId,
  imageUrl,
  fallbackIcon,
  onReady,
}: {
  coverNodeId?: string
  imageUrl?: string
  fallbackIcon: LucideIcon
  onReady?: (ready: boolean) => void
}) {
  const stage = useContext(AppStageContext)
  const listActive = !stage || stage.activePath === VURIFY_REF_PATHS.dashboard
  const warmed = imageUrl?.trim() && isCoverUrlWarmed(imageUrl) ? imageUrl.trim() : null
  const [src, setSrc] = useState<string | null>(warmed)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const next = imageUrl?.trim() && isCoverUrlWarmed(imageUrl) ? imageUrl.trim() : null
    setSrc(next)
    setFailed(false)
  }, [imageUrl, coverNodeId])

  useEffect(() => {
    if (!coverNodeId || !listActive) return
    let cancelled = false
    void signCoverDownloadUrl(coverNodeId).then((url) => {
      if (cancelled) return
      if (url) {
        setSrc(url)
        setFailed(false)
        onReady?.(true)
      } else {
        setFailed(true)
        onReady?.(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [coverNodeId, listActive])

  useEffect(() => {
    onReady?.(Boolean(src && !failed))
  }, [src, failed, onReady])

  if (!src || failed) {
    return <VurifyIcon icon={fallbackIcon} variant="plain" tone="muted" size="sm" />
  }

  return (
    <BgParallaxScene strength={1.15} className="theme-interview-creator__list-cover">
      <img
        className="theme-interview-creator__list-cover-img theme-bg-parallax__media"
        src={src}
        alt=""
        width={64}
        height={64}
        decoding="async"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </BgParallaxScene>
  )
}

function InterviewManageRow({
  item,
  onCopy,
  onEdit,
  onTest,
  onDownload,
  onTogglePublish,
  onArchive,
  onUnarchive,
  loading = false,
  downloading = false,
}: {
  item: InterviewManagerListItem
  onCopy: (item: InterviewManagerListItem) => void
  onEdit: (item: InterviewManagerListItem) => void
  onTest?: (item: InterviewManagerListItem) => void
  onDownload?: (item: InterviewManagerListItem) => void
  onTogglePublish: (item: InterviewManagerListItem) => void
  onArchive: (item: InterviewManagerListItem) => void
  onUnarchive: (item: InterviewManagerListItem) => void
  loading?: boolean
  downloading?: boolean
}) {
  const Icon = interviewManagerCategoryIcon(item.category)
  const categoryLabel = interviewManagerCategoryLabel(item.category)
  const window = interviewWindowFields(item)
  const isArchived = item.status === 'archived'
  const isPublished = item.status === 'published'
  const publishLabel = isPublished ? 'Unpublish' : 'Publish'
  const PublishIcon = isPublished ? Ban : UploadCloud
  const StatusIcon =
    item.status === 'published' ? CheckCircle2 : item.status === 'archived' ? Archive : FileText
  // Published -> unpublish (draft). Draft/archived publish uses publish RPC.
  const stepLine =
    item.toolPhaseCount > 0
      ? `${item.phaseCount} steps · ${item.toolPhaseCount} tools`
      : `${item.phaseCount} steps`
  const applicantLine =
    item.applicantsInProgress > 0
      ? `${item.applicantsTaken} taken · ${item.applicantsInProgress} live`
      : `${item.applicantsTaken} taken`
  const inviteLine = item.invitesPending > 0 ? `${item.invitesPending} invites` : null
  const canCover = Boolean(item.coverNodeId || item.imageUrl)
  const [hasCover, setHasCover] = useState(() =>
    Boolean(item.imageUrl && isCoverUrlWarmed(item.imageUrl)),
  )
  const checkShorts = item.checkWarningShorts ?? []
  const takeBlocked = checkShorts.length > 0
  const testTooltip = takeBlocked
    ? `${checkShorts.length} warning${checkShorts.length === 1 ? '' : 's'} — not takeable`
    : 'Test interview'
  const publishBlocked = takeBlocked && !isPublished

  return (
    <li
      className={[
        'theme-interview-creator__list-item',
        hasCover ? 'theme-interview-creator__list-item--cover' : '',
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
        tabIndex={loading ? -1 : 0}
        aria-label={loading ? `Loading ${item.title}` : `Edit ${item.title}`}
        aria-disabled={loading || undefined}
        onClick={() => {
          if (loading) return
          onEdit(item)
        }}
        onKeyDown={(event) => {
          if (loading) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onEdit(item)
          }
        }}
      >
        <span
          className={[
            'theme-interview-creator__list-mark',
            hasCover ? 'theme-interview-creator__list-mark--cover' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden={hasCover ? undefined : true}
        >
          {canCover ? (
            <InterviewManageCover
              coverNodeId={item.coverNodeId}
              imageUrl={item.imageUrl}
              fallbackIcon={Icon}
              onReady={setHasCover}
            />
          ) : (
            <VurifyIcon icon={Icon} variant="plain" tone="muted" size="sm" />
          )}
        </span>
        <div className="theme-interview-creator__list-main">
          <div className="theme-interview-creator__list-rest">
            <div className="theme-interview-creator__list-heading">
              <h3 className="mb-0 theme-interview-creator__list-title" title={item.title}>
                {item.title}
              </h3>
              <div className="theme-interview-creator__list-heading-trail">
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
                {takeBlocked ? (
                  <Tooltip
                    interactive
                    content={
                      <ul className="theme-interview-creator__warn-tip">
                        {checkShorts.map((short, index) => (
                          <li key={`${item.id}-warn-${index}`}>{short}</li>
                        ))}
                      </ul>
                    }
                  >
                    <span
                      className="theme-interview-creator__warn-hit"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Tag
                        size="sm"
                        className="theme-interview-flow-timeline__tag theme-interview-flow-timeline__tag--gate"
                      >
                        <AlertTriangle
                          className="theme-interview-flow-timeline__tag-icon size-3 shrink-0"
                          aria-hidden
                        />
                        <span>
                          {checkShorts.length === 1
                            ? '1 warning'
                            : `${checkShorts.length} warnings`}
                        </span>
                      </Tag>
                    </span>
                  </Tooltip>
                ) : null}
              </div>
              <div
                className="theme-interview-creator__list-actions"
                role="group"
                aria-label={`${item.title} actions`}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <Tooltip content="Create copy">
                  <IconButton
                    icon={Copy}
                    size="xs"
                    variant="tray"
                    aria-label="Create copy"
                    onClick={() => onCopy(item)}
                  />
                </Tooltip>
                <Tooltip content="Edit">
                  <IconButton
                    icon={Pencil}
                    size="xs"
                    variant="tray"
                    aria-label="Edit"
                    onClick={() => onEdit(item)}
                  />
                </Tooltip>
                {onTest ? (
                  <Tooltip content={testTooltip}>
                    <IconButton
                      icon={Play}
                      size="xs"
                      variant="tray"
                      aria-label={testTooltip}
                      disabled={loading || takeBlocked}
                      onClick={() => onTest(item)}
                    />
                  </Tooltip>
                ) : null}
                {onDownload ? (
                  <Tooltip content="Download JSON">
                    <IconButton
                      icon={Download}
                      size="xs"
                      variant="tray"
                      aria-label="Download JSON"
                      disabled={downloading}
                      onClick={() => onDownload(item)}
                    />
                  </Tooltip>
                ) : null}
                {!isArchived ? (
                  <Tooltip content={publishBlocked ? testTooltip : publishLabel}>
                    <IconButton
                      icon={PublishIcon}
                      size="xs"
                      variant="tray"
                      aria-label={publishBlocked ? testTooltip : publishLabel}
                      active={isPublished}
                      disabled={publishBlocked}
                      onClick={() => onTogglePublish(item)}
                    />
                  </Tooltip>
                ) : null}
                {isArchived ? (
                  <Tooltip content="Unarchive">
                    <IconButton
                      icon={ArchiveRestore}
                      size="xs"
                      variant="tray"
                      aria-label="Unarchive"
                      onClick={() => onUnarchive(item)}
                    />
                  </Tooltip>
                ) : (
                  <Tooltip content="Archive">
                    <IconButton
                      icon={Archive}
                      size="xs"
                      variant="tray"
                      aria-label="Archive"
                      onClick={() => onArchive(item)}
                    />
                  </Tooltip>
                )}
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
                  <span title={item.proposedMinutes ? `Proposed ${item.proposedMinutes}m` : undefined}>
                    {item.estimatedMinutes}m
                  </span>
                </Tag>
                <Tag size="sm" className="theme-interview-flow-timeline__tag">
                  <Users
                    className="theme-interview-flow-timeline__tag-icon size-3 shrink-0"
                    aria-hidden
                  />
                  <span>{applicantLine}</span>
                </Tag>
                {inviteLine ? (
                  <Tag size="sm" className="theme-interview-flow-timeline__tag">
                    <MessageCircle
                      className="theme-interview-flow-timeline__tag-icon size-3 shrink-0"
                      aria-hidden
                    />
                    <span>{inviteLine}</span>
                  </Tag>
                ) : null}
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
          {loading ? <span className="sr-only">Loading interview</span> : null}
        </span>
      </article>
    </li>
  )
}

function ManageHome({
  items,
  listBusy,
  listError,
  onRetryList,
  onCopyInterview,
  onTogglePublish,
  onArchiveInterview,
  onUnarchiveInterview,
  onCreateInterview,
  onEditInterview,
  onTestInterview,
  onDownloadInterview,
  restoreFocusId,
  openingEditId,
  testingInterviewId,
  downloadingId,
}: {
  items: InterviewManagerListItem[]
  listBusy: boolean
  listError: string | null
  onRetryList: () => void
  onCopyInterview: (item: InterviewManagerListItem) => void
  onTogglePublish: (item: InterviewManagerListItem) => void
  onArchiveInterview: (item: InterviewManagerListItem) => void
  onUnarchiveInterview: (item: InterviewManagerListItem) => void
  onCreateInterview: () => void
  onEditInterview: (item: InterviewManagerListItem) => void
  onTestInterview?: (item: InterviewManagerListItem) => void
  onDownloadInterview?: (item: InterviewManagerListItem) => void
  restoreFocusId?: string | null
  /** Brief id while briefGet runs before compose opens. */
  openingEditId?: string | null
  /** Brief id while landing assets prefetch before `/interview`. */
  testingInterviewId?: string | null
  /** Brief id while JSON download is in flight. */
  downloadingId?: string | null
}) {
  const [listQuery, setListQuery] = useState('')
  const [dateSort, setDateSort] = useState<InterviewDateSort>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [visibleCount, setVisibleCount] = useState(INTERVIEW_LIST_PAGE_SIZE)
  const [listLoading, setListLoading] = useState(false)
  const [showBackTop, setShowBackTop] = useState(false)
  const manageHomeRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLUListElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const createBtnRef = useRef<HTMLDivElement>(null)
  const revealedCountRef = useRef(0)
  const pendingScrollIdRef = useRef<string | null>(null)
  const listLoadBusyRef = useRef(false)
  const gsapPage = useGsapPageOptional()
  const reducedMotion = gsapPage?.reducedMotion ?? false

  const filteredItems = useMemo(() => {
    const q = listQuery.trim().toLowerCase()
    const scoped = showArchived ? items : items.filter((item) => item.status !== 'archived')
    const filtered = !q
      ? scoped
      : scoped.filter((item) => {
          const category = interviewManagerCategoryLabel(item.category).toLowerCase()
          const haystack = [
            item.title,
            item.roleTitle,
            item.status,
            category,
            item.category,
            item.description ?? '',
            item.windowLabel ?? '',
            item.opensAt ? formatInterviewManagerDate(item.opensAt) : '',
            item.closesAt ? formatInterviewManagerDate(item.closesAt) : '',
          ]
            .join(' ')
            .toLowerCase()
          return haystack.includes(q)
        })
    if (!dateSort) return filtered
    const dir = dateSort === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => (interviewSortTime(a) - interviewSortTime(b)) * dir)
  }, [items, listQuery, dateSort, showArchived])

  const cycleDateSort = useCallback(() => {
    setDateSort((prev) => nextInterviewDateSort(prev))
  }, [])

  const handleCopy = useCallback(
    (item: InterviewManagerListItem) => {
      setListQuery('')
      setVisibleCount(INTERVIEW_LIST_PAGE_SIZE)
      onCopyInterview(item)
    },
    [onCopyInterview],
  )

  const handleEdit = useCallback(
    (item: InterviewManagerListItem) => {
      if (openingEditId) return
      onEditInterview(item)
    },
    [onEditInterview, openingEditId],
  )

  const handleTest = useCallback(
    (item: InterviewManagerListItem) => {
      if (openingEditId || testingInterviewId) return
      onTestInterview?.(item)
    },
    [onTestInterview, openingEditId, testingInterviewId],
  )

  const handleDownload = useCallback(
    (item: InterviewManagerListItem) => {
      onDownloadInterview?.(item)
    },
    [onDownloadInterview],
  )

  const handleTogglePublish = useCallback(
    (item: InterviewManagerListItem) => {
      onTogglePublish(item)
    },
    [onTogglePublish],
  )

  const handleArchive = useCallback(
    (item: InterviewManagerListItem) => {
      onArchiveInterview(item)
    },
    [onArchiveInterview],
  )

  const handleUnarchive = useCallback(
    (item: InterviewManagerListItem) => {
      onUnarchiveInterview(item)
    },
    [onUnarchiveInterview],
  )

  useLayoutEffect(() => {
    if (!restoreFocusId) return
    if (restoreFocusId === '__create__') {
      createBtnRef.current?.querySelector<HTMLElement>('button')?.focus()
      return
    }
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-interview-id="${CSS.escape(restoreFocusId)}"]`,
    )
    row?.querySelector<HTMLElement>('button[aria-label="Edit"]')?.focus()
  }, [restoreFocusId])

  const filterKey = filteredItems.map((item) => item.id).join('|')
  const visibleItems = filteredItems.slice(0, visibleCount)
  const hasMore = visibleCount < filteredItems.length
  const visibleKey = `${filterKey}#${visibleItems.length}`

  useLayoutEffect(() => {
    const id = pendingScrollIdRef.current
    if (!id) return
    const row = listRef.current?.querySelector<HTMLElement>(`[data-interview-id="${id}"]`)
    if (!row) return
    pendingScrollIdRef.current = null
    row.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'center',
      inline: 'nearest',
    })
  }, [items, visibleKey, reducedMotion])

  useEffect(() => {
    revealedCountRef.current = 0
    listLoadBusyRef.current = false
    setListLoading(false)
    setVisibleCount(INTERVIEW_LIST_PAGE_SIZE)
  }, [filterKey])

  useEffect(() => {
    if (!listLoading) return
    const ms = reducedMotion ? INTERVIEW_LIST_LOAD_MS_REDUCED : INTERVIEW_LIST_LOAD_MS
    const timer = window.setTimeout(() => {
      startTransition(() => {
        setVisibleCount((count) =>
          Math.min(count + INTERVIEW_LIST_PAGE_SIZE, filteredItems.length),
        )
        setListLoading(false)
        listLoadBusyRef.current = false
      })
    }, ms)
    return () => window.clearTimeout(timer)
  }, [listLoading, filteredItems.length, reducedMotion])

  useEffect(() => {
    if (!hasMore || listLoading) return
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        if (listLoadBusyRef.current) return
        listLoadBusyRef.current = true
        setListLoading(true)
      },
      { root: null, rootMargin: '160px 0px', threshold: 0 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [filteredItems.length, hasMore, visibleCount, listLoading])

  useEffect(() => {
    const home = manageHomeRef.current
    const viewport = resolveDashScrollViewport(home)
    if (!viewport) return

    const sync = () => {
      setShowBackTop(viewport.scrollTop > BACK_TOP_SHOW_PX)
    }
    sync()
    viewport.addEventListener('scroll', sync, { passive: true })
    return () => viewport.removeEventListener('scroll', sync)
  }, [filterKey, visibleCount])

  const scrollToTop = useCallback(() => {
    const viewport = resolveDashScrollViewport(manageHomeRef.current)
    if (!viewport) return
    viewport.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [reducedMotion])

  const stats = useMemo(() => interviewManagerStats(filteredItems), [filteredItems])
  const statsKey = stats.map((s) => `${s.id}:${s.value}`).join('|')

  useGSAP(
    () => {
      const root = statsRef.current
      if (!root) return
      const values = root.querySelectorAll('.theme-interview-creator__stat-value')
      if (!values.length) return
      if (reducedMotion) {
        gsap.set(values, { clearProps: 'opacity,transform' })
        return
      }
      gsap.fromTo(
        values,
        { y: 8, opacity: 0.25 },
        { y: 0, opacity: 1, duration: 0.32, stagger: 0.045, ease: 'power2.out', overwrite: 'auto' },
      )
    },
    { dependencies: [statsKey, reducedMotion], scope: statsRef },
  )

  useGSAP(
    () => {
      const root = listRef.current
      if (!root) return
      const items = Array.from(root.querySelectorAll('.theme-interview-creator__list-item'))
      if (!items.length) {
        revealedCountRef.current = 0
        return
      }
      const fresh = items.slice(revealedCountRef.current)
      revealedCountRef.current = items.length
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

  return (
    <div ref={manageHomeRef} className="theme-interview-creator__manage-home">
      <header className="theme-interview-creator__manage-header">
        <h2 className="type-display-md mb-0 theme-interview-creator__manage-title" data-dash-anim>
          Interview manager
        </h2>
        <div className="theme-interview-creator__manage-divider" aria-hidden data-dash-anim />
        <div className="theme-interview-creator__manage-create" data-dash-anim ref={createBtnRef}>
          <VurifyMenuButton
            variant="label"
            size="md"
            housing
            activeChrome={false}
            icon={Plus}
            iconPosition="left"
            lineTone="accent"
            onClick={onCreateInterview}
            disabled={Boolean(openingEditId || testingInterviewId)}
          >
            Create
          </VurifyMenuButton>
        </div>
      </header>

      <div
        className="theme-interview-creator__back-top-host"
        data-visible={showBackTop ? 'true' : 'false'}
      >
        <IconButton
          icon={ArrowUp}
          aria-label="Back to top"
          variant="tray"
          size="md"
          className="theme-interview-creator__back-top"
          onClick={scrollToTop}
        />
      </div>

      <div className="theme-interview-creator__manage-body">
        <div className="theme-interview-creator__manage-toolbar" data-dash-anim>
          <div className="theme-interview-creator__manage-search">
            <SearchInput
              size="lg"
              variant="vurify"
              label="Search interviews"
              value={listQuery}
              onValueChange={setListQuery}
              ariaLabel="Search interviews"
            />
          </div>
          <Card variant="vurify-inset" className="theme-interview-creator__stat-window">
            <ul
              ref={statsRef}
              className="theme-interview-creator__stats"
              aria-label="Interview stats"
            >
              {stats.map((stat) => (
                <li key={stat.id} className="theme-interview-creator__stat-item">
                  <p className="type-overline mb-0 theme-interview-creator__stat-label">
                    {stat.label}
                  </p>
                  <p className="type-display-sm mb-0 theme-interview-creator__stat-value">
                    {stat.value}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <section className="theme-interview-creator__library" data-dash-anim aria-label="Interviews">
          <div className="theme-interview-creator__library-head">
            <p className="type-overline mb-0">Interviews</p>
            <div className="theme-interview-creator__library-meta">
              <p className="type-caption type-muted mb-0 theme-interview-creator__library-count">
                {listQuery.trim() || showArchived
                  ? `${filteredItems.length} of ${items.length}`
                  : `${filteredItems.length} briefs`}
              </p>
              <Tooltip
                content={showArchived ? 'Showing archived interviews' : 'Show archived interviews'}
              >
                <IconButton
                  icon={ListChecks}
                  aria-label="Show archived interviews"
                  aria-pressed={showArchived}
                  size="xs"
                  variant="ghost"
                  active={showArchived}
                  onClick={() => setShowArchived((v) => !v)}
                />
              </Tooltip>
              <Tooltip
                content={
                  dateSort === 'asc'
                    ? 'Sorted by close date · earliest first'
                    : dateSort === 'desc'
                      ? 'Sorted by close date · latest first'
                      : 'Sort by close date'
                }
              >
                <IconButton
                  icon={dateSort === 'asc' ? ArrowUp : dateSort === 'desc' ? ArrowDown : ArrowDownUp}
                  aria-label="Sort by close date"
                  aria-pressed={dateSort !== null}
                  size="xs"
                  variant="ghost"
                  active={dateSort !== null}
                  onClick={cycleDateSort}
                />
              </Tooltip>
              <Tooltip content="Refresh interviews">
                <IconButton
                  icon={RefreshCw}
                  aria-label="Refresh interviews"
                  size="xs"
                  variant="ghost"
                  disabled={listBusy}
                  onClick={onRetryList}
                />
              </Tooltip>
            </div>
          </div>
          {listBusy ? (
            <div
              className="theme-interview-creator__list-loading theme-interview-creator__list-loading--initial"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <span className="type-display-sm type-accent theme-interview-creator__list-loading-label">
                Loading
              </span>
            </div>
          ) : listError ? (
            <div className="theme-interview-creator__list-empty">
              <p className="mb-0 theme-interview-creator__list-empty-title theme-interview-creator__list-empty-title--error">
                {listError}
              </p>
              <div className="theme-interview-creator__list-empty-action">
                <VurifyMenuButton
                  variant="label"
                  size="lg"
                  housing
                  activeChrome={false}
                  icon={RotateCcw}
                  iconPosition="left"
                  lineTone="accent"
                  onClick={onRetryList}
                >
                  Retry
                </VurifyMenuButton>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="theme-interview-creator__list-empty">
              <p className="mb-0 theme-interview-creator__list-empty-title">
                {items.length === 0
                  ? 'No interviews'
                  : listQuery.trim()
                    ? 'No interviews match that search.'
                    : showArchived
                      ? 'No archived interviews.'
                      : 'No active interviews. But archived interviews are available.'}
              </p>
              {items.length === 0 ? (
                <div className="theme-interview-creator__list-empty-action">
                  <VurifyMenuButton
                    variant="label"
                    size="lg"
                    housing
                    activeChrome={false}
                    icon={Plus}
                    iconPosition="left"
                    lineTone="accent"
                    onClick={onCreateInterview}
                  >
                    Create
                  </VurifyMenuButton>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <ul ref={listRef} className="theme-interview-creator__list">
                {visibleItems.map((item) => (
                  <InterviewManageRow
                    key={item.id}
                    item={item}
                    loading={openingEditId === item.id || testingInterviewId === item.id}
                    downloading={downloadingId === item.id}
                    onCopy={handleCopy}
                    onEdit={handleEdit}
                    onTest={onTestInterview ? handleTest : undefined}
                    onDownload={onDownloadInterview ? handleDownload : undefined}
                    onTogglePublish={handleTogglePublish}
                    onArchive={handleArchive}
                    onUnarchive={handleUnarchive}
                  />
                ))}
              </ul>
              {listLoading ? (
                <div
                  className="theme-interview-creator__list-loading"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <span className="type-display-sm type-accent theme-interview-creator__list-loading-label">
                    Loading
                  </span>
                </div>
              ) : hasMore ? (
                <div
                  ref={sentinelRef}
                  className="theme-interview-creator__list-sentinel"
                  aria-hidden
                />
              ) : (
                <p
                  className="type-display-sm type-accent theme-interview-creator__list-end"
                  role="status"
                >
                  End
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export function InterviewCreator({
  className = '',
  scrollRootRef,
  onEditingChange,
  onBuilderChange,
  onBuilderLeave,
  onCreator2Runtime,
  onTestInterview,
  persist: _persist = false,
  debug = false,
}: InterviewCreatorProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const panelStageRef = useRef<HTMLDivElement>(null)
  const panelSwapBusyRef = useRef(false)
  const pendingPanelRef = useRef<PanelMode>('manage')
  const serverSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const gsapPage = useGsapPageOptional()
  const reducedMotion = gsapPage?.reducedMotion ?? false

  const [items, setItems] = useState<InterviewManagerListItem[]>([])
  const [listBusy, setListBusy] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [orgAccountId, setOrgAccountId] = useState<string | null>(null)
  const [session, setSession] = useState<InterviewComposeSession | null>(null)
  const [draft, setDraft] = useState<InterviewBriefDraft | null>(null)
  /** Creator-2 plan brief for the builder panel (compose meta stamped on enter). */
  const [creator2Doc, setCreator2Doc] = useState<Creator2BriefDocument | null>(null)
  /** Latest plan — Save / Back / open must not read a stale render closure. */
  const creator2DocRef = useRef<Creator2BriefDocument | null>(null)
  /** True after local Creator-2 edits until a successful server write/load. */
  const creator2DirtyRef = useRef(false)
  /** Latest compose session — flush/save must not read a stale render closure. */
  const sessionRef = useRef<InterviewComposeSession | null>(null)
  /** Serializes Save + bot-turn flush so concurrent upserts cannot race. */
  const briefPersistChainRef = useRef(Promise.resolve())
  /** Bumps on each intentional brief write so late open-builder upgrades cannot stomp newer Saves. */
  const briefSaveGenRef = useRef(0)
  const [editorKey, setEditorKey] = useState(0)
  const [panel, setPanel] = useState<PanelMode>('manage')
  const [visiblePanel, setVisiblePanel] = useState<PanelMode>('manage')
  const [restoreFocusId, setRestoreFocusId] = useState<string | null>(null)
  const [openingBuilder, setOpeningBuilder] = useState(false)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [botError, setBotError] = useState<string | null>(null)
  const [builderGlowEpoch, setBuilderGlowEpoch] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveComplete, setSaveComplete] = useState(false)
  const saveCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timelineApiRef = useRef<InterviewFlowTimelineHandle | null>(null)
  const [leavingPanel, setLeavingPanel] = useState(false)
  const [openingEditId, setOpeningEditId] = useState<string | null>(null)
  const [testingInterviewId, setTestingInterviewId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const enteredPanelRef = useRef<PanelMode | null>(null)
  const skipFirstPanelEnterRef = useRef(true)
  const returnFocusRef = useRef<string | null>(null)

  useEffect(() => {
    creator2DocRef.current = creator2Doc
  }, [creator2Doc])

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  /** Notify shell when entering/leaving the editor (not the Create picker). */
  const editingRef = useRef(false)
  useEffect(() => {
    const editing = panel === 'builder'
    if (editing !== editingRef.current) {
      editingRef.current = editing
      onEditingChange?.(editing)
    }
  }, [onEditingChange, panel])

  useEffect(() => {
    return () => {
      if (!editingRef.current) return
      editingRef.current = false
      onEditingChange?.(false)
    }
  }, [onEditingChange])

  /** Right chat peel — open only after builder enter; leave closes peel first. */
  const builderPeelTokenRef = useRef(0)
  const onBuilderChangeRef = useRef(onBuilderChange)
  onBuilderChangeRef.current = onBuilderChange

  useEffect(() => {
    return () => {
      builderPeelTokenRef.current += 1
      onBuilderChangeRef.current?.(false)
    }
  }, [])

  useGSAP(
    () => {
      const stage = panelStageRef.current
      if (!stage) return
      pendingPanelRef.current = panel
      const durationIn = reducedMotion ? 0.01 : 0.4
      const durationOut = reducedMotion ? 0.01 : 0.2
      const stagger = reducedMotion ? 0 : 0.045

      if (panel === visiblePanel) {
        panelSwapBusyRef.current = false
        if (enteredPanelRef.current === visiblePanel) return
        enteredPanelRef.current = visiblePanel
        if (skipFirstPanelEnterRef.current) {
          skipFirstPanelEnterRef.current = false
          if (visiblePanel === 'builder') {
            setBuilderGlowEpoch((n) => n + 1)
            const enterToken = builderPeelTokenRef.current
            window.requestAnimationFrame(() => {
              if (builderPeelTokenRef.current !== enterToken) return
              if (pendingPanelRef.current !== 'builder') return
              onBuilderChangeRef.current?.(true)
            })
          }
          return
        }
        const enterToken =
          visiblePanel === 'builder' ? builderPeelTokenRef.current : null
        revealSectionIn(stage, {
          reducedMotion,
          duration: durationIn,
          stagger,
          onComplete: () => {
            if (pendingPanelRef.current === 'builder' || visiblePanel === 'builder') {
              setBuilderGlowEpoch((n) => n + 1)
            }
            if (enterToken == null) return
            if (builderPeelTokenRef.current !== enterToken) return
            if (pendingPanelRef.current !== 'builder') return
            onBuilderChangeRef.current?.(true)
          },
        })
        return
      }

      enteredPanelRef.current = null
      if (panelSwapBusyRef.current) return
      panelSwapBusyRef.current = true
      if (panel !== 'builder') {
        setBuilderGlowEpoch(0)
        setSaveComplete(false)
      }
      revealSectionOut(stage, {
        reducedMotion,
        duration: durationOut,
        stagger: reducedMotion ? 0 : 0.028,
        onComplete: () => {
          setVisiblePanel(pendingPanelRef.current)
          panelSwapBusyRef.current = false
        },
      })
    },
    {
      dependencies: [panel, visiblePanel, reducedMotion],
      scope: panelStageRef,
    },
  )

  const scrollPeelToTop = useCallback(() => {
    const host =
      scrollRootRef?.current ??
      rootRef.current?.closest('.theme-scroll__viewport') ??
      null
    if (host) host.scrollTop = 0
  }, [scrollRootRef])

  /** Only when entering builder — not on every scrollRootRef identity churn. */
  const wasBuilderPanelRef = useRef(false)
  useLayoutEffect(() => {
    const isBuilder = visiblePanel === 'builder'
    if (isBuilder && !wasBuilderPanelRef.current) {
      scrollPeelToTop()
    }
    wasBuilderPanelRef.current = isBuilder
  }, [visiblePanel, scrollPeelToTop])

  useEffect(() => {
    if (debug) {
      console.debug('[InterviewCreator]', {
        panel,
        sessionId: session?.listItemId,
        title: session?.meta.title,
        nodes: draft?.flow.nodes.length ?? 0,
      })
    }
  }, [debug, draft, panel, session])

  const applySessionLocal = useCallback((nextSession: InterviewComposeSession) => {
    sessionRef.current = nextSession
    setSession(nextSession)
    const nextDraft = draftFromComposeSession(nextSession)
    if (nextDraft) {
      setDraft(nextDraft)
    } else {
      setDraft(null)
    }
  }, [])

  const upsertListFromBrief = useCallback(
    (
      brief: assessmentApi.InterviewBrief,
      extras?: Parameters<typeof listItemFromBrief>[1],
    ) => {
      setItems((prev) => {
        const existing = prev.find((item) => item.id === brief.id)
        const row = listItemFromBrief(brief, {
          ...extras,
          imageUrl:
            extras && 'imageUrl' in extras ? extras.imageUrl : existing?.imageUrl,
          coverNodeId:
            extras && 'coverNodeId' in extras ? extras.coverNodeId : existing?.coverNodeId,
        })
        const idx = prev.findIndex((item) => item.id === row.id)
        if (idx === -1) return [row, ...prev]
        const copy = [...prev]
        copy[idx] = row
        return copy
      })
    },
    [],
  )

  const upsertListFromSession = useCallback((next: InterviewComposeSession) => {
    if (!next.flow) return
    if (!next.serverBriefId && next.mode === 'create') return
    setItems((prev) => {
      const id = next.serverBriefId ?? next.listItemId
      const existing = prev.find((row) => row.id === id)
      const row = listItemFromComposeSession(next, existing)
      const idx = prev.findIndex((item) => item.id === row.id)
      if (idx === -1) return [row, ...prev]
      const copy = [...prev]
      copy[idx] = row
      return copy
    })
  }, [])

  const saveBriefFromSession = useCallback(
    async (
      next: InterviewComposeSession,
      opts?: {
        body?: Record<string, unknown> | null
        creator2?: Creator2BriefDocument | null
      },
    ) => {
      if (!opts?.body && !next.flow) throw new Error('No interview plan to save')
      briefSaveGenRef.current += 1
      const saveGen = briefSaveGenRef.current
      let accountId = orgAccountId
      if (!accountId) {
        accountId = await resolveOrgAccountId()
        if (!accountId) {
          throw new Error('Sign in with an organisation account to save interviews.')
        }
        setOrgAccountId(accountId)
      }
      const { brief, rolePdfNodeId, coverNodeId } = await upsertInterviewBriefDocument({
        accountId,
        briefId: next.serverBriefId ?? null,
        title: next.meta.title,
        flow: next.flow,
        meta: next.meta,
        body: opts?.body,
        creator2: opts?.creator2 ?? null,
        rolePdfFile: next.rolePdfDirty ? next.rolePdfFile : null,
        rolePdfNodeId: next.rolePdfNodeId ?? null,
        coverFile: next.coverDirty ? next.coverFile : null,
        coverNodeId: next.coverNodeId ?? null,
      })
      let rolePdfUrl = next.rolePdfUrl ?? null
      let rolePdfFile = next.rolePdfFile
      if (rolePdfNodeId) {
        try {
          rolePdfUrl = await getDownloadUrl(rolePdfNodeId)
        } catch {
          /* soft — upload succeeded; viewer may retry later */
        }
        if (!rolePdfFile && rolePdfUrl) {
          rolePdfFile = await hydrateRolePdfFile(
            rolePdfUrl,
            next.meta.rolePdfName || 'role-brief.pdf',
          )
        }
      } else {
        rolePdfUrl = null
        rolePdfFile = null
      }
      let coverUrl = next.coverUrl ?? null
      let coverFile = next.coverFile
      if (coverNodeId) {
        try {
          const signed = await getDownloadUrl(coverNodeId)
          if (coverUrl?.startsWith('blob:')) revokeBlobUrl(coverUrl)
          coverUrl = signed
        } catch {
          /* soft */
        }
        if (!coverFile && coverUrl) {
          coverFile = await hydrateDriveFile(
            coverUrl,
            next.meta.coverName || 'cover.jpg',
            'image/jpeg',
          )
        }
      } else if (!next.meta.coverName.trim()) {
        revokeBlobUrl(coverUrl)
        coverUrl = null
        coverFile = null
      }
      return {
        brief,
        accountId,
        rolePdfNodeId,
        rolePdfUrl,
        rolePdfFile,
        coverNodeId,
        coverUrl,
        coverFile,
        saveGen,
      }
    },
    [orgAccountId],
  )

  const refreshBriefList = useCallback(async () => {
    setListBusy(true)
    setListError(null)
    try {
      const accountId = await resolveOrgAccountId()
      if (!accountId) {
        setOrgAccountId(null)
        setItems([])
        setListError('Sign in with an organisation account to manage interviews.')
        return
      }
      setOrgAccountId(accountId)
      const listed = await assessmentApi.briefList(accountId, { limit: 100 })
      const rows = await Promise.all(
        listed.items.map(async (brief) => {
          const meta = (brief.metadata ?? {}) as Record<string, unknown>
          const coverNodeId =
            typeof meta.coverNodeId === 'string' && meta.coverNodeId.trim()
              ? meta.coverNodeId.trim()
              : ''
          const [imageUrl, item] = await Promise.all([
            coverNodeId
              ? getDownloadUrl(coverNodeId).catch(() => undefined)
              : Promise.resolve(undefined),
            hydrateListedManagerItem(brief),
          ])
          return { ...item, imageUrl }
        }),
      )
      setItems(rows)
    } catch (e) {
      setItems([])
      setListError(toUserMessage(e))
    } finally {
      setListBusy(false)
    }
  }, [])

  useEffect(() => {
    void refreshBriefList()
  }, [refreshBriefList])

  useEffect(() => {
    return () => {
      if (serverSaveTimerRef.current) clearTimeout(serverSaveTimerRef.current)
      if (saveCompleteTimerRef.current) clearTimeout(saveCompleteTimerRef.current)
    }
  }, [])

  const openPicker = useCallback(() => {
    returnFocusRef.current = '__create__'
    setListError(null)
    setBotError(null)
    applySessionLocal(createComposeSession('create'))
    setCreator2Doc(null)
    creator2DocRef.current = null
    creator2DirtyRef.current = false
    setPanel('picker')
  }, [applySessionLocal])

  const openBuilderFromList = useCallback(
    async (item: InterviewManagerListItem) => {
      returnFocusRef.current = item.id
      if (openingEditId) return
      setBotError(null)
      setListError(null)
      setOpeningEditId(item.id)
      try {
        const brief = await assessmentApi.briefGet(item.id, true)
        const storedFlow = flowFromStoredBriefBody(brief.body ?? null)
        const metaRecord = (brief.metadata ?? {}) as Record<string, unknown>
        const bodyMeta =
          brief.body && typeof brief.body === 'object'
            ? (((brief.body as Record<string, unknown>).definition as Record<string, unknown> | undefined)
                ?.meta as Record<string, unknown> | undefined) ?? {}
            : {}
        let next = createComposeSession(
          'edit',
          listItemFromBrief(brief, {
            roleTitle: item.roleTitle,
            category: item.category,
            estimatedMinutes: item.estimatedMinutes,
            proposedMinutes: item.proposedMinutes,
            phaseCount: item.phaseCount,
            toolPhaseCount: item.toolPhaseCount,
          }),
          {
            flow: storedFlow,
            serverAccountId: brief.accountId || orgAccountId,
          },
        )
        const flowCfg = storedFlow
          ? ((storedFlow.nodes.find((n) => n.kind === 'interview.meta')?.config ??
              {}) as Record<string, unknown>)
          : {}
        const bodyPersona =
          brief.body && typeof brief.body === 'object'
            ? (((brief.body as Record<string, unknown>).definition as Record<string, unknown> | undefined)
                ?.persona as Record<string, unknown> | undefined) ?? {}
            : {}
        const personaMeta = composeMetaPersonaFromDefinition({
          name: typeof bodyPersona.name === 'string' ? bodyPersona.name : '',
          voice: typeof bodyPersona.voice === 'string' ? bodyPersona.voice : '',
          behaviourPrompt:
            typeof bodyPersona.behaviourPrompt === 'string' ? bodyPersona.behaviourPrompt : '',
        })
        next = {
          ...next,
          coverNodeId: item.coverNodeId,
          coverUrl: item.imageUrl ?? null,
          meta: {
            ...next.meta,
            title:
              (typeof brief.title === 'string' && brief.title.trim()) ||
              (typeof bodyMeta.title === 'string' && bodyMeta.title.trim()) ||
              (typeof flowCfg.title === 'string' && flowCfg.title.trim()) ||
              next.meta.title,
            roleTitle:
              (typeof bodyMeta.roleTitle === 'string' && bodyMeta.roleTitle.trim()) ||
              (typeof flowCfg.roleTitle === 'string' && flowCfg.roleTitle.trim()) ||
              (typeof metaRecord.roleTitle === 'string' ? metaRecord.roleTitle : '') ||
              next.meta.roleTitle,
            category:
              normalizeInterviewRoleCategoryValue(
                (typeof bodyMeta.category === 'string' && bodyMeta.category.trim()) ||
                  (typeof metaRecord.category === 'string' && metaRecord.category.trim()) ||
                  next.meta.category,
              ) || next.meta.category,
            ...personaMeta,
            proposedMinutes:
              typeof bodyMeta.proposedMinutes === 'number'
                ? String(bodyMeta.proposedMinutes)
                : typeof flowCfg.proposedMinutes === 'number'
                  ? String(flowCfg.proposedMinutes)
                  : typeof metaRecord.proposedMinutes === 'number'
                    ? String(metaRecord.proposedMinutes)
                    : next.meta.proposedMinutes,
            opensAt:
              (typeof bodyMeta.opensAt === 'string' && bodyMeta.opensAt.trim()
                ? bodyMeta.opensAt.slice(0, 10)
                : '') ||
              (brief.opensAt ? brief.opensAt.slice(0, 10) : '') ||
              next.meta.opensAt,
            closesAt:
              (typeof bodyMeta.closesAt === 'string' && bodyMeta.closesAt.trim()
                ? bodyMeta.closesAt.slice(0, 10)
                : '') ||
              (brief.closesAt ? brief.closesAt.slice(0, 10) : '') ||
              next.meta.closesAt,
            maxInterviews:
              bodyMeta.maxInterviews != null && String(bodyMeta.maxInterviews).trim()
                ? String(bodyMeta.maxInterviews)
                : brief.maxAttempts != null
                  ? String(brief.maxAttempts)
                  : next.meta.maxInterviews,
            description:
              (typeof bodyMeta.roleDescription === 'string' && bodyMeta.roleDescription.trim()) ||
              readSessionMetaString(metaRecord, 'roleDescription') ||
              next.meta.description,
            candidateDescription:
              (typeof bodyMeta.candidateDescription === 'string' &&
                bodyMeta.candidateDescription.trim()) ||
              next.meta.candidateDescription,
            rolePdfName:
              (typeof bodyMeta.rolePdfName === 'string' && bodyMeta.rolePdfName.trim()) ||
              readSessionMetaString(metaRecord, 'rolePdfName') ||
              next.meta.rolePdfName,
            coverName:
              (typeof bodyMeta.coverName === 'string' && bodyMeta.coverName.trim()) ||
              readSessionMetaString(metaRecord, 'coverName') ||
              next.meta.coverName,
          },
        }
        const rolePdfNodeId =
          (typeof bodyMeta.rolePdfNodeId === 'string' && bodyMeta.rolePdfNodeId.trim()) ||
          readSessionMetaString(metaRecord, 'rolePdfNodeId') ||
          ''
        if (rolePdfNodeId) {
          next = { ...next, rolePdfNodeId }
          try {
            const url = await getDownloadUrl(rolePdfNodeId)
            const file = await hydrateRolePdfFile(url, next.meta.rolePdfName || 'role-brief.pdf')
            next = { ...next, rolePdfUrl: url, rolePdfFile: file }
          } catch {
            /* tags still show the filename */
          }
        }
        if (next.coverUrl && !next.coverFile) {
          const cover = await hydrateDriveFile(
            next.coverUrl,
            next.meta.coverName || 'cover.jpg',
            'image/jpeg',
          )
          if (cover) next = { ...next, coverFile: cover }
        }
        applySessionLocal(next)
        upsertListFromSession(next)
        const loadedCreator2 = creator2FromStoredBriefBody(
          (brief.body ?? null) as Record<string, unknown> | null,
        )
        const stamped = applyComposeMetaToCreator2(
          loadedCreator2 ?? emptyCreator2BriefDocument(next.meta),
          next.meta,
          { prefer: 'document' },
        )
        if (!canOpenCreator2Builder(stamped, 'picker')) {
          setListError('Could not open the interview editor.')
          return
        }
        setCreator2Doc(stamped)
        creator2DocRef.current = stamped
        creator2DirtyRef.current = false
        setEditorKey((k) => k + 1)
        setBuilderGlowEpoch(0)
        setSaveComplete(false)
        setPanel('builder')
      } catch (e) {
        setListError(toUserMessage(e))
      } finally {
        setOpeningEditId(null)
      }
    },
    [applySessionLocal, openingEditId, orgAccountId, upsertListFromSession],
  )

  const handleCreateInterview = useCallback(() => {
    openPicker()
  }, [openPicker])

  const startFromDocument = useCallback(
    async (
      title: string,
      doc: Creator2BriefDocument,
      welcome: { kind: 'blank' | 'template'; templateId?: string },
    ) => {
      if (openingBuilder) return
      setOpeningBuilder(true)
      setListError(null)
      try {
        const titled = title.trim() || 'Untitled interview'
        let next = createComposeSession('create')
        next = { ...next, meta: { ...next.meta, title: titled } }
        const stamped: Creator2BriefDocument = {
          ...doc,
          definition: {
            ...doc.definition,
            meta: { ...doc.definition.meta, title: titled },
          },
        }
        const { brief, accountId } = await saveBriefFromSession(next, {
          body: creator2BodyForPersist(stamped),
          creator2: stamped,
        })
        const withServer: InterviewComposeSession = {
          ...next,
          mode: 'edit',
          listItemId: brief.id,
          serverBriefId: brief.id,
          serverAccountId: accountId,
        }
        applySessionLocal(withServer)
        upsertListFromBrief(brief, {
          roleTitle: withServer.meta.roleTitle.trim() || 'Role',
          category: withServer.meta.category.trim() || 'other',
        })
        if (!canOpenCreator2Builder(stamped, 'picker')) {
          setListError('Could not open the interview editor.')
          return
        }
        await seedPickerStartWelcome({
          accountId,
          briefId: brief.id,
          title: titled,
          kind: welcome.kind,
          templateId: welcome.templateId,
        })
        setCreator2Doc(stamped)
        creator2DocRef.current = stamped
        creator2DirtyRef.current = false
        setEditorKey((k) => k + 1)
        setBuilderGlowEpoch(0)
        setSaveComplete(false)
        setBotError(null)
        setPanel('builder')
      } catch (e) {
        setListError(toUserMessage(e))
      } finally {
        setOpeningBuilder(false)
        setStartingId(null)
      }
    },
    [applySessionLocal, openingBuilder, saveBriefFromSession, upsertListFromBrief],
  )

  const handlePickerBlank = useCallback(() => {
    setStartingId('blank')
    void startFromDocument('Untitled interview', buildBlankCreateDocument(), { kind: 'blank' })
  }, [startFromDocument])

  const handlePickerTemplate = useCallback(
    (id: CreateTemplateId) => {
      setStartingId(id)
      const entry = createTemplateEntry(id)
      void startFromDocument(entry.title, buildCreateTemplateDocument(id), {
        kind: 'template',
        templateId: id,
      })
    },
    [startFromDocument],
  )

  const handlePickerCopy = useCallback(
    async (item: InterviewManagerListItem) => {
      if (openingBuilder) return
      setStartingId(item.id)
      setOpeningBuilder(true)
      setListError(null)
      try {
        let accountId = orgAccountId
        if (!accountId) {
          accountId = await resolveOrgAccountId()
          if (!accountId) {
            setListError('Sign in with an organisation account to manage interviews.')
            return
          }
          setOrgAccountId(accountId)
        }
        const copyTitle = `${item.title} (copy)`
        const source = await assessmentApi.briefGet(item.id, true)
        if (!source.body || typeof source.body !== 'object') {
          throw new Error('Missing source interview to copy')
        }
        const created = await assessmentApi.briefCreate(accountId, copyTitle)
        const body = stampCopyTitleOnBriefBody(
          source.body as Record<string, unknown>,
          copyTitle,
        )
        if (!body) throw new Error('Missing source interview to copy')
        const updated = await assessmentApi.briefUpdate(created.id, {
          title: copyTitle,
          body,
          metadata: {
            ...(source.metadata ?? {}),
            roleTitle: item.roleTitle,
            category: item.category,
            estimatedMinutes: item.estimatedMinutes,
          },
        })
        const row = listItemFromBrief(
          { ...updated, title: copyTitle, body: body ?? updated.body },
          {
            roleTitle: item.roleTitle,
            category: item.category,
            estimatedMinutes: item.estimatedMinutes,
            phaseCount: item.phaseCount,
            toolPhaseCount: item.toolPhaseCount,
          },
        )
        setItems((prev) => [row, ...prev.filter((r) => r.id !== row.id)])
        await seedPickerStartWelcome({
          accountId,
          briefId: row.id,
          title: copyTitle,
          kind: 'copy',
          sourceTitle: item.title,
        })
        await openBuilderFromList(row)
      } catch (e) {
        setListError(toUserMessage(e))
      } finally {
        setOpeningBuilder(false)
        setStartingId(null)
      }
    },
    [openBuilderFromList, openingBuilder, orgAccountId],
  )


  const handleEditInterview = useCallback(
    (item: InterviewManagerListItem) => {
      void openBuilderFromList(item)
    },
    [openBuilderFromList],
  )

  const stampCheckShorts = useCallback((briefId: string, shorts: string[]) => {
    setItems((prev) =>
      prev.map((row) => (row.id === briefId ? { ...row, checkWarningShorts: shorts } : row)),
    )
  }, [])

  // Manage-row tags follow the live Check Suite — same scan as the peel tray.
  useEffect(() => {
    const briefId = session?.serverBriefId ?? session?.listItemId
    if (!briefId || !creator2Doc) return
    stampCheckShorts(briefId, liveManagerCheckWarningShorts(creator2Doc))
  }, [creator2Doc, session?.listItemId, session?.serverBriefId, stampCheckShorts])

  const handleTestInterview = useCallback(
    async (item: InterviewManagerListItem) => {
      if (!onTestInterview) return
      if (testingInterviewId || openingEditId) return
      setTestingInterviewId(item.id)
      setListError(null)
      try {
        const source = await assessmentApi.briefGet(item.id, true)
        const warnings = collectCheckSuite(
          (source.body && typeof source.body === 'object'
            ? source.body
            : {}) as Record<string, unknown>,
        )
        stampCheckShorts(item.id, checkSuiteWarningShorts(warnings))
        if (checkSuiteBlocksTake(warnings)) return
        await prefetchInterviewLanding(item.id)
        onTestInterview(item)
      } catch (e) {
        setListError(toUserMessage(e))
      } finally {
        setTestingInterviewId(null)
      }
    },
    [onTestInterview, openingEditId, stampCheckShorts, testingInterviewId],
  )

  const handleCopyInterview = useCallback(
    async (item: InterviewManagerListItem) => {
      try {
        let accountId = orgAccountId
        if (!accountId) {
          accountId = await resolveOrgAccountId()
          if (!accountId) {
            setListError('Sign in with an organisation account to manage interviews.')
            return
          }
          setOrgAccountId(accountId)
        }
        const copyTitle = `${item.title} (copy)`
        const source = await assessmentApi.briefGet(item.id, true)
        const created = await assessmentApi.briefCreate(accountId, copyTitle)
        const body = stampCopyTitleOnBriefBody(
          source.body && typeof source.body === 'object'
            ? (source.body as Record<string, unknown>)
            : null,
          copyTitle,
        )
        const updated = await assessmentApi.briefUpdate(created.id, {
          title: copyTitle,
          body: body ?? undefined,
          metadata: {
            ...(source.metadata ?? {}),
            roleTitle: item.roleTitle,
            category: item.category,
            estimatedMinutes: item.estimatedMinutes,
          },
        })
        const row = listItemFromBrief(
          { ...updated, title: copyTitle, body: body ?? updated.body },
          {
            roleTitle: item.roleTitle,
            category: item.category,
            estimatedMinutes: item.estimatedMinutes,
            phaseCount: item.phaseCount,
            toolPhaseCount: item.toolPhaseCount,
          },
        )
        setItems((prev) => [row, ...prev.filter((r) => r.id !== row.id)])
      } catch (e) {
        setListError(toUserMessage(e))
      }
    },
    [orgAccountId],
  )

  const handleDownloadInterview = useCallback(async (item: InterviewManagerListItem) => {
    if (downloadingId) return
    setDownloadingId(item.id)
    setListError(null)
    try {
      const source = await assessmentApi.briefGet(item.id, true)
      const payload = source.body ?? {
        briefId: source.id,
        title: source.title,
        metadata: source.metadata ?? null,
        note: 'Brief has no body JSON yet.',
      }
      downloadJson(interviewBriefDownloadFilename(item.title, item.id), payload)
    } catch (e) {
      setListError(toUserMessage(e))
    } finally {
      setDownloadingId(null)
    }
  }, [downloadingId])

  const handleTogglePublishInterview = useCallback(async (item: InterviewManagerListItem) => {
    try {
      if (item.status !== 'published') {
        const source = await assessmentApi.briefGet(item.id, true)
        const warnings = collectCheckSuite(
          (source.body && typeof source.body === 'object'
            ? source.body
            : {}) as Record<string, unknown>,
        )
        stampCheckShorts(item.id, checkSuiteWarningShorts(warnings))
        if (checkSuiteBlocksTake(warnings)) return
      }
      const brief =
        item.status === 'published'
          ? await assessmentApi.briefUnpublish(item.id)
          : await assessmentApi.briefPublish(item.id)
      const row = listItemFromBrief(brief, {
        roleTitle: item.roleTitle,
        category: item.category,
        estimatedMinutes: item.estimatedMinutes,
        phaseCount: item.phaseCount,
        toolPhaseCount: item.toolPhaseCount,
        applicantsTaken: item.applicantsTaken,
        applicantsInProgress: item.applicantsInProgress,
        invitesPending: item.invitesPending,
        imageUrl: item.imageUrl,
        checkWarningShorts: item.status === 'published' ? item.checkWarningShorts : [],
      })
      setItems((prev) => prev.map((r) => (r.id === row.id ? row : r)))
    } catch (e) {
      setListError(toUserMessage(e))
    }
  }, [stampCheckShorts])

  const handleArchiveInterview = useCallback(async (item: InterviewManagerListItem) => {
    try {
      const brief = await assessmentApi.briefArchive(item.id)
      const row = listItemFromBrief(brief, {
        roleTitle: item.roleTitle,
        category: item.category,
        estimatedMinutes: item.estimatedMinutes,
        phaseCount: item.phaseCount,
        toolPhaseCount: item.toolPhaseCount,
        applicantsTaken: item.applicantsTaken,
        applicantsInProgress: item.applicantsInProgress,
        invitesPending: item.invitesPending,
        imageUrl: item.imageUrl,
        checkWarningShorts: item.checkWarningShorts,
      })
      setItems((prev) => prev.map((r) => (r.id === row.id ? row : r)))
    } catch (e) {
      setListError(toUserMessage(e))
    }
  }, [])

  const handleUnarchiveInterview = useCallback(async (item: InterviewManagerListItem) => {
    try {
      const brief = await assessmentApi.briefUnarchive(item.id)
      const row = listItemFromBrief(brief, {
        roleTitle: item.roleTitle,
        category: item.category,
        estimatedMinutes: item.estimatedMinutes,
        phaseCount: item.phaseCount,
        toolPhaseCount: item.toolPhaseCount,
        applicantsTaken: item.applicantsTaken,
        applicantsInProgress: item.applicantsInProgress,
        invitesPending: item.invitesPending,
        imageUrl: item.imageUrl,
        checkWarningShorts: item.checkWarningShorts,
      })
      setItems((prev) => prev.map((r) => (r.id === row.id ? row : r)))
    } catch (e) {
      setListError(toUserMessage(e))
    }
  }, [])

  const creator2Brief = useMemo(
    () => (creator2Doc ? mapCreator2BriefToTimeline(creator2Doc) : null),
    [creator2Doc],
  )

  const backToCompose = useCallback(() => {
    if (leavingPanel) return
    void (async () => {
      setLeavingPanel(true)
      // Close chat peel fully before swapping back to manage (avoids dual layout thrash).
      builderPeelTokenRef.current += 1
      try {
        await onBuilderLeave?.()
      } catch {
        /* peel close is best-effort */
      }
      try {
        if (session) {
          const plan = creator2DocRef.current
          const stampedPlan = plan
            ? applyComposeMetaToCreator2(plan, session.meta, { prefer: 'document' })
            : null
          const syncedMeta = stampedPlan
            ? composeMetaFromCreator2(session.meta, stampedPlan)
            : {
                ...session.meta,
                title: draft?.title || session.meta.title,
              }
          const synced: InterviewComposeSession = {
            ...session,
            meta: syncedMeta,
            flow: draft?.flow ?? session.flow,
            flowDirty: Boolean(draft?.flow),
          }
          applySessionLocal(synced)
          upsertListFromSession(synced)
          if (synced.serverBriefId && (synced.flow || stampedPlan)) {
            const body = stampedPlan
              ? creator2BodyForPersist(stampedPlan)
              : undefined
            try {
              const { brief, saveGen } = await saveBriefFromSession(synced, {
                body,
                creator2: stampedPlan,
              })
              if (saveGen === briefSaveGenRef.current) {
                creator2DirtyRef.current = false
                if (stampedPlan) {
                  setCreator2Doc(stampedPlan)
                  creator2DocRef.current = stampedPlan
                }
                upsertListFromBrief(brief, {
                  roleTitle: synced.meta.roleTitle.trim() || 'Role',
                  category: synced.meta.category.trim() || 'other',
                  checkWarningShorts: stampedPlan
                    ? liveManagerCheckWarningShorts(stampedPlan)
                    : undefined,
                })
              }
            } catch (e) {
              setBotError(toUserMessage(e))
              return
            }
          }
        }
        setPanel('manage')
      } finally {
        setLeavingPanel(false)
      }
    })()
  }, [
    applySessionLocal,
    draft,
    leavingPanel,
    onBuilderLeave,
    saveBriefFromSession,
    session,
    upsertListFromBrief,
    upsertListFromSession,
  ])

  const handleBuilderBack = useCallback(() => {
    if (leavingPanel || saving) return
    if (timelineApiRef.current?.isEditStage()) {
      void timelineApiRef.current.exitEditStage()
      return
    }
    backToCompose()
  }, [backToCompose, leavingPanel, saving])

  const backToManage = useCallback(() => {
    if (leavingPanel) return
    setCreator2Doc(null)
    creator2DocRef.current = null
    creator2DirtyRef.current = false
    setBuilderGlowEpoch(0)
    setSaveComplete(false)
    setOpeningBuilder(false)
    setStartingId(null)
    setRestoreFocusId(returnFocusRef.current)
    setPanel('manage')
    void refreshBriefList()
  }, [leavingPanel, refreshBriefList])

  const persistCreator2Brief = useCallback(
    async (opts?: {
      announceUi?: boolean
    }): Promise<{ ok: true } | { ok: false; error: string }> => {
      const sess = sessionRef.current
      const plan = creator2DocRef.current
      if (!composeSessionHasSaveablePlan(sess, plan)) {
        return { ok: false, error: 'No interview plan to save' }
      }
      const announceUi = opts?.announceUi === true
      if (announceUi) {
        setSaving(true)
        setSaveComplete(false)
        setBotError(null)
        if (saveCompleteTimerRef.current) clearTimeout(saveCompleteTimerRef.current)
      }
      const synced: InterviewComposeSession = {
        ...sess,
        flow: sess.flow
          ? applyComposeMetaToFlow(sess.flow, sess.meta, {
              rolePdfNodeId: sess.rolePdfNodeId,
            })
          : sess.flow,
        flowDirty: true,
      }
      const stampedCreator2 = plan
        ? applyComposeMetaToCreator2(plan, synced.meta, { prefer: 'document' })
        : null
      const persistMeta = stampedCreator2
        ? composeMetaFromCreator2(synced.meta, stampedCreator2)
        : synced.meta
      const persistSession: InterviewComposeSession = { ...synced, meta: persistMeta }
      try {
        const {
          brief,
          rolePdfUrl,
          rolePdfFile,
          coverNodeId,
          coverUrl,
          coverFile,
          rolePdfNodeId,
          saveGen,
        } = await saveBriefFromSession(persistSession, {
          body: stampedCreator2 ? creator2BodyForPersist(stampedCreator2) : undefined,
          creator2: stampedCreator2,
        })
        if (saveGen !== briefSaveGenRef.current) return { ok: true }
        if (stampedCreator2) {
          setCreator2Doc(stampedCreator2)
          creator2DocRef.current = stampedCreator2
          creator2DirtyRef.current = false
        }
        const withSave: InterviewComposeSession = {
          ...persistSession,
          mode: 'edit',
          listItemId: brief.id,
          serverBriefId: brief.id,
          rolePdfNodeId: rolePdfNodeId ?? undefined,
          rolePdfDirty: false,
          rolePdfFile,
          rolePdfUrl,
          coverNodeId: coverNodeId ?? undefined,
          coverDirty: false,
          coverFile,
          coverUrl,
          flowDirty: false,
        }
        applySessionLocal(withSave)
        upsertListFromBrief(brief, {
          roleTitle: persistMeta.roleTitle.trim() || 'Role',
          category: synced.meta.category.trim() || 'other',
          imageUrl: coverUrl ?? undefined,
          checkWarningShorts: stampedCreator2
            ? liveManagerCheckWarningShorts(stampedCreator2)
            : undefined,
        })
        if (announceUi) {
          setSaveComplete(true)
          saveCompleteTimerRef.current = setTimeout(() => setSaveComplete(false), 2800)
        }
        return { ok: true }
      } catch (e) {
        const msg = toUserMessage(e)
        if (announceUi) setBotError(msg)
        return { ok: false, error: msg }
      } finally {
        if (announceUi) setSaving(false)
      }
    },
    [applySessionLocal, saveBriefFromSession, upsertListFromBrief],
  )

  const enqueueBriefPersist = useCallback(
    <T,>(fn: () => Promise<T>): Promise<T> => {
      const run = briefPersistChainRef.current.then(fn, fn)
      briefPersistChainRef.current = run.then(
        () => undefined,
        () => undefined,
      )
      return run
    },
    [],
  )

  const handleSaveInterview = useCallback(async () => {
    if (!sessionRef.current || saving) return
    await enqueueBriefPersist(() => persistCreator2Brief({ announceUi: true }))
  }, [enqueueBriefPersist, persistCreator2Brief, saving])

  /** Silent Drive flush so Edge Intake sees unsaved board edits (no Save chrome). */
  const flushCreator2ForBotTurn = useCallback(async (): Promise<{
    ok: boolean
    error?: string
  }> => {
    return enqueueBriefPersist(async () => {
      const sess = sessionRef.current
      if (
        !creator2DirtyRef.current &&
        !sess?.rolePdfDirty &&
        !sess?.coverDirty
      ) {
        return { ok: true }
      }
      return persistCreator2Brief({ announceUi: false })
    })
  }, [enqueueBriefPersist, persistCreator2Brief])

  const invokeCreator2Action = useCallback(
    async (request: EditorActionRequest): Promise<EditorActionResult> => {
      const actionId = request.actionId
      const targetId = typeof request.targetId === 'string' ? request.targetId.trim() : ''
      const timeline = timelineApiRef.current

      if (actionId === 'creator2.action.save') {
        await handleSaveInterview()
        return { ok: true, actionId }
      }
      if (actionId === 'creator2.action.flush-before-bot-turn') {
        const result = await flushCreator2ForBotTurn()
        if (!result.ok) {
          return { ok: false, actionId, error: result.error ?? 'Could not sync board' }
        }
        return { ok: true, actionId }
      }
      if (actionId === 'creator2.action.exit-edit') {
        if (timeline?.isEditStage()) await timeline.exitEditStage()
        return { ok: true, actionId }
      }
      if (actionId === 'creator2.action.scroll-to-section') {
        if (!targetId) return { ok: false, actionId, error: 'Missing section id' }
        timeline?.scrollToSection(targetId)
        // If the day list is not mounted (or the id is mid-layout), still open edit.
        timeline?.openSection(targetId)
        const payload = request.payload as { historyFocus?: string } | undefined
        const historyFocus =
          typeof payload?.historyFocus === 'string' ? payload.historyFocus.trim() : ''
        if (historyFocus) {
          window.setTimeout(() => {
            const root =
              (document.querySelector(
                `[data-section-id="${CSS.escape(targetId)}"]`,
              ) as HTMLElement | null) ??
              document.getElementById(targetId)
            scrollSectionHistoryFocus(root, historyFocus)
          }, 80)
        }
        return { ok: true, actionId }
      }
      if (actionId === 'creator2.action.open-section') {
        if (!targetId) return { ok: false, actionId, error: 'Missing section id' }
        timeline?.openSection(targetId)
        return { ok: true, actionId }
      }
      if (actionId === 'creator2.action.focus-section') {
        if (!targetId) return { ok: false, actionId, error: 'Missing section id' }
        timeline?.focusSection(targetId)
        return { ok: true, actionId }
      }
      if (actionId === 'creator2.action.submit-clarifications') {
        // Answers live on the peel chat message + payload; bot turn consumes them next.
        return { ok: true, actionId }
      }
      if (actionId === 'creator2.action.apply-edited-body') {
        const payload = request.payload as { body?: Record<string, unknown> } | undefined
        const body = payload?.body
        if (!body || typeof body !== 'object') {
          return { ok: false, actionId, error: 'Missing edited body' }
        }
        const loaded = creator2FromStoredBriefBody(body)
        if (!loaded) {
          return { ok: false, actionId, error: 'Could not parse edited body' }
        }
        const rehydrated = rehydrateLockedToolAnalysisOnDoc(
          loaded as unknown as Record<string, unknown>,
        )
        if (rehydrated.tools && typeof rehydrated.tools === 'object') {
          loaded.tools = rehydrated.tools as typeof loaded.tools
        }
        // Edge partials sometimes omit definition.persona — keep prior persona/meta so
        // the timeline mapper never crashes on `.persona.name`.
        const prev = creator2DocRef.current
        if (prev?.definition) {
          const def = loaded.definition ?? ({} as typeof prev.definition)
          if (!def.persona && prev.definition.persona) {
            def.persona = structuredClone(prev.definition.persona)
          }
          if (!def.meta && prev.definition.meta) {
            def.meta = structuredClone(prev.definition.meta)
          } else if (def.meta && prev.definition.meta) {
            def.meta = preserveLiveOverviewMeta(
              prev.definition.meta as unknown as Record<string, unknown>,
              def.meta as unknown as Record<string, unknown>,
            ) as typeof def.meta
          }
          if (!def.persona) {
            def.persona = {
              name: 'Alex',
              voice: '',
              behaviourPrompt: 'Be a fair, curious interviewer. Stay on the section goals.',
            }
          }
          loaded.definition = def
        }
        setCreator2Doc(loaded)
        creator2DocRef.current = loaded
        creator2DirtyRef.current = false
        // Soft apply: keep the timeline mounted so edit-stage / Monaco / TestForm
        // stay put. Nested editors adopt the new payload in place.
        setSession((s) =>
          s
            ? {
                ...s,
                meta: composeMetaFromCreator2(s.meta, loaded),
              }
            : s,
        )
        return { ok: true, actionId }
      }
      return { ok: false, actionId, error: `Unsupported Creator-2 action: ${actionId}` }
    },
    [flushCreator2ForBotTurn, handleSaveInterview],
  )

  const onCreator2RuntimeRef = useRef(onCreator2Runtime)
  onCreator2RuntimeRef.current = onCreator2Runtime
  const creator2PublishedRuntimeRef = useRef<EditorRuntimeHandle | null>(null)

  useEffect(() => {
    if (panel !== 'builder') {
      creator2PublishedRuntimeRef.current = null
      onCreator2RuntimeRef.current?.(null)
      return
    }
    const runtime = {
      getContext: () => {
        const sess = sessionRef.current
        const doc = creator2DocRef.current
        return {
          briefId: sess?.serverBriefId ?? sess?.listItemId ?? null,
          accountId: sess?.serverAccountId ?? orgAccountId ?? null,
          panel: 'builder' as const,
          body: doc ? creator2BodyForPersist(doc) : null,
          rolePdfFile: sess?.rolePdfFile ?? null,
          peelTags: creatorOverviewPeelTags({
            roleDescription:
              doc?.definition.meta.roleDescription ?? sess?.meta.description ?? '',
            rolePdfName: sess?.meta.rolePdfName || doc?.definition.meta.rolePdfName || '',
          }),
          checkWarnings: doc
            ? collectCheckSuite(doc as unknown as Record<string, unknown>)
            : [],
        }
      },
      loadContext: () => undefined,
      invokeAction: invokeCreator2Action,
    } as unknown as EditorRuntimeHandle
    creator2PublishedRuntimeRef.current = runtime
    onCreator2RuntimeRef.current?.(runtime)
    return () => {
      creator2PublishedRuntimeRef.current = null
      onCreator2RuntimeRef.current?.(null)
    }
  }, [
    invokeCreator2Action,
    orgAccountId,
    panel,
    session?.listItemId,
    session?.serverAccountId,
    session?.serverBriefId,
  ])

  // Live Check Suite: re-mirror getContext() whenever the brief changes.
  // Do not null the runtime here — that blanks the peel sheet between patches.
  useLayoutEffect(() => {
    if (panel !== 'builder') return
    const runtime = creator2PublishedRuntimeRef.current
    if (!runtime) return
    void creator2Doc
    onCreator2RuntimeRef.current?.(runtime)
  }, [
    creator2Doc,
    panel,
    session?.meta.rolePdfName,
    session?.meta.description,
    session?.rolePdfFile,
    session?.coverFile,
    session?.listItemId,
    session?.serverAccountId,
    session?.serverBriefId,
  ])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (panelSwapBusyRef.current) return
      if (panel === 'builder') {
        event.preventDefault()
        handleBuilderBack()
      } else if (panel === 'picker') {
        event.preventDefault()
        backToManage()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [backToManage, handleBuilderBack, panel])

  return (
    <div
      ref={rootRef}
      className={['theme-interview-creator', className].filter(Boolean).join(' ')}
      data-panel={visiblePanel}
    >
      <div ref={panelStageRef} className="theme-interview-creator__panel-stage">
        {visiblePanel === 'manage' ? (
          <ManageHome
            items={items}
            listBusy={listBusy}
            listError={listError}
            onRetryList={() => {
              void refreshBriefList()
            }}
            onCopyInterview={(item) => {
              void handleCopyInterview(item)
            }}
            onTogglePublish={(item) => {
              void handleTogglePublishInterview(item)
            }}
            onArchiveInterview={(item) => {
              void handleArchiveInterview(item)
            }}
            onUnarchiveInterview={(item) => {
              void handleUnarchiveInterview(item)
            }}
            onCreateInterview={handleCreateInterview}
            onEditInterview={handleEditInterview}
            onTestInterview={
              onTestInterview
                ? (item) => {
                    void handleTestInterview(item)
                  }
                : undefined
            }
            onDownloadInterview={(item) => {
              void handleDownloadInterview(item)
            }}
            restoreFocusId={restoreFocusId}
            openingEditId={openingEditId}
            testingInterviewId={testingInterviewId}
            downloadingId={downloadingId}
          />
        ) : visiblePanel === 'picker' ? (
          <InterviewCreatorPickerHome
            items={items}
            starting={openingBuilder}
            startingId={startingId}
            listError={listError}
            onBack={backToManage}
            onBlank={handlePickerBlank}
            onTemplate={handlePickerTemplate}
            onCopyExisting={(item) => {
              void handlePickerCopy(item)
            }}
          />
        ) : visiblePanel === 'builder' && creator2Brief && creator2Doc && session ? (
          <div className="theme-interview-creator__builder">
            <header className="theme-interview-creator__builder-header" data-dash-anim>
              <div className="theme-interview-creator__builder-header-lead">
                <VurifyMenuButton
                  type="button"
                  variant="label"
                  size="md"
                  housing
                  activeChrome={false}
                  icon={ArrowLeft}
                  iconPosition="left"
                  lineTone="muted"
                  onClick={handleBuilderBack}
                  disabled={saving || leavingPanel}
                  loading={leavingPanel}
                >
                  Back
                </VurifyMenuButton>
              </div>
              <p
                className={[
                  'type-caption mb-0 theme-interview-creator__builder-header-status',
                  saveComplete ? 'type-success is-visible' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-live="polite"
              >
                {saveComplete ? 'Save complete' : '\u00a0'}
              </p>
              <div className="theme-interview-creator__builder-header-actions">
                <VurifyMenuButton
                  type="button"
                  variant="label"
                  size="md"
                  housing
                  activeChrome={false}
                  icon={Save}
                  iconPosition="left"
                  lineTone="accent"
                  loading={saving}
                  disabled={saving || !composeSessionHasSaveablePlan(session, creator2Doc)}
                  onClick={() => {
                    void handleSaveInterview()
                  }}
                >
                  Save
                </VurifyMenuButton>
              </div>
            </header>
            {botError ? (
              <p
                className="type-caption type-error mb-0 theme-interview-creator__builder-header-error"
                role="alert"
                data-dash-anim
              >
                {botError}
              </p>
            ) : null}

            <div className="theme-interview-creator__creator2" data-dash-anim>
              <InterviewFlowTimeline
                ref={timelineApiRef}
                key={editorKey}
                brief={creator2Brief}
                scroll={INTERVIEW_FLOW_TIMELINE_SCROLL}
                scrollerRef={scrollRootRef}
                layoutEpoch={builderGlowEpoch}
                onFormChange={(phaseId, next) =>
                  setCreator2Doc((prev) => {
                    if (!prev) return prev
                    const patched = patchCreator2FormStep(prev, phaseId, next)
                    creator2DocRef.current = patched
                    creator2DirtyRef.current = true
                    return patched
                  })
                }
                onTalkChange={(phaseId, next) =>
                  setCreator2Doc((prev) => {
                    if (!prev) return prev
                    const patched = patchCreator2TalkStep(prev, phaseId, next)
                    creator2DocRef.current = patched
                    creator2DirtyRef.current = true
                    return patched
                  })
                }
                onCodingChange={(phaseId, next) =>
                  setCreator2Doc((prev) => {
                    if (!prev) return prev
                    const patched = patchCreator2CodingStep(prev, phaseId, next)
                    creator2DocRef.current = patched
                    creator2DirtyRef.current = true
                    return patched
                  })
                }
                onDocChange={(phaseId, next) =>
                  setCreator2Doc((prev) => {
                    if (!prev) return prev
                    const patched = patchCreator2DocStep(prev, phaseId, next)
                    creator2DocRef.current = patched
                    creator2DirtyRef.current = true
                    return patched
                  })
                }
                onWrapChange={(next) =>
                  setCreator2Doc((prev) => {
                    if (!prev) return prev
                    const patched = patchCreator2Rollup(prev, next)
                    creator2DocRef.current = patched
                    creator2DirtyRef.current = true
                    return patched
                  })
                }
                onAnalysisChange={(next) =>
                  setCreator2Doc((prev) => {
                    if (!prev) return prev
                    const patched = patchCreator2AnalysisShelf(prev, next).doc
                    creator2DocRef.current = patched
                    creator2DirtyRef.current = true
                    return patched
                  })
                }
                onDeleteTemplate={(templateId) => {
                  setCreator2Doc((prev) => {
                    if (!prev) return prev
                    const shelf = mapCreator2BriefToTimeline(prev).analysisShelf
                    if (!shelf) return prev
                    const patched = deleteCreator2Template(prev, templateId, {
                      libraryIds: shelf.libraryIds,
                      templateMeta: shelf.templateMeta,
                    }).doc
                    creator2DocRef.current = patched
                    creator2DirtyRef.current = true
                    return patched
                  })
                }}
                onSpineChange={(op) =>
                  setCreator2Doc((prev) => {
                    if (!prev) return prev
                    const patched = patchCreator2Spine(prev, op)
                    creator2DocRef.current = patched
                    creator2DirtyRef.current = true
                    return patched
                  })
                }
                onBriefMetaChange={(patch) =>
                  setCreator2Doc((prev) => {
                    if (!prev) return prev
                    const next = applyOverviewPatchToCreator2(prev, patch)
                    creator2DocRef.current = next
                    creator2DirtyRef.current = true
                    setSession((s) => (s ? applyOverviewPatchToSession(s, patch) : s))
                    return next
                  })
                }
                coverFile={session.coverFile}
                rolePdfFile={session.rolePdfFile}
                onCoverFileChange={(file) => {
                  setSession((s) => {
                    if (!s) return s
                    revokeBlobUrl(s.coverUrl)
                    return {
                      ...s,
                      coverFile: file,
                      coverDirty: true,
                      coverUrl: file ? URL.createObjectURL(file) : null,
                      meta: { ...s.meta, coverName: file?.name ?? '' },
                    }
                  })
                  setCreator2Doc((prev) => {
                    if (!prev) return prev
                    const next: Creator2BriefDocument = {
                      ...prev,
                      definition: {
                        ...prev.definition,
                        meta: {
                          ...prev.definition.meta,
                          coverName: file?.name ?? '',
                        },
                      },
                    }
                    creator2DocRef.current = next
                    creator2DirtyRef.current = true
                    return next
                  })
                }}
                onRolePdfFileChange={(file) => {
                  setSession((s) => {
                    if (!s) return s
                    return {
                      ...s,
                      rolePdfFile: file,
                      rolePdfDirty: true,
                      rolePdfUrl: null,
                      meta: { ...s.meta, rolePdfName: file?.name ?? '' },
                    }
                  })
                  setCreator2Doc((prev) => {
                    if (!prev) return prev
                    const next: Creator2BriefDocument = {
                      ...prev,
                      definition: {
                        ...prev.definition,
                        meta: {
                          ...prev.definition.meta,
                          rolePdfName: file?.name ?? '',
                        },
                      },
                    }
                    creator2DocRef.current = next
                    creator2DirtyRef.current = true
                    return next
                  })
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
