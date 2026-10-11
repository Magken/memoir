/**
 * Reel sample series. Frame srcs are local SVG files.
 */

export type LclReelFrame = {
  id: string
  label: string
  src: string
  caption: string
  kind: 'image' | 'video'
  videoSrc?: string
}

export type LclReelSeries = {
  id: string
  name: string
  frames: LclReelFrame[]
}

function frame(file: string): string {
  return new URL(`../../assets/lcl/reel/${file}`, import.meta.url).href
}

export const LCL_REEL_SERIES: readonly LclReelSeries[] = [
  {
    id: 'harbor-night',
    name: 'Harbor at night',
    frames: [
      { id: 'h1', label: 'Frame 01', src: frame('harbor-01.svg'), caption: 'The first quay light.', kind: 'image' },
      { id: 'h2', label: 'Frame 02', src: frame('harbor-02.svg'), caption: 'A second lamp along the wall.', kind: 'image' },
      { id: 'h3', label: 'Frame 03', src: frame('harbor-03.svg'), caption: 'The channel marker.', kind: 'video' },
      { id: 'h4', label: 'Frame 04', src: frame('harbor-04.svg'), caption: 'The inner basin.', kind: 'image' },
      { id: 'h5', label: 'Frame 05', src: frame('harbor-05.svg'), caption: 'Last light on the spit.', kind: 'image' },
    ],
  },
  {
    id: 'reef-day',
    name: 'Reef by day',
    frames: [
      { id: 'r1', label: 'Frame 01', src: frame('reef-01.svg'), caption: 'The reef at slack water.', kind: 'image' },
      { id: 'r2', label: 'Frame 02', src: frame('reef-02.svg'), caption: 'A cut through the kelp.', kind: 'image' },
      { id: 'r3', label: 'Frame 03', src: frame('reef-03.svg'), caption: 'The far marker.', kind: 'image' },
    ],
  },
]
