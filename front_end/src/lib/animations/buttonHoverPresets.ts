/** Codrops Button Hover Styles — theme port presets */

export const BUTTON_HOVER_PRESETS = [
  { id: 'pan', label: 'Pan', purpose: 'Fill slides up; mix-blend label', markup: 'simple' as const, sample: 'Upload' },
  { id: 'hyperion', label: 'Hyperion', purpose: 'Vertical wipe with nested span', markup: 'doubleSpan' as const, sample: 'New page' },
  { id: 'mimas', label: 'Mimas', purpose: 'Circular fill expands from center', markup: 'simple' as const, sample: 'Render' },
  { id: 'atlas', label: 'Atlas', purpose: 'Marquee takeover on hover', markup: 'marquee' as const, sample: 'Subscribe' },
  { id: 'kari', label: 'Kari', purpose: 'Marquee with vertical slide', markup: 'marquee' as const, sample: 'Send Love' },
  { id: 'marquee-menu', label: 'Marquee Menu', purpose: 'Oversized underlined title + image flags; different marquee takeover', markup: 'textFlags' as const, sample: 'Discover talent' },
  { id: 'pandora', label: 'Pandora', purpose: 'Label slides; fill rises', markup: 'simple' as const, sample: 'Activate Card' },
  { id: 'janus', label: 'Janus', purpose: 'Split door open reveal', markup: 'simple' as const, sample: 'Reshape' },
  { id: 'anthe', label: 'Anthe', purpose: 'Diagonal slice wipe', markup: 'simple' as const, sample: 'Initialize' },
  { id: 'pallene', label: 'Pallene', purpose: 'Inset border expands', markup: 'plain' as const, sample: 'Hide Details' },
  { id: 'telesto', label: 'Telesto', purpose: 'Dual edge wipe + nested span', markup: 'doubleSpan' as const, sample: 'Verify' },
  { id: 'calypso', label: 'Calypso', purpose: 'Corner folds peel open', markup: 'simple' as const, sample: 'Export File' },
  { id: 'skoll', label: 'Skoll', purpose: 'Left panel wipe', markup: 'doubleSpan' as const, sample: 'Add' },
  { id: 'greip', label: 'Greip', purpose: 'Right panel wipe', markup: 'doubleSpan' as const, sample: 'Next' },
  { id: 'dione', label: 'Dione', purpose: 'Top/bottom bars meet', markup: 'simple' as const, sample: 'Resize' },
  { id: 'helene', label: 'Helene', purpose: 'Skewed fill slide', markup: 'doubleSpan' as const, sample: 'Sell' },
  { id: 'rhea', label: 'Rhea', purpose: 'Circle scales behind label', markup: 'simple' as const, sample: 'Delete' },
  { id: 'narvi', label: 'Narvi', purpose: '3D tilt flip of label', markup: 'doubleSpan' as const, sample: 'Open chat' },
  { id: 'hati', label: 'Hati', purpose: 'Dashed border chase', markup: 'simple' as const, sample: 'Activate' },
  { id: 'bestia', label: 'Bestia', purpose: 'Layered bg slide', markup: 'bestia' as const, sample: 'Locate' },
  { id: 'surtur', label: 'Surtur', purpose: 'Circular text + eye blink', markup: 'surtur' as const, sample: 'Projects' },
  { id: 'fenrir', label: 'Fenrir', purpose: 'Progress ring stroke draw', markup: 'fenrir' as const, sample: 'Go' },
] as const

export type ButtonHoverPresetId = (typeof BUTTON_HOVER_PRESETS)[number]['id']
export type ButtonHoverMarkup = (typeof BUTTON_HOVER_PRESETS)[number]['markup']
