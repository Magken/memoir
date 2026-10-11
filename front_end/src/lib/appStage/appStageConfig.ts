/**
 * App Stage registry — Tier-1 Page Scenes that stay mounted on the stage.
 * Paths outside this map are outflow (normal React Router mount/unmount).
 * Vurify product pages live under `/theme/vurify/*` as Theme references.
 */
import type { ComponentType } from 'react'
import { VURIFY_REF_PATHS } from '../vurifyRef/paths'

export type AppStagePageDefinition = {
  path: string
  root: string
  load: () => Promise<{ default: ComponentType }>
}

export const APP_STAGE_PAGES: Record<string, AppStagePageDefinition> = {
  [VURIFY_REF_PATHS.landing]: {
    path: VURIFY_REF_PATHS.landing,
    root: 'home',
    load: () =>
      import('../../pages/HomePage').then((module) => ({ default: module.HomePage })),
  },
  [VURIFY_REF_PATHS.dashboard]: {
    path: VURIFY_REF_PATHS.dashboard,
    root: 'dashboard',
    load: () =>
      import('../../pages/DashboardPage').then((module) => ({
        default: module.DashboardPage,
      })),
  },
  [VURIFY_REF_PATHS.interview]: {
    path: VURIFY_REF_PATHS.interview,
    root: 'interview',
    load: () =>
      import('../../pages/InterviewPage').then((module) => ({
        default: module.InterviewPage,
      })),
  },
  [VURIFY_REF_PATHS.tryInterview]: {
    path: VURIFY_REF_PATHS.tryInterview,
    root: 'interview',
    load: () =>
      import('../../pages/InterviewPage').then((module) => ({
        default: module.TryInterviewPage,
      })),
  },
}

export function normalizeAppStagePath(path: string): string {
  return path.replace(/\/+$/, '') || '/'
}

export function appStagePageForPath(path: string): AppStagePageDefinition | null {
  return APP_STAGE_PAGES[normalizeAppStagePath(path)] ?? null
}
