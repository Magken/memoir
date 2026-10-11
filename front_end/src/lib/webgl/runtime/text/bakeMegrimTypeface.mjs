/**
 * Convert Fontsource Megrim (latin 400 woff) to three.js typeface JSON.
 * Run: node front_end/src/lib/webgl/runtime/text/bakeMegrimTypeface.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '../../../../../../')
const src = path.join(ROOT, 'front_end/node_modules/@fontsource/megrim/files/megrim-latin-400-normal.woff')
const dest = path.join(ROOT, 'front_end/public/fonts/megrim.typeface.json')

const buf = fs.readFileSync(src)
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
const json = new TTFLoader().parse(ab)
const glyphs = json?.glyphs ?? {}
for (const letter of ['G', 'R', 'A', 'S']) {
  if (!glyphs[letter]) {
    throw new Error(`Megrim typeface missing glyph ${letter}`)
  }
}
json.familyName = 'Megrim'
fs.mkdirSync(path.dirname(dest), { recursive: true })
fs.writeFileSync(dest, `${JSON.stringify(json)}\n`)
console.log(
  `wrote ${path.relative(ROOT, dest)} — ${Object.keys(glyphs).length} glyphs, ${fs.statSync(dest).size} bytes`,
)
