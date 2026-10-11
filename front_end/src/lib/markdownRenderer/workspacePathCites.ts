/** Workspace path cites in peel markdown — `src/…` and named files like `solve.ts`. */
export const WORKSPACE_PATH_CITE_RE =
  /\b(?:src\/[\w./-]+|[\w./-]*solve\.\w+|[\w-]+\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt))\b/g

export function isWorkspacePathCite(token: string): boolean {
  const t = String(token ?? '').trim()
  if (!t) return false
  const re = new RegExp(`^${WORKSPACE_PATH_CITE_RE.source}$`)
  return re.test(t)
}

export function splitWorkspacePathCites(text: string): Array<{ t: string; path?: string }> {
  const body = String(text ?? '')
  const re = new RegExp(WORKSPACE_PATH_CITE_RE.source, 'g')
  const out: Array<{ t: string; path?: string }> = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) {
    if (m.index > last) out.push({ t: body.slice(last, m.index) })
    out.push({ t: m[0], path: m[0] })
    last = m.index + m[0].length
  }
  if (last < body.length) out.push({ t: body.slice(last) })
  if (out.length === 0) out.push({ t: body })
  return out
}
