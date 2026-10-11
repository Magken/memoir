/**
 * Talk compose pass-0 / pass-1 loop — testable without Edge.
 * Pass 1 is a legal expand only when pass 0 returned needRetrieval and no utterance.
 * A spoken reply plus needRetrieval must not re-run compose (that overwrites the bubble).
 */
import { coerceNeedRetrievalNeeds } from './dayMemory/broaderContext'
import type { MemoryRetrievalNeed, RetrievedMemoryPack } from './dayMemory/types'
import type { TalkComposeResult } from './talkEdgeClient'

export type TalkComposePassTrace = {
  pass: 0 | 1
  retrievalPass: 0 | 1
  needRetrieval: boolean
  needIds: string[]
  utterance: string
  utteranceChars: number
  deltas: string[]
}

export type TalkComposeFn = (input: {
  retrievalPass: 0 | 1
  retrieved: RetrievedMemoryPack
  onUtteranceDelta?: (delta: string, full: string) => void
}) => Promise<TalkComposeResult>

export function shouldExpandComposePass1(input: {
  pendingFirstProbe?: boolean
  moreNeeds: ReadonlyArray<unknown>
  utterance: string
  skipPass1WhenUtterance?: boolean
}): boolean {
  if (input.pendingFirstProbe) return false
  if (!input.moreNeeds.length) return false
  const skip = input.skipPass1WhenUtterance !== false
  if (skip && input.utterance.trim()) return false
  return true
}

export async function runTalkComposePasses(input: {
  compose: TalkComposeFn
  retrieved: RetrievedMemoryPack
  pendingFirstProbe?: boolean
  /** Prefer the spoken reply. Default true — never both utterance and needRetrieval. */
  skipPass1WhenUtterance?: boolean
  bindMoreNeeds?: (needRetrieval: TalkComposeResult['needRetrieval']) => MemoryRetrievalNeed[]
  expandRetrieved?: (
    moreNeeds: MemoryRetrievalNeed[],
    retrieved: RetrievedMemoryPack,
  ) => RetrievedMemoryPack | Promise<RetrievedMemoryPack>
  onUtteranceDelta?: (delta: string, full: string) => void
  onPass?: (
    pass: 0 | 1,
    detail: { needRetrieval: boolean; utteranceChars: number },
  ) => void
}): Promise<{
  composed: TalkComposeResult
  retrieved: RetrievedMemoryPack
  trace: TalkComposePassTrace[]
}> {
  const skipPass1WhenUtterance = input.skipPass1WhenUtterance !== false
  const bindMoreNeeds =
    input.bindMoreNeeds ??
    ((needRetrieval) => coerceNeedRetrievalNeeds(needRetrieval, false))
  const trace: TalkComposePassTrace[] = []
  let retrieved = input.retrieved

  const runPass = async (retrievalPass: 0 | 1) => {
    const deltas: string[] = []
    const composed = await input.compose({
      retrievalPass,
      retrieved,
      onUtteranceDelta: (delta, full) => {
        deltas.push(full)
        input.onUtteranceDelta?.(delta, full)
      },
    })
    const needs = composed.needRetrieval?.needs ?? []
    const row: TalkComposePassTrace = {
      pass: retrievalPass,
      retrievalPass,
      needRetrieval: needs.length > 0,
      needIds: needs.map((n) => n.sourceId),
      utterance: composed.utterance || '',
      utteranceChars: (composed.utterance || '').length,
      deltas,
    }
    trace.push(row)
    input.onPass?.(retrievalPass, {
      needRetrieval: row.needRetrieval,
      utteranceChars: row.utteranceChars,
    })
    return composed
  }

  let composed = await runPass(0)
  const moreNeeds = bindMoreNeeds(composed.needRetrieval)
  if (
    shouldExpandComposePass1({
      pendingFirstProbe: input.pendingFirstProbe,
      moreNeeds,
      utterance: composed.utterance || '',
      skipPass1WhenUtterance,
    })
  ) {
    if (input.expandRetrieved) {
      retrieved = await input.expandRetrieved(moreNeeds, retrieved)
    }
    composed = await runPass(1)
  }

  return { composed, retrieved, trace }
}
