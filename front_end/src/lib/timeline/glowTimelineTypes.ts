export type GlowTimelineOrientation = 'vertical' | 'horizontal'

export type GlowTimelineScrollRange = {
  start: string
  end: string
}

export type GlowTimelineDegree = {
  id: string
  title: string
  date: string
  gpa?: string
  school: string
  meta?: string
  coursework?: readonly string[]
}

export type GlowTimelineShell = 'carded' | 'cardless'
