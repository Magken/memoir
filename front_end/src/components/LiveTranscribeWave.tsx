import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react'

export type LiveTranscribeWaveProps = {
  className?: string
  /** When false, freezes at a near-flat idle stroke. */
  active?: boolean
  /**
   * Session still warming (Edge secret / WebRTC) — soft breathing scroll so the
   * wave doesn't look dead while the mic isn't ready yet.
   */
  connecting?: boolean
  /** Shown enter/exit chrome — host sets `data-shown`. */
  shown?: boolean
}

export type LiveTranscribeWaveHandle = {
  /** Push live mic energy (0–1). Imperative so frames skip React. */
  setEnergy: (energy: number) => void
  reset: () => void
}

type Layer = {
  seed: number
  alpha: number
}

const LAYERS: readonly Layer[] = [
  { seed: 0.12, alpha: 1 },
  { seed: 0.41, alpha: 0.72 },
  { seed: 0.67, alpha: 0.5 },
  { seed: 0.89, alpha: 0.34 },
]

/**
 * Compact audio-reactive noise-line wave (simplex-style strokes).
 * Amplitude + scroll speed track mic energy — quiet ≈ flat, speech flows the line.
 */
export const LiveTranscribeWave = forwardRef<LiveTranscribeWaveHandle, LiveTranscribeWaveProps>(
  function LiveTranscribeWave({ className, active = true, connecting = false, shown = true }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const energyRef = useRef(0)
    const smoothedRef = useRef(0)
    const offsetRef = useRef(Math.random() * 10)
    const rafRef = useRef(0)
    const activeRef = useRef(active)
    const connectingRef = useRef(connecting)
    const shownRef = useRef(shown)

    activeRef.current = active
    connectingRef.current = connecting
    shownRef.current = shown

    useImperativeHandle(
      ref,
      () => ({
        setEnergy: (energy: number) => {
          energyRef.current = Math.min(1, Math.max(0, energy))
        },
        reset: () => {
          energyRef.current = 0
          smoothedRef.current = 0
        },
      }),
      [],
    )

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return undefined
      const ctx = canvas.getContext('2d')
      if (!ctx) return undefined

      let running = true
      let lastTs = performance.now()

      const resize = () => {
        const cssW = Math.max(1, canvas.clientWidth)
        const cssH = Math.max(1, canvas.clientHeight)
        const dpi = Math.min(2, window.devicePixelRatio || 1)
        const w = Math.round(cssW * dpi)
        const h = Math.round(cssH * dpi)
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w
          canvas.height = h
        }
        return { w, h, dpi }
      }

      const themeColors = () => {
        const host = canvas.closest('.theme') ?? canvas
        const styles = getComputedStyle(host)
        const accent =
          styles.getPropertyValue('--theme-accent').trim() ||
          styles.getPropertyValue('--theme-fg').trim() ||
          '#5b7cfa'
        const muted =
          styles.getPropertyValue('--theme-text-muted').trim() ||
          styles.getPropertyValue('--theme-border-strong').trim() ||
          accent
        return { accent, muted }
      }

      const paint = (ts: number) => {
        if (!running) return
        rafRef.current = window.requestAnimationFrame(paint)

        const dt = Math.min(0.05, Math.max(0.008, (ts - lastTs) / 1000))
        lastTs = ts

        const { w, h, dpi } = resize()
        if (!shownRef.current || w < 2 || h < 2) {
          ctx.clearRect(0, 0, w, h)
          return
        }

        const reduceMotion =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches

        const connectingNow = connectingRef.current && !activeRef.current
        let e: number
        if (connectingNow) {
          // Soft breathing load — clearly alive, not speech-reactive.
          const breath = 0.5 + 0.5 * Math.sin(ts / 520)
          e = reduceMotion ? 0.22 : 0.18 + breath * 0.2
          smoothedRef.current = e
          offsetRef.current += dt * (reduceMotion ? 0.12 : 0.85 + breath * 0.55)
        } else {
          const target = activeRef.current ? energyRef.current : 0
          // Attack fast / release slow so speech peaks leave a short wake.
          const mix = target > smoothedRef.current ? 0.5 : 0.2
          smoothedRef.current += (target - smoothedRef.current) * mix
          if (smoothedRef.current < 0.015) smoothedRef.current = 0
          e = smoothedRef.current
          // Only scroll when there is real energy — silence stays still.
          if (e > 0.01) {
            offsetRef.current += dt * (reduceMotion ? 0.03 + e * 0.35 : 0.05 + e * 3.8)
          }
        }

        // Gentler throw — readable motion without a big bounce.
        const amp = (
          connectingNow
            ? reduceMotion
              ? 1.05
              : 1.15 + e * 2.4
            : reduceMotion
              ? 0.25 + e * 2.2
              : 0.28 + e * 7.2
        ) * dpi
        const mid = h * 0.55
        const { accent, muted } = themeColors()
        // Bias toward accent so quiet strokes still read; loud fills full accent.
        const color = mixCssColors(
          muted,
          accent,
          connectingNow ? 0.55 + e * 0.25 : Math.min(1, 0.7 + e * 0.3),
        )
        const step = Math.max(2, Math.round(2 * dpi))

        ctx.clearRect(0, 0, w, h)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = Math.max(3.1, 3.6 * dpi)
        // Tight soft shadow — depth without blurry haze.
        ctx.shadowColor = withAlpha(accent, connectingNow ? 0.22 + e * 0.12 : 0.28 + e * 0.18)
        ctx.shadowBlur = (connectingNow ? 1.1 + e * 0.8 : 1.4 + e * 1.2) * dpi
        ctx.shadowOffsetY = 0.45 * dpi

        for (const layer of LAYERS) {
          ctx.beginPath()
          ctx.globalAlpha = layer.alpha * (connectingNow ? 0.55 + e * 0.35 : 0.85 + e * 0.15)
          ctx.strokeStyle = color
          for (let x = 0; x <= w; x += step) {
            const n = simplex3(x * 0.018, layer.seed, offsetRef.current)
            const y = mid + n * amp
            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }

        ctx.shadowBlur = 0
        ctx.shadowColor = 'transparent'
        ctx.shadowOffsetY = 0

        // Soft edge fade — strings dissolve into the canvas sides.
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'destination-in'
        const fade = ctx.createLinearGradient(0, 0, w, 0)
        const inset = Math.min(0.28, Math.max(0.14, (18 * dpi) / w))
        fade.addColorStop(0, 'rgba(0,0,0,0)')
        fade.addColorStop(inset, 'rgba(0,0,0,1)')
        fade.addColorStop(1 - inset, 'rgba(0,0,0,1)')
        fade.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = fade
        ctx.fillRect(0, 0, w, h)
        ctx.globalCompositeOperation = 'source-over'
      }

      rafRef.current = window.requestAnimationFrame(paint)
      return () => {
        running = false
        window.cancelAnimationFrame(rafRef.current)
      }
    }, [])

    return (
      <canvas
        ref={canvasRef}
        className={['theme-live-transcribe-wave', className].filter(Boolean).join(' ')}
        data-connecting={connecting ? 'true' : 'false'}
        aria-hidden
      />
    )
  },
)

