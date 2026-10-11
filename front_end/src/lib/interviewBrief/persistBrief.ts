import type { InterviewBrief } from '../assessmentApi'
import * as assessmentApi from '../assessmentApi'
import { deleteFile, uploadBrowserFile } from '../fileApi'
import { getAccount, getMyProfile } from '../userApi'
import { humanAccountLabel } from './interviewLandingView'
import type { FlowDocument } from '../flowEditor/types'
import {
  applyComposeMetaToFlow,
  isPlaceholderInterviewTitle,
  isPlaceholderRoleTitle,
  parseComposeDateToIso,
  type InterviewComposeMeta,
} from './compose'
import type { Creator2BriefDocument } from './creator2BriefTypes'
import { estimateInterviewMinutes } from './duration'
import { flowToBriefBody } from './mapBrief'
import { INTERVIEW_KIND } from './types'
import {
  checkSuiteWarningShorts,
  collectCheckSuite,
} from '../../../../back_end/supabase/functions/interview-brief-edit/checkSuite.ts'

/** Canonical Drive / brief document body (`kind: interview_brief`). */
export function interviewBriefBodyRecord(flow: FlowDocument): Record<string, unknown> {
  return flowToBriefBody(flow) as unknown as Record<string, unknown>
}

export function composeBriefMetadata(
  meta: InterviewComposeMeta,
  flow: FlowDocument | null,
  opts: {
    rolePdfNodeId?: string | null
    coverNodeId?: string | null
    creator2?: Creator2BriefDocument | null
    accountName?: string | null
    accountUsername?: string | null
    createdByName?: string | null
  } = {},
): Record<string, unknown> {
  const creator2 = opts.creator2
  const phasesFromCreator2 = creator2?.phases?.length
    ? creator2.phases
    : null
  const phases = phasesFromCreator2
    ? phasesFromCreator2
    : flow
      ? flow.nodes.filter(
          (n) => n.kind === INTERVIEW_KIND.discussion || n.kind === INTERVIEW_KIND.tool,
        )
      : []
  const proposedRaw = Number.parseInt(meta.proposedMinutes, 10)
  const proposedMinutes =
    Number.isFinite(proposedRaw) && proposedRaw > 0 ? proposedRaw : undefined
  const rolePdfNodeId =
    typeof opts.rolePdfNodeId === 'string' && opts.rolePdfNodeId.trim()
      ? opts.rolePdfNodeId.trim()
      : undefined
  const coverNodeId =
    typeof opts.coverNodeId === 'string' && opts.coverNodeId.trim()
      ? opts.coverNodeId.trim()
      : undefined
  const accountName =
    typeof opts.accountName === 'string' && opts.accountName.trim()
      ? opts.accountName.trim()
      : undefined
  const accountUsername =
    typeof opts.accountUsername === 'string' && opts.accountUsername.trim()
      ? opts.accountUsername.trim()
      : undefined
  const createdByName =
    typeof opts.createdByName === 'string' && opts.createdByName.trim()
      ? opts.createdByName.trim()
      : undefined
  const estimatedMinutes = creator2
    ? creator2.timingSummary?.estimatedMinutes ??
      creator2.definition.meta.estimatedMinutes ??
      phasesFromCreator2?.reduce((s, p) => s + (p.estimatedMinutes ?? 0), 0) ??
      0
    : flow
      ? estimateInterviewMinutes(flow)
      : 0
  const docRole = String(creator2?.definition.meta.roleTitle ?? '').trim()
  const docRoleDescription = String(creator2?.definition.meta.roleDescription ?? '').trim()
  const docProposed = creator2?.definition.meta.proposedMinutes
  const checkWarningShorts = creator2
    ? checkSuiteWarningShorts(collectCheckSuite(creator2 as unknown as Record<string, unknown>))
    : []
  return {
    roleTitle: !isPlaceholderRoleTitle(docRole) ? docRole : meta.roleTitle.trim(),
    category: meta.category.trim(),
    estimatedMinutes,
    proposedMinutes:
      docProposed != null && Number(docProposed) > 0 ? docProposed : proposedMinutes,
    phaseCount: phases.length,
    toolPhaseCount: phasesFromCreator2
      ? phasesFromCreator2.filter((p) => p.kind === 'tool').length
      : flow
        ? flow.nodes.filter((n) => n.kind === INTERVIEW_KIND.tool).length
        : 0,
    roleDescription: docRoleDescription || meta.description.trim() || undefined,
    rolePdfNodeId,
    rolePdfName: meta.rolePdfName.trim() || undefined,
    coverNodeId,
    coverName: meta.coverName.trim() || undefined,
    accountName,
    accountUsername,
    createdByName,
    checkWarningShorts,
  }
}

export type UpsertInterviewBriefResult = {
  brief: InterviewBrief
  rolePdfNodeId: string | null
  coverNodeId: string | null
}

async function softDeleteDriveNode(nodeId: string | null): Promise<void> {
  if (!nodeId) return
  try {
    await deleteFile(nodeId)
  } catch {
    /* already gone or no write — replace upload may still succeed with a unique name */
  }
}

/** Drive sibling names must be unique; keep the user-facing name on brief meta. */
function rolePdfDriveFile(briefId: string, file: File): File {
  const safe = file.name.replace(/[^\w.\-+() ]+/g, '_').trim() || 'role-brief.pdf'
  const unique = `interview-role-${briefId.slice(0, 8)}-${Date.now()}-${safe}`
  return new File([file], unique, {
    type: file.type || 'application/pdf',
    lastModified: file.lastModified,
  })
}

