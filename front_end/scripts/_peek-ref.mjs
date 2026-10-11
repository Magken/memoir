import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const dir = path.join(root, 'item-reference/front-end/background-types-2')

for (const name of ['index.html', 'script.js', 'styles.css']) {
  const fp = path.join(dir, name)
  const t = fs.readFileSync(fp, 'utf8')
  console.log(`\n=== ${name} (${t.length} bytes) ===`)
  if (name === 'index.html') {
    const canvas = t.indexOf('canvas')
    const frag = t.indexOf('fragShader')
    console.log('canvas at', canvas, 'fragShader at', frag)
    console.log(t.slice(0, 2500))
    if (frag >= 0) {
      const end = t.indexOf('</script>', frag)
      console.log('\n--- frag shader tail ---')
      console.log(t.slice(Math.max(frag, end - 600), end + 20))
    }
  } else if (name === 'script.js') {
    console.log(t.slice(0, 4000))
  } else {
    console.log('lines', t.split('\n').length)
  }
}
