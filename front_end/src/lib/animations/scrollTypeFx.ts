/** Scroll-type FX catalog metadata (Codrops On-Scroll Typography Animations) */

export type ScrollTypeTreatment =
  | 'height'
  | 'height-medium'
  | 'larger'
  | 'medium'
  | 'sub'
  | 'upper'

export type ScrollTypeLineStyle = {
  face?: number
  treatments?: readonly ScrollTypeTreatment[]
}

export type ScrollTypeFxMeta = {
  id: number
  set: 1 | 2
  label: string
  purpose: string
  needsCharWrap?: boolean
  lines: string[]
  /** Source face and treatment classes, indexed to `lines`. */
  lineStyles?: readonly ScrollTypeLineStyle[]
  layout?: 'title' | 'prose'
  arrangement?: 'stack' | 'sides'
}

export const SCROLL_TYPE_FX: readonly ScrollTypeFxMeta[] = [
  { id: 1, set: 1, label: 'Scatter scale', purpose: 'Chars fade/scale with random rotation scrub', lines: ['Beyond', 'meaning'], lineStyles: [{}, { face: 6 }] },
  { id: 2, set: 1, label: 'Stretch rise', purpose: 'Chars rise with scaleY squash scrub', lines: ['Heavenly', 'pleasure'], lineStyles: [{ face: 2 }, { face: 4 }] },
  { id: 3, set: 1, label: 'ScaleY unfold', purpose: 'Chars unfold from scaleY 0', lines: ['The blossoms', 'have fallen'], lineStyles: [{ face: 7 }, { face: 1 }], arrangement: 'sides' },
  { id: 4, set: 1, label: 'Center gather', purpose: 'Per-word chars gather from sides', lines: ['Human', 'gratitude'], lineStyles: [{ treatments: ['larger'] }, { face: 7, treatments: ['upper', 'sub'] }] },
  { id: 5, set: 1, label: 'Chaos settle', purpose: 'Random x/y scatter settles', lines: ['Intentionally', 'dramatic'], lineStyles: [{ face: 7 }, { face: 6 }] },
  { id: 6, set: 1, label: '3D flip X', purpose: 'Word chars flip on rotationX', lines: ['Blooming', 'flowers'], lineStyles: [{ face: 3 }, { face: 6 }] },
  { id: 7, set: 1, label: '3D flip Y', purpose: 'Chars swing in on rotationY', lines: ['Unfolding', 'Elegantly', 'Naturally'], lineStyles: [{ face: 3 }, { face: 4 }, { face: 7 }] },
  { id: 8, set: 1, label: 'Glyph scramble', purpose: 'toggleActions scramble then restore', lines: ['Midnight'], lineStyles: [{ face: 8 }] },
  { id: 9, set: 1, label: 'Width wipe', purpose: 'scaleX from center of viewport', lines: ['Moon', 'Transportation'], lineStyles: [{ face: 12, treatments: ['larger'] }, { face: 1, treatments: ['upper', 'sub'] }] },
  { id: 10, set: 1, label: 'Blur reveal', purpose: 'Random blur stagger (toggleActions)', lines: ['Lucid', 'Dreaming', 'Diaries'], lineStyles: [{ face: 7 }, { face: 4 }, { face: 1, treatments: ['medium'] }] },
  { id: 11, set: 1, label: 'Clip slide in', purpose: 'char-wrap overflow slide (toggleActions)', needsCharWrap: true, lines: ['The Routine'], lineStyles: [{ face: 3, treatments: ['height'] }] },
  { id: 12, set: 1, label: 'Skew fly-in', purpose: 'char-wrap skew scrub from left', needsCharWrap: true, lines: ['Night Time'], lineStyles: [{ face: 9, treatments: ['height'] }] },
  { id: 13, set: 1, label: 'Spin Y rise', purpose: 'rotationY 180 scrub in', lines: ['Megascrapers'], lineStyles: [{ face: 5 }] },
  { id: 14, set: 1, label: 'Pin cascade', purpose: 'Pinned title + falling chars', lines: ['Futuristic'], lineStyles: [{ face: 11 }] },
  { id: 15, set: 1, label: 'Pin tumble', purpose: 'Pinned title + rotationX tumble', lines: ['Unintelligible'], lineStyles: [{ face: 10 }] },
  {
    id: 16,
    set: 2,
    label: 'Prose wash',
    purpose: 'Long prose char wash (set 2)',
    layout: 'prose',
    lines: [
      'As human beings, we often find ourselves feeling out of place in the world around us. We sense that something is not quite right, that the reality we experience is not necessarily the truth. And yet, we are bound by the beliefs and illusions that have been ingrained in us since childhood. It can be a difficult and confusing journey to try and unravel these beliefs, to see beyond the layers of deception that cloud our vision. We may feel as though we need to make an effort, to strive for enlightenment, to grasp at something just beyond our reach. But what if the answer is not found in effort, but in surrender? What if we simply allow ourselves to be carried by the flow of existence, to trust in the natural rhythm of life itself?',
    ],
  },
  { id: 17, set: 2, label: 'Stubborn rise', purpose: 'Stacked words rise scrub', lines: ['Stubborn', 'Naivety'] },
  { id: 18, set: 2, label: 'Upper pair', purpose: 'Twin uppercase lines', lines: ['Surrender to reality', 'Step into the light'], lineStyles: [{ face: 16, treatments: ['upper'] }, { face: 16, treatments: ['upper'] }] },
  { id: 19, set: 2, label: 'Intense nature', purpose: 'Heavy display pair', lines: ['Intense', 'Nature'], lineStyles: [{ face: 21, treatments: ['upper'] }, { face: 21, treatments: ['upper'] }] },
  { id: 20, set: 2, label: 'Waking life', purpose: 'Mixed display faces', lines: ['Waking', 'Life'], lineStyles: [{ face: 22, treatments: ['upper'] }, { face: 12, treatments: ['upper'] }] },
  { id: 21, set: 2, label: 'Beauty remains', purpose: 'Serif / variable pair', lines: ['Beauty', 'remains'], lineStyles: [{ face: 20 }, { face: 18 }] },
  { id: 22, set: 2, label: 'Dance into', purpose: 'Three-word cascade', lines: ['Dance', 'into', 'Existence'], lineStyles: [{ face: 23, treatments: ['upper'] }, { face: 16, treatments: ['upper'] }, { face: 23, treatments: ['upper'] }] },
  { id: 23, set: 2, label: 'Deeper love', purpose: 'Triple uppercase stack', lines: ['Deeper', 'Love', 'Light'], lineStyles: [{ face: 22, treatments: ['upper'] }, { face: 20, treatments: ['upper'] }, { face: 18, treatments: ['upper'] }] },
  { id: 24, set: 2, label: 'Embrace', purpose: 'Single word punch', lines: ['Embrace'], lineStyles: [{ face: 15, treatments: ['upper'] }] },
  {
    id: 25,
    set: 2,
    label: 'Heart verse',
    purpose: 'Multi-line medium verse',
    layout: 'prose',
    lines: [
      'Feel because you have a heart',
      'And let it guide you through the dark.',
      "For it's the well of emotions deep,",
      'That helps you laugh, love, and sleep.',
    ],
    lineStyles: Array.from({ length: 4 }, () => ({
      face: 13,
      treatments: ['medium', 'height-medium'],
    })),
  },
  { id: 26, set: 2, label: 'Cosmic symphony', purpose: 'Upper pair display', lines: ['Cosmic', 'Symphony'], lineStyles: [{ face: 19, treatments: ['upper'] }, { face: 23, treatments: ['upper'] }] },
  {
    id: 27,
    set: 2,
    label: 'Act hands',
    purpose: 'Paragraph block motion',
    layout: 'prose',
    lines: [
      'Act because you have hands, that bring to life your every command. With them you can create and build, and bring to life what once was stilled.',
    ],
    lineStyles: [{ face: 19, treatments: ['upper', 'medium'] }],
  },
  { id: 28, set: 2, label: 'Liberation', purpose: 'Single medium word', lines: ['Liberation'], lineStyles: [{ face: 12, treatments: ['medium'] }] },
  { id: 29, set: 2, label: 'Discipline stack', purpose: 'Four-line uppercase stack', lines: ['Discipline', 'above', 'Motivation', 'Always'], lineStyles: Array.from({ length: 4 }, () => ({ treatments: ['upper'] })) },
]