function coverDriveFile(briefId: string, file: File): File {
  const safe = file.name.replace(/[^\w.\-+() ]+/g, '_').trim() || 'cover.jpg'
  const unique = `interview-cover-${briefId.slice(0, 8)}-${Date.now()}-${safe}`
  return new File([file], unique, {
    type: file.type || 'image/jpeg',
    lastModified: file.lastModified,
  })
}

/**
 * Create or update an `interview_briefs` row + Drive body as amendable
 * `interview_brief` JSON. Optional role PDF / cover image upload to org Drive
 * and link on brief metadata (cover + account/creator labels). Replacing or clearing soft-deletes the previous
 * Drive node first so same-name re-uploads do not hit `name_exists`.
 */
export async function upsertInterviewBriefDocument(opts: {
  accountId: string
  briefId?: string | null
  title: string
  /** Optional Flow chrome; required only when `body` is omitted. */
  flow?: FlowDocument | null
  meta: InterviewComposeMeta
  /** When set, write this Drive body instead of `flowToBriefBody(flow)` (Creator 2 plan JSON). */
  body?: Record<string, unknown> | null
  /** Optional Creator-2 doc for list metadata (phase counts) when flow is blank. */
  creator2?: Creator2BriefDocument | null
  rolePdfFile?: File | null
  rolePdfNodeId?: string | null
  coverFile?: File | null
  coverNodeId?: string | null
}): Promise<UpsertInterviewBriefResult> {
  const docTitle = String(opts.creator2?.definition.meta.title ?? '').trim()
  const title = !isPlaceholderInterviewTitle(docTitle)
    ? docTitle
    : opts.title.trim() || 'Untitled interview'
  if (!opts.body && !opts.flow) {
    throw new Error('No interview body to save')
  }

  let briefId = opts.briefId ?? null
  if (!briefId) {
    const created = await assessmentApi.briefCreate(opts.accountId, title)
    briefId = created.id
  }

  let rolePdfNodeId =
    typeof opts.rolePdfNodeId === 'string' && opts.rolePdfNodeId.trim()
      ? opts.rolePdfNodeId.trim()
      : null

  if (opts.rolePdfFile) {
    const previousId = rolePdfNodeId
    await softDeleteDriveNode(previousId)
    const node = await uploadBrowserFile(
      opts.accountId,
      rolePdfDriveFile(briefId, opts.rolePdfFile),
      null,
    )
    rolePdfNodeId = String(node.id)
  } else if (!opts.meta.rolePdfName.trim()) {
    await softDeleteDriveNode(rolePdfNodeId)
    rolePdfNodeId = null
  }

  let coverNodeId =
    typeof opts.coverNodeId === 'string' && opts.coverNodeId.trim()
      ? opts.coverNodeId.trim()
      : null

  if (opts.coverFile) {
    const previousId = coverNodeId
    await softDeleteDriveNode(previousId)
    const node = await uploadBrowserFile(
      opts.accountId,
      coverDriveFile(briefId, opts.coverFile),
      null,
    )
    coverNodeId = String(node.id)
  } else if (!opts.meta.coverName.trim()) {
    await softDeleteDriveNode(coverNodeId)
    coverNodeId = null
  }

  const stampedFlow = opts.flow
    ? applyComposeMetaToFlow(opts.flow, opts.meta, { rolePdfNodeId })
    : null
  const body = opts.body ?? interviewBriefBodyRecord(stampedFlow!)
  let accountName: string | null = null
  let accountUsername: string | null = null
  let createdByName: string | null = null
  try {
    const acct = await getAccount(opts.accountId)
    const name =
      acct && typeof acct === 'object' && typeof (acct as { name?: unknown }).name === 'string'
        ? humanAccountLabel(String((acct as { name: string }).name))
        : ''
    if (name) accountName = name
  } catch {
    /* Test/landing can still live-fetch account */
  }
  try {
    const profile = await getMyProfile()
    const rec = profile && typeof profile === 'object' ? profile : null
    const username = rec && typeof rec.username === 'string' ? rec.username.trim() : ''
    if (username && !username.includes('@')) accountUsername = username
    const display = humanAccountLabel(
      rec && typeof rec.display_name === 'string'
        ? rec.display_name
        : rec && typeof rec.displayName === 'string'
          ? rec.displayName
          : '',
    )
    if (display) createdByName = display
  } catch {
    /* optional stamp */
  }
  const metadata = composeBriefMetadata(opts.meta, stampedFlow, {
    rolePdfNodeId,
    coverNodeId,
    creator2: opts.creator2 ?? null,
    accountName,
    accountUsername,
    createdByName,
  })

  const updated = await assessmentApi.briefUpdate(briefId, {
    title,
    metadata,
    body,
  })

  const opensAt = parseComposeDateToIso(opts.meta.opensAt, false) ?? null
  const closesAt = parseComposeDateToIso(opts.meta.closesAt, true) ?? null
  const maxRaw = Number.parseInt(opts.meta.maxInterviews, 10)
  const maxAttempts = Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : null

  try {
    const withWindow = await assessmentApi.briefSetWindow(briefId, {
      opensAt,
      closesAt,
      maxAttempts,
    })
    return { brief: withWindow, rolePdfNodeId, coverNodeId }
  } catch {
    return { brief: updated, rolePdfNodeId, coverNodeId }
  }
}
