import { useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'

type PerfSample = {
  fps: number
  ms: number
}

export function usePerfStats(enabled = true): PerfSample {
  const [sample, setSample] = useState<PerfSample>({ fps: 0, ms: 0 })

  useFrame((_, delta) => {
    if (!enabled) return
    const ms = delta * 1000
    const fps = delta > 0 ? 1 / delta : 0
    setSample((prev) =>
      Math.abs(prev.fps - fps) > 0.5 || Math.abs(prev.ms - ms) > 0.5 ? { fps, ms } : prev,
    )
  })

  useEffect(() => {
    if (!enabled) setSample({ fps: 0, ms: 0 })
  }, [enabled])

  return sample
}

/** DOM overlay for the lab — kept as a sibling, not inside the Canvas. */
export function formatPerfStats(sample: PerfSample): string {
  if (sample.fps <= 0) return '—'
  return `${sample.fps.toFixed(0)} fps · ${sample.ms.toFixed(1)} ms`
}
