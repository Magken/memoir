/**
 * Write a finished ProjectSim package under public/3d/kps, keeping relative paths.
 */
import fs from 'node:fs'
import path from 'node:path'
import type { KpsFile } from './projectsimClient.ts'

export function safeAssetRelative(assetId: string, relativePath: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(assetId)) {
    throw new Error('Asset id has unexpected characters')
  }
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized.includes('..') || normalized.includes('\0')) {
    throw new Error('Asset file path escapes the package')
  }
  return normalized
}

export function viewerGlb(files: KpsFile[]): KpsFile | undefined {
  return files.find((file) => file.kind === 'glb') ?? files.find((file) => file.kind === 'simready_glb')
}

export type LocalKpsPackage = {
  assetId: string
  glbPublicPath: string
  files: { publicPath: string }[]
}

/** Packages already written under public/3d/kps. This does not call ProjectSim. */
export function listLocalKpsPackages(destRoot: string): LocalKpsPackage[] {
  if (!fs.existsSync(destRoot)) return []
  const packages: LocalKpsPackage[] = []
  for (const entry of fs.readdirSync(destRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^[A-Za-z0-9_-]+$/.test(entry.name)) continue
    const folder = path.resolve(destRoot, entry.name)
    const relatives: string[] = []
    collectPackageFiles(folder, folder, relatives)
    const glbs = relatives.filter((file) => file.toLowerCase().endsWith('.glb'))
    const preferred = glbs.find((file) => !file.toLowerCase().includes('simready')) ?? glbs[0]
    if (!preferred) continue
    packages.push({
      assetId: entry.name,
      glbPublicPath: `/3d/kps/${entry.name}/${preferred}`,
      files: relatives.map((file) => ({ publicPath: `/3d/kps/${entry.name}/${file}` })),
    })
  }
  return packages
}

function collectPackageFiles(root: string, dir: string, out: string[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.resolve(dir, entry.name)
    const relative = path.relative(root, absolute)
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) continue
    if (entry.isDirectory()) collectPackageFiles(root, absolute, out)
    else if (entry.isFile()) out.push(relative.split(path.sep).join('/'))
  }
}

export async function saveKpsPackage(options: {
  assetId: string
  files: KpsFile[]
  destRoot: string
  fetchImpl: (url: string) => Promise<Response>
}): Promise<{ glbPublicPath: string | null; written: string[] }> {
  const written: string[] = []
  for (const file of options.files) {
    const relative = safeAssetRelative(options.assetId, file.path)
    const root = path.resolve(options.destRoot, options.assetId)
    const destination = path.resolve(root, relative)
    const fromRoot = path.relative(root, destination)
    if (fromRoot.startsWith('..') || path.isAbsolute(fromRoot)) {
      throw new Error('Asset file path escapes the package')
    }
    const response = await options.fetchImpl(file.url)
    if (!response.ok) throw new Error(`Download failed for ${file.kind}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.writeFileSync(destination, bytes)
    written.push(destination)
  }
  const glb = viewerGlb(options.files)
  const glbPublicPath = glb
    ? `/3d/kps/${options.assetId}/${safeAssetRelative(options.assetId, glb.path)}`
    : null
  return { glbPublicPath, written }
}
