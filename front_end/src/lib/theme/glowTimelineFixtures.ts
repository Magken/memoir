import type { GlowTimelineDegree, GlowTimelineScrollRange } from '../timeline/glowTimelineTypes'

export const THEME_GLOW_TIMELINE_EDUCATION_SCROLL: GlowTimelineScrollRange = {
  start: 'top 72%',
  end: 'bottom 28%',
}

export const THEME_GLOW_TIMELINE_HORIZONTAL_SCROLL: GlowTimelineScrollRange = {
  start: 'top 78%',
  end: 'bottom 22%',
}

export const THEME_DEMO_DEGREES: readonly GlowTimelineDegree[] = [
  {
    id: 'degree-1',
    title: 'M.S. Interaction Design',
    date: '2019 – 2021',
    gpa: 'GPA 3.9',
    school: 'Northbridge School of Design',
    meta: 'Thesis: scroll-driven narrative systems',
    coursework: ['Motion systems', 'Design research', 'Prototyping'],
  },
  {
    id: 'degree-2',
    title: 'B.A. Visual Communication',
    date: '2015 – 2019',
    school: 'Riverside College of Art',
    coursework: ['Typography', 'Brand systems', 'Photography'],
  },
  {
    id: 'degree-3',
    title: 'Certificate — Front-end craft',
    date: '2022',
    school: 'Open Studio Program',
    meta: 'Part-time · evenings',
  },
]
