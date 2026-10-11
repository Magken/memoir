import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from '../../../components/Modal'
import {
  getSittingPolicy,
  sittingPolicyAckStay,
  sittingPolicyAckTabReturn,
  sittingPolicyRetryCovers,
  sittingPolicyReturnFullscreen,
  subscribeSittingPolicy,
} from './session'
import { SITTING_POLICY_OVERLAY_ATTR, type SittingPolicySnapshot } from './types'

const COPY: Record<
  Exclude<SittingPolicySnapshot['overlayKind'], 'none'>,
  { title: string; body: string; confirm: string }
> = {
  fullscreen: {
    title: 'Stay in full screen',
    body: 'This interview has to stay in full screen. Return to full screen to keep working.',
    confirm: 'Return to full screen',
  },
  tab_return: {
    title: 'You left this tab',
    body: 'The interview is still here. Stay on this tab until you finish.',
    confirm: 'I\u2019m back',
  },
  cover: {
    title: 'Extra display uncovered',
    body: 'A cover window on another display closed or left full screen. Put the covers back to continue.',
    confirm: 'Cover extra displays',
  },
  popup: {
    title: 'Allow pop-ups for extra displays',
    body: 'This browser blocked cover windows. Allow pop-ups for this site, then cover extra displays.',
    confirm: 'Cover extra displays',
  },
  duplicate: {
    title: 'This interview is already open',
    body: 'Another tab is taking this attempt. Close this extra tab and continue in the original one.',
    confirm: 'Close this tab',
  },
  framed: {
    title: 'This interview cannot run here',
    body: 'Open the interview in its own browser tab — not inside another page.',
    confirm: 'Close this tab',
  },
  stay: {
    title: 'Stay on the interview',
    body: 'This interview paused. Return to continue.',
    confirm: 'Continue',
  },
}

const TIMER_NOTE = ' The stage timer keeps running.'

function policyBody(
  base: string,
  kind: SittingPolicySnapshot['overlayKind'],
  timed?: boolean,
): string {
  if (!timed) return base
  if (kind === 'stay' || kind === 'fullscreen' || kind === 'cover' || kind === 'popup') {
    return `${base}${TIMER_NOTE}`
  }
  return base
}

type SittingPolicyOverlayProps = {
  /** Timed stage — note that the hard timer keeps running while paused. */
  timed?: boolean
}

export function SittingPolicyOverlay({ timed = false }: SittingPolicyOverlayProps = {}) {
  const [snap, setSnap] = useState<SittingPolicySnapshot>(() => getSittingPolicy())

  useEffect(() => subscribeSittingPolicy(setSnap), [])

  const kind = snap.overlayKind
  if (kind === 'none') return null
  const copy = COPY[kind]

  const onConfirm = () => {
    if (kind === 'stay') sittingPolicyAckStay()
    else if (kind === 'fullscreen') void sittingPolicyReturnFullscreen()
    else if (kind === 'cover' || kind === 'popup') void sittingPolicyRetryCovers()
    else if (kind === 'tab_return') sittingPolicyAckTabReturn()
    else window.close()
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div key={snap.overlayGeneration} {...{ [SITTING_POLICY_OVERLAY_ATTR]: kind }}>
      <Modal
        open
        title={copy.title}
        onClose={() => undefined}
        onConfirm={onConfirm}
        confirmLabel={copy.confirm}
        showCancel={false}
        showHeaderClose={false}
        closeOnEscape={false}
        size="md"
        placement="viewport"
        cardVariant="vurify-outlined"
        footerStyle="vurify"
        scrollRail="hidden"
        closeOnBackdrop={false}
        className="page-scene--interview__leave-dialog page-scene--interview__policy-dialog"
      >
        <div className="page-scene--interview__leave-body">
          <p className="type-body-sm mb-0">{policyBody(copy.body, kind, timed)}</p>
        </div>
      </Modal>
    </div>,
    document.body,
  )
}
