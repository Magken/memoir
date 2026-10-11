/**
 * Named LCL scenes. A page asks for one by id; the cell payload stays in
 * viewportSections. Add the next scene here so pages can swap them.
 */
import {
  LCL_ABOUT_HOME_FIXTURE,
  LCL_ABOUT_WORK_FIXTURE,
  LCL_ABOUT_COLLAB_FIXTURE,
  LCL_ATLAS_FIXTURE,
  LCL_LANDING_LOAD_FIXTURE,
  LCL_LEDGER_FIXTURE,
  LCL_MEMOIR_FRAME_FIXTURE,
  LCL_PREVIEW_FIXTURE,
  LCL_PROJECTS_SOON_FIXTURE,
  LCL_PROJECTS_DETAIL_FIXTURE,
  LCL_FOOTER_LINKS_FIXTURE,
  LCL_REEL_FIXTURE,
  LCL_TYPE_FIXTURE,
  type LclViewportSectionsPayload,
} from './viewportSections'

export const LCL_SCENES = {
  /** Word, hairline, percent. Landing load overlay. */
  loader: LCL_LANDING_LOAD_FIXTURE,
  /** Memoir home — centered 4×6 window over the splat; glass outside it. */
  memoirFrame: LCL_MEMOIR_FRAME_FIXTURE,
  /** Title, list, prose. Toolkit preview. */
  preview: LCL_PREVIEW_FIXTURE,
  /** About Home stage 1 — tall left display + top-right reserve. */
  aboutHome: LCL_ABOUT_HOME_FIXTURE,
  /** About Text canvas stage 2 — same left strip, center breadcrumb panel. */
  aboutWork: LCL_ABOUT_WORK_FIXTURE,
  /** About Text inset stage 3 — top-right title, center note. */
  aboutCollaborate: LCL_ABOUT_COLLAB_FIXTURE,
  /** Projects — catalog search + table tile. */
  projectsSoon: LCL_PROJECTS_SOON_FIXTURE,
  /** Projects text canvas — title band + breadcrumb body. */
  projectsDetail: LCL_PROJECTS_DETAIL_FIXTURE,
  /** Footer — home subtitle and compact section links. */
  footerLinks: LCL_FOOTER_LINKS_FIXTURE,
  /** Toolkit Ledger — table, stats, hover note. */
  ledger: LCL_LEDGER_FIXTURE,
  /** Toolkit Reel — series, hero frame, thumb strip. */
  reel: LCL_REEL_FIXTURE,
  /** Toolkit Atlas — hover columns, index, stage, timeline. */
  atlas: LCL_ATLAS_FIXTURE,
  /** Toolkit Type — specimens and a transform stage. */
  type: LCL_TYPE_FIXTURE,
} as const

export type LclSceneId = keyof typeof LCL_SCENES

export function lclScene(id: LclSceneId): LclViewportSectionsPayload {
  return LCL_SCENES[id]
}
