import { useEffect, useState } from 'react'

export const MOCKUP_MOTIONS = [
  { value: 'focus', label: 'Focus fold', description: 'One section stays; the others fade out fully — no clipped type.' },
  { value: 'swap', label: 'Swap pane', description: 'The open section takes the frame after the rest have faded out.' },
  { value: 'walk', label: 'Walk accent', description: 'Highlight walks from section to section.' },
  { value: 'stagger', label: 'Stagger in', description: 'Sections enter one after another, then restart.' },
  { value: 'type', label: 'Type in', description: 'Titles and row labels animate in, then loop.' },
  { value: 'gleam', label: 'Gleam pass', description: 'A shine walks the active section.' },
  { value: 'rise', label: 'Rise lines', description: 'Headings and rows rise in, then loop.' },
] as const

export type MockupMotionId = (typeof MOCKUP_MOTIONS)[number]['value']

export const MOCKUP_MOTION_OPTIONS = MOCKUP_MOTIONS.map(({ value, label, description }) => ({
  value,
  label,
  description,
}))

function motionInterval(motion: MockupMotionId, boxCount: number): number {
  if (motion === 'stagger' || motion === 'type' || motion === 'rise') return 900 + boxCount * 420
  return 2600
}

export function useMockupMotionLoop(motion: MockupMotionId | null, boxCount: number) {
  const [active, setActive] = useState(0)
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    setActive(0)
    setCycle(0)
  }, [motion, boxCount])

  useEffect(() => {
    if (!motion || boxCount < 1) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const restart = motion === 'stagger' || motion === 'type' || motion === 'rise'
    const id = window.setInterval(() => {
      if (restart) setCycle((value) => value + 1)
      setActive((value) => (value + 1) % boxCount)
    }, motionInterval(motion, boxCount))

    return () => window.clearInterval(id)
  }, [motion, boxCount])

  return { active, cycle }
}
