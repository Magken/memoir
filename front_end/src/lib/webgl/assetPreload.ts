/** Byte progress for registered glTF files. Display percent never runs ahead of this. Splats stay out of this list; a splat subject fetches its own file. */

import { WEBGL_ASSETS } from './assets/assetManifest'

export type AssetPreloadHandle = {
  cancel: () => void
}

/** Average of per-file fractions, 0–1. 100 only when every file is included. */
export function assetLoadPercent(fractions: readonly number[]): number {
  if (fractions.length === 0) return 100
  const sum = fractions.reduce((total, fraction) => total + Math.max(0, Math.min(1, fraction)), 0)
  return Math.round((sum / fractions.length) * 100)
}

/** 100 is refused until this much time has passed, so a cached load still counts. */
export const LOAD_COUNT_MIN_MS = 2000

/**
 * What the overlay may show. Never ahead of `loaded`, and never at 100
 * before `minMs`. A finished load at t=0 therefore counts 0→100 across the window.
 */
export function pacedLoadPercent(loaded: number, elapsedMs: number, minMs = LOAD_COUNT_MIN_MS): number {
  const cap = Math.max(0, Math.min(100, Math.round(loaded)))
  if (minMs <= 0) return cap
  const ramp = Math.min(100, Math.floor((Math.max(0, elapsedMs) / minMs) * 100))
  return Math.min(cap, ramp)
}

/** Always three digits so a place is never blank. `7` → `007`. */
export function formatLoadPercent(value: number): string {
  const n = Math.max(0, Math.min(100, Math.round(value)))
  return String(n).padStart(3, '0')
}

export function startWebglAssetPreload(onProgress: (percent: number) => void): AssetPreloadHandle {
  const assets = WEBGL_ASSETS.flatMap((asset) =>
    asset.path && asset.kind !== 'splat' ? [{ ...asset, path: asset.path }] : [],
  )
  const loaded = assets.map(() => 0)
  const totals = assets.map(() => 0)
  const done = assets.map(() => false)
  const xhrs: XMLHttpRequest[] = []

  const emit = () => {
    const fractions = assets.map((_, index) => {
      if (done[index]) return 1
      if (totals[index] > 0) return Math.min(1, loaded[index] / totals[index])
      return 0
    })
    const percent = assetLoadPercent(fractions)
    onProgress(done.every(Boolean) ? 100 : Math.min(99, percent))
  }

  if (assets.length === 0) {
    onProgress(100)
    return { cancel() {} }
  }

  assets.forEach((asset, index) => {
    const xhr = new XMLHttpRequest()
    xhrs.push(xhr)
    xhr.open('GET', asset.path)
    xhr.responseType = 'arraybuffer'
    xhr.onprogress = (event) => {
      if (!event.lengthComputable) return
      totals[index] = event.total
      loaded[index] = event.loaded
      emit()
    }
    const settle = () => {
      const size = xhr.response instanceof ArrayBuffer ? xhr.response.byteLength : loaded[index]
      if (!totals[index]) totals[index] = size || 1
      loaded[index] = totals[index]
      done[index] = true
      emit()
    }
    xhr.onload = settle
    xhr.onerror = settle
    xhr.send()
  })

  return {
    cancel() {
      for (const xhr of xhrs) xhr.abort()
    },
  }
}
