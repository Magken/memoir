import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const names = {
  1: ['Vertical parallax', 'Y-slide with inner parallax'],
  2: ['Skew scale rotate', 'ScaleY + rotation exit'],
  3: ['Zoom crossfade', 'Scale zoom between slides'],
  4: ['Scale cover', 'Incoming covers at scale 0.9'],
  5: ['Rotate scale', 'Rotate and scale swap'],
  6: ['Stretch X wipe', 'Horizontal scaleX stretch'],
  7: ['Brightness pop', 'Scale + brightness filter'],
  8: ['Contrast stretch', 'Scale + contrast/saturate'],
  9: ['Clip peel', 'Clip-path peel transition'],
  10: ['Filter morph', 'Filter + scale morph'],
  11: ['Deco curtain', 'Single deco wipe between slides'],
  12: ['Triple deco', 'Three deco bands'],
  13: ['3D flip X', 'perspective rotationX'],
  14: ['ScaleX wipe', 'Horizontal scaleX reveal'],
  15: ['Dual deco flash', 'Two deco bands + scale'],
  16: ['Multi deco cascade', 'Six deco panels cascade'],
}
const deco = { 11: 'single', 12: 'stack12', 15: 'dual15', 16: 'multi16' }

function extractNavigateBody(src) {
  const nav = src.indexOf('navigate(direction)')
  const brace = src.indexOf('{', nav)
  let depth = 0
  let end = brace
  for (let i = brace; i < src.length; i++) {
    if (src[i] === '{') depth++
    if (src[i] === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  return src.slice(brace + 1, end)
}

let out = `import type { gsap as GsapNS } from 'gsap'
import type { SlideshowFxId, SlideshowNavigateCtx } from './slideshowTypes'

type Gsap = typeof GsapNS

`

for (let n = 1; n <= 16; n++) {
  const src = fs.readFileSync(
    path.join(root, `item-reference/front-end/slideshow-animations/js/demo${n}/slideshow.js`),
    'utf8',
  )
  let body = extractNavigateBody(src)
  body = body.replace(/this\.DOM\./g, 'ctx.')
  body = body.replace(/this\.current/g, 'ctx.current')
  body = body.replace(/this\.slidesTotal/g, 'ctx.slidesTotal')
  body = body.replace(/this\.isAnimating/g, 'ctx.isAnimating')
  body = body.replace(/this\.tl/g, 'ctx.tl')
  body = body.replace(/\bNEXT\b/g, '1')
  body = body.replace(/\bPREV\b/g, '-1')
  // perspective setup in constructor for demo13 — inject at start if needed
  if (n === 13 && src.includes('perspective')) {
    body = 'gsap.set(ctx.el, { perspective: 1000 });\n' + body
  }

  out += `export function navigateDemo${n}(gsap: Gsap, ctx: SlideshowNavigateCtx, direction: number) {\n`
  out += body
    .split('\n')
    .map((l) => '  ' + l)
    .join('\n')
  out += '\n}\n\n'
}

out += 'export const SLIDESHOW_NAVIGATORS: Record<SlideshowFxId, typeof navigateDemo1> = {\n'
for (let n = 1; n <= 16; n++) out += `  demo${n}: navigateDemo${n},\n`
out += '}\n\n'

out += 'export const SLIDESHOW_FX_META = [\n'
for (let n = 1; n <= 16; n++) {
  const [name, purpose] = names[n]
  const d = deco[n] || 'none'
  const mods = n === 2 ? "['demo2']" : '[]'
  out += `  { id: 'demo${n}' as const, name: '${name}', purpose: '${purpose}', deco: '${d}' as const, hostModifiers: ${mods}, stack: 'gsap.timeline · demo${n}' },\n`
}
out += '] as const\n'

const outPath = path.join(root, 'front_end/src/lib/galleries/slideshowNavigators.ts')
fs.writeFileSync(outPath, out)
console.log('wrote', outPath, 'bytes', out.length)
// sanity: demo1 should contain yPercent
const check = fs.readFileSync(outPath, 'utf8')
console.log('demo1 has yPercent', check.includes('yPercent'))
console.log('demo1 function length', check.indexOf('export function navigateDemo2') - check.indexOf('export function navigateDemo1'))
