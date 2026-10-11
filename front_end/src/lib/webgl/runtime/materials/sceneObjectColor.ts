/** Scene darkness is object color, not lamp gain. */

export const SCENE_OBJECT_COLOR_DIM = 160
export const SCENE_OBJECT_COLOR_DIM_DURATION = 0.58

export type SceneRgb = { r: number; g: number; b: number }

export function parseHexRgb(hex: string): SceneRgb | null {
  if (typeof hex !== 'string') return null
  const n = hex.replace('#', '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(n)) return null
  const value = Number.parseInt(n, 16)
  if (!Number.isFinite(value)) return null
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

export function formatHexRgb({ r, g, b }: SceneRgb): string {
  const ch = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${ch(r)}${ch(g)}${ch(b)}`
}

/** `t` 0 is black. `t` 1 is `hex`. Lamp gain is not involved. */
export function scaleHexRgb(hex: string, t: number): string {
  const rgb = parseHexRgb(hex)
  if (!rgb) return hex
  const k = Math.max(0, Math.min(1, t))
  return formatHexRgb({ r: rgb.r * k, g: rgb.g * k, b: rgb.b * k })
}

/** How long a wheel spends taking the current scene’s object color to black. */
export const SCENE_DEPART_S = 0.7

/**
 * Object-color mix. An intro rises `introT` 0→1. A wheel depart falls `departT` 1→0.
 * Multiplying them is black at either end and the baked color only when both are 1.
 */
export function sceneTone(introT: number, departT: number): number {
  const intro = Math.max(0, Math.min(1, introT))
  const depart = Math.max(0, Math.min(1, departT))
  return intro * depart
}

/**
 * Color on screen. `departT` counts only while that fade is still the gesture.
 * A killed tween must not leave the next scene black.
 */
export function visibleSceneTone(introT: number, departT: number, departing: boolean): number {
  return sceneTone(introT, departing ? departT : 1)
}

/** Age on a crane for a progress of 0–1, including the opening hold. */
export function ageAtProgress(progress: number, hold: number, duration: number): number {
  const span = Math.max(0, hold) + Math.max(duration, 0.05)
  return Math.max(0, Math.min(1, progress)) * span
}

/**
 * Camera parameter and color mix for one crane clock.
 * `t` stays 0 through the hold. `mix` rises across hold plus the move.
 */
export function craneClock(age: number, hold: number, duration: number): { mix: number; t: number } {
  const wait = Math.max(0, hold)
  const run = Math.max(duration, 0.05)
  const span = wait + run
  const clamped = Math.min(span, Math.max(0, age))
  const mix = clamped > 0 ? Math.min(1, clamped / span) : 0
  const t = clamped <= wait ? 0 : (clamped - wait) / run
  return { mix, t }
}

/**
 * Color for a steered crane. Forward keeps the hold in the rise.
 * Reverse follows the camera, so the picture is black when the move ends — not after a parked hold.
 */
export function steerColorMix(clock: { mix: number; t: number }, rate: number): number {
  return rate < 0 ? clock.t : clock.mix
}

/** Reverse is finished when the camera is back on the opening pose, even if the hold has not drained. */
export function steerReverseDone(clock: { t: number }, rate: number): boolean {
  return rate < 0 && clock.t <= 0
}

/** Incoming object-color clock. Tinted / rising / load scenes start black. */
export function incomingIntroT(opts: { riseAtHome: boolean; tint: boolean; hasLoadMotion: boolean }): number {
  return opts.riseAtHome || opts.tint || opts.hasLoadMotion ? 0 : 1
}

/**
 * Object-color progress for the scene on screen.
 * A write tagged with another scene (a finished landing rise, a reverse snap) must not light this one.
 */
export function introTForScene(clockScene: string, clockT: number, sceneId: string, incoming: number): number {
  return clockScene === sceneId ? clockT : incoming
}

/** Hold the crane until this scene's models have called ready — not the previous scene's flag. */
export function sceneClockWaiting(hasMotion: boolean, readySceneId: string, sceneId: string): boolean {
  return Boolean(hasMotion) && readySceneId !== sceneId
}

/**
 * Park on the opening pose while models are still coming in.
 * A live rate would ramp object color before the mesh exists, then the mesh pops in mid-ramp.
 */
export function sceneFlyRate(waitingAssets: boolean, steerRate: number | undefined): number | undefined {
  if (waitingAssets) return 0
  return steerRate
}

/** Reverse of a tinted entrance settles at black. Copy hops (canvas ↔ inset) keep full color. */
export function steeredIntroAtDone(rate: number | undefined, tint = false): number {
  return rate !== undefined && rate < 0 && tint ? 0 : 1
}

/**
 * Home hop is only for settled View shots. A first About/Projects/Footer load
 * must not seat Home while the sculpture is still coming in — that cut plus the
 * torch crane reads as a leftover light pulse.
 */
export function sceneUsesViewpointFly(waitingAssets: boolean, hasMotion: boolean, playing: boolean): boolean {
  if (waitingAssets) return false
  return !(hasMotion && playing)
}

export function introColorMix(elapsed: number, hold: number, duration: number): number {
  const span = Math.max(0, hold) + Math.max(duration, 0.05)
  if (!(elapsed > 0) || !(span > 0)) return 0
  return Math.min(1, elapsed / span)
}

/** Subtract `delta` from each channel and clamp at 0. Does not touch lamp intensity. */
export function dimHexRgb(hex: string, delta = SCENE_OBJECT_COLOR_DIM): string {
  const rgb = parseHexRgb(hex)
  if (!rgb) return hex
  return formatHexRgb({
    r: rgb.r - delta,
    g: rgb.g - delta,
    b: rgb.b - delta,
  })
}
