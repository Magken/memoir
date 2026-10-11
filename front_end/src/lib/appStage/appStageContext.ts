/**
 * App Stage context — kept in a separate module so Page Scenes can import
 * `useAppStage` without circular HMR/context identity issues with `AppStage.tsx`.
 */
import { createContext, useContext } from 'react'
import type { TryInterviewKitId } from '../tryInterview/tryInterviewKits'

export type AppStageGoToOptions = {
  replace?: boolean
  /** Optional query string including `?` (e.g. `?briefId=…`). */
  search?: string
}

export type AppStagePhase = 'curtain-loading' | 'curtain-transition' | 'ready'

/** First-boot loading surface — home landing owns `%`→V; else CurtainLoading. */
export type AppStageBootstrapSurface = 'home' | 'curtain'

export type AppStageLeavePrep = () => void | Promise<void>

export type AppStageContextValue = {
  goTo: (path: string, options?: AppStageGoToOptions) => void
  goHome: () => void
  goDashboard: () => void
  goInterview: (opts?: { briefId?: string }) => void
  /** Home Try fixture demo — `/theme/vurify/try-interview` (not dashboard Test). Optional `kit` is `?kit=`. */
  goTryInterview: (opts?: { kit?: TryInterviewKitId }) => void
  activePath: string | null
  /** Conductor phase — curtain owns boot; pages only after ready. */
  stagePhase: AppStagePhase
  /** False until first bootstrap load exit + handoff (or home landing unlock). */
  stageReady: boolean
  /** True while first bootstrap load is in progress (not page hops). */
  stageLoading: boolean
  /**
   * True for the whole hop: leave-prep (menu close) through Curtain Transition.
   * Scroll/wheel must not drive peels or page scroll during this window.
   */
  stageNavigating: boolean
  /** 0–100 — drives CurtainLoading or Home landing `%` during bootstrap. */
  stageProgress: number
  /**
   * Which surface owns first-boot loading. Locked from the initial URL —
   * `/` → home landing; other stage URLs → CurtainLoading.
   */
  bootstrapSurface: AppStageBootstrapSurface
  /** Call when bootstrap load visuals finish (curtain V/% exit or home V reveal). */
  reportCurtainLoadingComplete: () => void
  /**
   * Register a leave prep for a keep-alive stage path (e.g. close dashboard menu
   * before Curtain Transition). Pass `null` to clear.
   */
  registerLeavePrep: (path: string, prep: AppStageLeavePrep | null) => void
}

export const AppStageContext = createContext<AppStageContextValue | null>(null)

export function useAppStage(): AppStageContextValue {
  const value = useContext(AppStageContext)
  if (!value) {
    throw new Error('useAppStage must be used within AppStageProvider')
  }
  return value
}