/* ─── color helpers ──────────────────────────────────────────────────────── */

function parseCssColor(input: string): [number, number, number] | null {
  const s = input.trim()
  if (!s) return null
  if (s.startsWith('#')) {
    const hex = s.slice(1)
    if (hex.length === 3) {
      return [
        parseInt(hex[0]! + hex[0]!, 16),
        parseInt(hex[1]! + hex[1]!, 16),
        parseInt(hex[2]! + hex[2]!, 16),
      ]
    }
    if (hex.length >= 6) {
      return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
    }
  }
  const rgb = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  return null
}

function mixCssColors(a: string, b: string, t: number): string {
  const ca = parseCssColor(a)
  const cb = parseCssColor(b)
  if (!ca || !cb) return t > 0.5 ? b : a
  const u = Math.min(1, Math.max(0, t))
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * u)
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * u)
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * u)
  return `rgb(${r}, ${g}, ${bl})`
}

function withAlpha(color: string, alpha: number): string {
  const c = parseCssColor(color)
  if (!c) return color
  const a = Math.min(1, Math.max(0, alpha))
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`
}

/* ─── compact 3D simplex (Gustavson-style) ───────────────────────────────── */

const F3 = 1 / 3
const G3 = 1 / 6

const grad3 = [
  [1, 1, 0],
  [-1, 1, 0],
  [1, -1, 0],
  [-1, -1, 0],
  [1, 0, 1],
  [-1, 0, 1],
  [1, 0, -1],
  [-1, 0, -1],
  [0, 1, 1],
  [0, -1, 1],
  [0, 1, -1],
  [0, -1, -1],
] as const

const perm = new Uint8Array(512)
;(() => {
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  let n = 256
  while (n > 1) {
    const k = Math.floor(Math.random() * n)
    n -= 1
    const t = p[n]!
    p[n] = p[k]!
    p[k] = t
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]!
})()

function dot3(g: readonly [number, number, number], x: number, y: number, z: number) {
  return g[0] * x + g[1] * y + g[2] * z
}

function simplex3(xin: number, yin: number, zin: number): number {
  const s = (xin + yin + zin) * F3
  const i = Math.floor(xin + s)
  const j = Math.floor(yin + s)
  const k = Math.floor(zin + s)
  const t = (i + j + k) * G3
  const X0 = i - t
  const Y0 = j - t
  const Z0 = k - t
  const x0 = xin - X0
  const y0 = yin - Y0
  const z0 = zin - Z0

  let i1: number
  let j1: number
  let k1: number
  let i2: number
  let j2: number
  let k2: number
  if (x0 >= y0) {
    if (y0 >= z0) {
      i1 = 1
      j1 = 0
      k1 = 0
      i2 = 1
      j2 = 1
      k2 = 0
    } else if (x0 >= z0) {
      i1 = 1
      j1 = 0
      k1 = 0
      i2 = 1
      j2 = 0
      k2 = 1
    } else {
      i1 = 0
      j1 = 0
      k1 = 1
      i2 = 1
      j2 = 0
      k2 = 1
    }
  } else if (y0 < z0) {
    i1 = 0
    j1 = 0
    k1 = 1
    i2 = 0
    j2 = 1
    k2 = 1
  } else if (x0 < z0) {
    i1 = 0
    j1 = 1
    k1 = 0
    i2 = 0
    j2 = 1
    k2 = 1
  } else {
    i1 = 0
    j1 = 1
    k1 = 0
    i2 = 1
    j2 = 1
    k2 = 0
  }

  const x1 = x0 - i1 + G3
  const y1 = y0 - j1 + G3
  const z1 = z0 - k1 + G3
  const x2 = x0 - i2 + 2 * G3
  const y2 = y0 - j2 + 2 * G3
  const z2 = z0 - k2 + 2 * G3
  const x3 = x0 - 1 + 3 * G3
  const y3 = y0 - 1 + 3 * G3
  const z3 = z0 - 1 + 3 * G3

  const ii = i & 255
  const jj = j & 255
  const kk = k & 255

  let n0 = 0
  let n1 = 0
  let n2 = 0
  let n3 = 0

  let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0
  if (t0 > 0) {
    t0 *= t0
    const gi0 = perm[ii + perm[jj + perm[kk]!]!]! % 12
    n0 = t0 * t0 * dot3(grad3[gi0]!, x0, y0, z0)
  }
  let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1
  if (t1 > 0) {
    t1 *= t1
    const gi1 = perm[ii + i1 + perm[jj + j1 + perm[kk + k1]!]!]! % 12
    n1 = t1 * t1 * dot3(grad3[gi1]!, x1, y1, z1)
  }
  let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2
  if (t2 > 0) {
    t2 *= t2
    const gi2 = perm[ii + i2 + perm[jj + j2 + perm[kk + k2]!]!]! % 12
    n2 = t2 * t2 * dot3(grad3[gi2]!, x2, y2, z2)
  }
  let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3
  if (t3 > 0) {
    t3 *= t3
    const gi3 = perm[ii + 1 + perm[jj + 1 + perm[kk + 1]!]!]! % 12
    n3 = t3 * t3 * dot3(grad3[gi3]!, x3, y3, z3)
  }

  return 32 * (n0 + n1 + n2 + n3)
}
