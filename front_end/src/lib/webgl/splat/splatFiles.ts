/**
 * Node side of the splat library. Lists splats under public/3d, saves imports to
 * public/3d/splats, and keeps every splat's views in public/3d/splats/views.json.
 */
import fs from 'node:fs'
import path from 'node:path'
import { readViewsDoc, safeSplatName, splatFormatOf, type SplatFile, type SplatViewsDoc } from './splatViews.ts'

const SCAN_DIRS = ['3d', '3d/splats']
const IMPORT_DIR = '3d/splats'
const VIEWS_FILE = '3d/splats/views.json'

export function listSplatFiles(publicRoot: string): SplatFile[] {
  const files: SplatFile[] = []
  for (const dir of SCAN_DIRS) {
    const abs = path.join(publicRoot, dir)
    if (!fs.existsSync(abs)) continue
    for (const name of fs.readdirSync(abs)) {
      const format = splatFormatOf(name)
      if (!format) continue
      const stat = fs.statSync(path.join(abs, name))
      if (!stat.isFile()) continue
      files.push({ path: `/${dir}/${name}`, name, format, bytes: stat.size })
    }
  }
  return files.sort((a, b) => a.name.localeCompare(b.name))
}

export function saveSplatImport(publicRoot: string, name: string, bytes: Buffer): SplatFile {
  const safe = safeSplatName(name)
  if (!safe) throw Object.assign(new Error('Only .spz or .ply files can be imported'), { status: 400 })
  if (bytes.length === 0) throw Object.assign(new Error('The file is empty'), { status: 400 })
  const dir = path.join(publicRoot, IMPORT_DIR)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, safe), bytes)
  return { path: `/${IMPORT_DIR}/${safe}`, name: safe, format: splatFormatOf(safe)!, bytes: bytes.length }
}

export function readSplatViews(publicRoot: string): SplatViewsDoc {
  const file = path.join(publicRoot, VIEWS_FILE)
  if (!fs.existsSync(file)) return {}
  try {
    return readViewsDoc(JSON.parse(fs.readFileSync(file, 'utf8')) as unknown)
  } catch {
    return {}
  }
}

export function writeSplatViews(publicRoot: string, doc: unknown): SplatViewsDoc {
  const clean = readViewsDoc(doc)
  const file = path.join(publicRoot, VIEWS_FILE)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(clean, null, 2)}\n`)
  return clean
}
