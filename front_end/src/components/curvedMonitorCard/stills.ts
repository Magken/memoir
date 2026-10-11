import { HOME_ASSETS } from '../../lib/homeAssets/catalog'
import { pickOfferFrame, decodeImageSrcs } from '../../lib/shape3d/curvedMonitor'

export const CURVED_MONITOR_OFFER_STILLS = {
  cvIntake: pickOfferFrame(
    HOME_ASSETS.offerCvIntakeVideo.frames,
    HOME_ASSETS.offerCvIntakeVideo.alt,
  ),
  liveInterview: pickOfferFrame(
    HOME_ASSETS.offerLiveInterviewVideo.frames,
    HOME_ASSETS.offerLiveInterviewVideo.alt,
  ),
  hiringPackage: pickOfferFrame(
    HOME_ASSETS.offerHiringPackageVideo.frames,
    HOME_ASSETS.offerHiringPackageVideo.alt,
  ),
} as const

export function curvedMonitorStillSrcs(): readonly string[] {
  return [
    CURVED_MONITOR_OFFER_STILLS.cvIntake.src,
    CURVED_MONITOR_OFFER_STILLS.liveInterview.src,
    CURVED_MONITOR_OFFER_STILLS.hiringPackage.src,
  ]
}

/** Browser-decode the three extras stills. No-op when `Image` is missing (unit / SSR). */
export function decodeCurvedMonitorStills(): Promise<void> {
  return decodeImageSrcs(curvedMonitorStillSrcs())
}
