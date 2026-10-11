/**
 * Creation / sitting / marking pipelines — relative modules must exist,
 * named imports must be exported, and call/JSX names must be in scope.
 * Run: npx tsx front_end/src/lib/interviewRunApi/interviewLoadBindings.unit.mjs
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, extname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const here = dirname(fileURLToPath(import.meta.url))
const srcRoot = join(here, '../..')

const LOAD_FILES = [
  'pages/InterviewPage.tsx',
  'components/InterviewLanding.tsx',
  'components/InterviewLandingDeclaration.tsx',
  'components/InterviewLandingRequirements.tsx',
  'components/InterviewGateScene.tsx',
  'components/InterviewGateToolLive.tsx',
  'components/InterviewTalkChatSpace.tsx',
  'components/InterviewTalkPageChat.tsx',
  'components/InterviewAssistPeelChat.tsx',
  'components/InterviewHardTimer.tsx',
  'components/InterviewReferencedWorkModal.tsx',
  'components/InterviewFinishedScene.tsx',
  'lib/appStage/appStageConfig.ts',
]

const GLOBALS = new Set([
  'undefined',
  'NaN',
  'Infinity',
  'console',
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'localStorage',
  'sessionStorage',
  'fetch',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'queueMicrotask',
  'structuredClone',
  'atob',
  'btoa',
  'crypto',
  'performance',
  'JSON',
  'Math',
  'Date',
  'RegExp',
  'Uint8Array',
  'Uint16Array',
  'Uint32Array',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Float32Array',
  'Float64Array',
  'ArrayBuffer',
  'DataView',
  'Object',
  'Array',
  'Number',
  'String',
  'Boolean',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Promise',
  'Proxy',
  'Reflect',
  'Symbol',
  'BigInt',
  'Error',
  'TypeError',
  'RangeError',
  'URIError',
  'URL',
  'URLSearchParams',
  'Blob',
  'File',
  'FileReader',
  'FormData',
  'Headers',
  'Request',
  'Response',
  'AbortController',
  'AbortSignal',
  'TextEncoder',
  'TextDecoder',
  'Image',
  'Audio',
  'Worker',
  'ResizeObserver',
  'MutationObserver',
  'IntersectionObserver',
  'KeyboardEvent',
  'PointerEvent',
  'MouseEvent',
  'Event',
  'CustomEvent',
  'HTMLElement',
  'Element',
  'Node',
  'Intl',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'encodeURIComponent',
  'decodeURIComponent',
  'encodeURI',
  'decodeURI',
  'globalThis',
  'self',
  'confirm',
  'alert',
  'prompt',
  'getComputedStyle',
  'matchMedia',
  'reportError',
  'queueMicrotask',
  'AggregateError',
  'DOMParser',
  'screen',
  'visualViewport',
  'BroadcastChannel',
  'MessageChannel',
  'MessagePort',
  'CSS',
  'React',
  'jsx',
  'jsxs',
  'Fragment',
  'Record',
  'Partial',
  'Required',
  'Readonly',
  'Pick',
  'Omit',
  'ReturnType',
  'Parameters',
  'Awaited',
  'NonNullable',
  'Extract',
  'Exclude',
  'ReadonlyArray',
  'Iterable',
  'Iterator',
  'AsyncIterable',
  'Capitalize',
  'Uppercase',
  'Lowercase',
  'Uncapitalize',
  'RTCPeerConnection',
  'Deno',
  'EdgeRuntime',
  'ReadableStream',
  'WritableStream',
  'TransformStream',
])

const KEYWORD_TYPES = new Set(['const', 'typeof', 'infer', 'keyof', 'unique', 'asserts', 'is', 'new', 'this', 'any', 'never', 'unknown', 'void', 'object'])

const LIB_TYPE_PREFIX =
  /^(HTML|SVG|CSS|DOM|Web|RTC|IDB|GPU|XR|USB|HID|MIDI|Audio|Video|Canvas|Media|Permission|Scroll|WakeLock|Clipboard|BeforeUnload|Message|Pointer|Mouse|Keyboard|Touch|Wheel|Focus|Input|Composition|Drag|Animation|Transition|Device|Gamepad|Speech|Readable|Writable|Transform|Offscreen|Image|Idle|Push|Notification|Broadcast|ServiceWorker|Worklet|SharedWorker|FileSystem|Storage|Lock|Barcode|Bluetooth|Serial|Presentation|RemotePlayback|Payment|Credential|Authenticator|PublicKey|Subtle|Crypto|Performance|Reporting|Resize|Mutation|Intersection|Geolocation|Navigator|Window|Document|Element|Node|Event|Range|Selection|Text|Comment|Attr|NamedNode|DOMToken|DOMRect|DOMPoint|DOMMatrix|CSSStyle|RegExp|Uint|Int\d|Float|BigInt|ArrayBuffer|DataView|SharedArrayBuffer|Atomics|WeakRef|Finalization|Promise|Readonly|Partial|Required|Pick|Omit|Record|Extract|Exclude|NonNullable|Awaited|ReturnType|Parameters|Constructor|InstanceType|ThisType|Uppercase|Lowercase|Capitalize|Uncapitalize|NoInfer)/

function isLibTypeName(name) {
  return KEYWORD_TYPES.has(name) || GLOBALS.has(name) || LIB_TYPE_PREFIX.test(name)
}

function isJsonSpec(spec) {
  return spec.split('?')[0].endsWith('.json')
}

function isPackageSpec(spec) {
  if (!spec) return true
  if (isJsonSpec(spec)) return false
  if (spec.startsWith('.') || spec.startsWith('/')) return false
  if (spec.startsWith('front_end/') || spec.startsWith('back_end/')) return false
  return true
}

const repoRoot = join(srcRoot, '../..')

function relRepo(abs) {
  return abs.replace(/\\/g, '/').replace(repoRoot.replace(/\\/g, '/') + '/', '')
}

function walkTsFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc
  const st = statSync(dir)
  if (st.isFile()) {
    if (/\.(ts|tsx)$/.test(dir) && !dir.includes('.unit.') && !dir.endsWith('.d.ts')) acc.push(dir)
    return acc
  }
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'examples' || name.startsWith('.')) continue
    const p = join(dir, name)
    const pst = statSync(p)
    if (pst.isDirectory()) walkTsFiles(p, acc)
    else if (/\.(ts|tsx)$/.test(name) && !name.includes('.unit.') && !name.endsWith('.d.ts')) acc.push(p)
  }
  return acc
}

function collectModuleSpecs(sf) {
  const specs = []
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) && !ts.isExportDeclaration(stmt)) continue
    if (!stmt.moduleSpecifier || !ts.isStringLiteral(stmt.moduleSpecifier)) continue
    specs.push(stmt.moduleSpecifier.text)
  }
  return specs
}

const exportCache = new Map()

function parseFile(absPath) {
  const text = readFileSync(absPath, 'utf8')
  const kind = absPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  return ts.createSourceFile(absPath, text, ts.ScriptTarget.Latest, true, kind)
}

function addBindingName(name, into) {
  if (!name) return
  if (ts.isIdentifier(name)) {
    into.add(name.text)
    return
  }
  if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const el of name.elements) {
      if (ts.isOmittedExpression(el)) continue
      if (ts.isBindingElement(el)) addBindingName(el.name, into)
    }
  }
}

function resolveFrom(fromFile, spec) {
  if (!spec.startsWith('.') && !spec.startsWith('/') && !spec.startsWith('..')) {
    if (spec.startsWith('front_end/') || spec.startsWith('back_end/')) {
      return resolveExisting(join(srcRoot, '../..', spec))
    }
    return null
  }
  const base = isAbsolute(spec) ? spec : join(dirname(fromFile), spec)
  return resolveExisting(base)
}

function resolveExisting(base) {
  const stripped = base.replace(/\\/g, '/')
  const candidates = [base]
  if (!extname(base)) {
    candidates.push(`${base}.ts`, `${base}.tsx`, `${base}.d.ts`, join(base, 'index.ts'), join(base, 'index.tsx'))
  }
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c
  }
  if (stripped.endsWith('.ts') && existsSync(base)) return base
  return null
}

function collectExports(absPath, visiting = new Set()) {
  const resolved = resolveExisting(absPath)
  if (!resolved) return new Set()
  if (exportCache.has(resolved) && visiting.size === 0) return exportCache.get(resolved)
  if (visiting.has(resolved)) return new Set()
  visiting.add(resolved)
  const sf = parseFile(resolved)
  const names = new Set()
  for (const stmt of sf.statements) {
    if (ts.isExportDeclaration(stmt)) {
      const spec = stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)
        ? stmt.moduleSpecifier.text
        : null
      if (spec) {
        const target = resolveFrom(resolved, spec)
        if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
          for (const el of stmt.exportClause.elements) names.add(el.name.text)
        } else if (stmt.exportClause && ts.isNamespaceExport(stmt.exportClause)) {
          names.add(stmt.exportClause.name.text)
        } else if (target) {
          for (const n of collectExports(target, visiting)) names.add(n)
        }
      } else if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
        for (const el of stmt.exportClause.elements) names.add(el.name.text)
      }
      continue
    }
    if (ts.isExportAssignment(stmt)) names.add('default')
    const exported = Boolean(stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
    if (!exported) continue
    if ((ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt) || ts.isEnumDeclaration(stmt)) && stmt.name) {
      names.add(stmt.name.text)
    } else if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) addBindingName(d.name, names)
    } else if (ts.isTypeAliasDeclaration(stmt) || ts.isInterfaceDeclaration(stmt) || ts.isModuleDeclaration(stmt)) {
      if (stmt.name && ts.isIdentifier(stmt.name)) names.add(stmt.name.text)
    }
  }
  if (visiting.size === 1) exportCache.set(resolved, names)
  visiting.delete(resolved)
  return names
}

function collectImportedNames(sf) {
  /** @type {{ name: string, spec: string, isType: boolean }[]} */
  const rows = []
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !stmt.importClause) continue
    if (!stmt.moduleSpecifier || !ts.isStringLiteral(stmt.moduleSpecifier)) continue
    const spec = stmt.moduleSpecifier.text
    const clause = stmt.importClause
    const clauseType = Boolean(clause.isTypeOnly)
    if (clause.name) rows.push({ name: clause.name.text, spec, isType: clauseType })
    const nb = clause.namedBindings
    if (nb && ts.isNamespaceImport(nb)) {
      rows.push({ name: nb.name.text, spec, isType: clauseType, namespace: true })
    }
    if (nb && ts.isNamedImports(nb)) {
      for (const el of nb.elements) {
        rows.push({
          name: el.name.text,
          imported: (el.propertyName ?? el.name).text,
          spec,
          isType: clauseType || Boolean(el.isTypeOnly),
        })
      }
    }
  }
  return rows
}

function collectLocalBindings(sf) {
  const names = new Set(GLOBALS)
  function visit(node) {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause
      if (!clause) return
      if (clause.name) names.add(clause.name.text)
      const nb = clause.namedBindings
      if (nb && ts.isNamespaceImport(nb)) names.add(nb.name.text)
      if (nb && ts.isNamedImports(nb)) {
        for (const el of nb.elements) names.add(el.name.text)
      }
      return
    }
    if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isEnumDeclaration(node)) && node.name) {
      names.add(node.name.text)
    }
    if (ts.isVariableDeclaration(node)) addBindingName(node.name, names)
    if (ts.isParameter(node)) addBindingName(node.name, names)
    if (ts.isCatchClause(node) && node.variableDeclaration) addBindingName(node.variableDeclaration.name, names)
    if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) names.add(node.name.text)
    if (ts.isTypeParameterDeclaration(node)) names.add(node.name.text)
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return names
}

function leftmostIdentifier(expr) {
  let cur = expr
  while (cur) {
    if (ts.isIdentifier(cur)) return cur
    if (ts.isPropertyAccessExpression(cur) || ts.isElementAccessExpression(cur) || ts.isNonNullExpression(cur) || ts.isParenthesizedExpression(cur)) {
      cur = cur.expression
      continue
    }
    if (ts.isCallExpression(cur)) {
      cur = cur.expression
      continue
    }
    return null
  }
  return null
}

function collectUnboundNames(sf, bindings) {
  const missing = []
  function visit(node) {
    if (ts.isCallExpression(node) || ts.isNewExpression(node) || ts.isTaggedTemplateExpression(node)) {
      const id = leftmostIdentifier(ts.isTaggedTemplateExpression(node) ? node.tag : node.expression)
      if (id && !bindings.has(id.text)) missing.push(id.text)
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName
      if (ts.isIdentifier(tag) && tag.text !== tag.text.toLowerCase() && !bindings.has(tag.text)) {
        missing.push(tag.text)
      }
    }
    if (
      ts.isTypeReferenceNode(node) &&
      ts.isIdentifier(node.typeName) &&
      !bindings.has(node.typeName.text) &&
      !isLibTypeName(node.typeName.text)
    ) {
      missing.push(node.typeName.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return [...new Set(missing)]
}

function checkNamedReexports(absPath, rel) {
  const sf = parseFile(absPath)
  const hits = []
  for (const stmt of sf.statements) {
    if (!ts.isExportDeclaration(stmt) || !stmt.moduleSpecifier || !ts.isStringLiteral(stmt.moduleSpecifier)) continue
    if (!stmt.exportClause || !ts.isNamedExports(stmt.exportClause)) continue
    if (isJsonSpec(stmt.moduleSpecifier.text) || isPackageSpec(stmt.moduleSpecifier.text)) continue
    const target = resolveFrom(absPath, stmt.moduleSpecifier.text)
    if (!target) continue
    const exported = collectExports(target)
    for (const el of stmt.exportClause.elements) {
      const fromName = (el.propertyName ?? el.name).text
      if (!exported.has(fromName)) {
        hits.push(`${rel}: re-exports '${el.name.text}' but ${stmt.moduleSpecifier.text} does not export '${fromName}'`)
      }
    }
  }
  return hits
}

function sittingPolicyFiles() {
  const dir = join(srcRoot, 'lib/interviewRunApi/sittingPolicy')
  return readdirSync(dir)
    .filter((n) => /\.(ts|tsx)$/.test(n) && !n.endsWith('.unit.mjs'))
    .map((n) => join('lib/interviewRunApi/sittingPolicy', n))
}

function interviewRunApiFiles() {
  const dir = join(srcRoot, 'lib/interviewRunApi')
  return readdirSync(dir)
    .filter((n) => /\.(ts|tsx)$/.test(n) && !n.includes('.unit.'))
    .map((n) => join('lib/interviewRunApi', n))
}

{
  const unbound = collectUnboundNames(
    ts.createSourceFile(
      'neg.tsx',
      `export function f(p: string) { return isPackedCodingPath(p, 'ts') }`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    ),
    collectLocalBindings(
      ts.createSourceFile(
        'neg.tsx',
        `export function f(p: string) { return isPackedCodingPath(p, 'ts') }`,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      ),
    ),
  )
  assert.deepEqual(unbound, ['isPackedCodingPath'], 'negative: unbound helper is reported')
}

{
  const src = `export function f(brief: Creator2BriefDocument) { return brief }`
  const sf = ts.createSourceFile('neg-type.ts', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  assert.deepEqual(
    collectUnboundNames(sf, collectLocalBindings(sf)),
    ['Creator2BriefDocument'],
    'negative: unbound type name is reported',
  )
}

{
  const src = `import { isPackedCodingPath } from './x'\nexport function f(p: string) { return isPackedCodingPath(p, 'ts') }`
  const sf = ts.createSourceFile('pos.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  assert.deepEqual(collectUnboundNames(sf, collectLocalBindings(sf)), [], 'imported helper is in scope')
}

const briefIndex = join(srcRoot, 'lib/interviewBrief/index.ts')
const briefExports = collectExports(briefIndex)
assert.equal(briefExports.has('isPackedCodingPath'), true, 'interviewBrief barrel exports isPackedCodingPath')
assert.equal(briefExports.has('definitelyNotARealExport'), false, 'negative: unknown name is not an export')

const runApiIndex = join(srcRoot, 'lib/interviewRunApi/index.ts')
const runExports = collectExports(runApiIndex)
assert.equal(runExports.has('runHydrateLanding'), true, 'interviewRunApi barrel exports hydrate')
assert.equal(runExports.has('definitelyNotARealExport'), false)
assert.equal(runExports.has('OverviewScoreChip'), false, 'negative: stale barrel names stay off the index')

const PIPELINE_DIRS = [
  'front_end/src/lib/interviewBrief',
  'front_end/src/lib/interviewEditApi',
  'front_end/src/lib/interviewEnrichApi',
  'front_end/src/lib/interviewRunApi',
  'back_end/supabase/functions/interview-brief-edit',
  'back_end/supabase/functions/interview-brief-enrich',
  'back_end/supabase/functions/_shared/interview-brief-enricher',
  'back_end/supabase/functions/interview-copilot-edit',
  'back_end/supabase/functions/interview-talk-turn',
  'back_end/supabase/functions/interview-stage-assist',
  'back_end/supabase/functions/interview-day-memory',
  'back_end/supabase/functions/_shared/interview-sitting-peel',
  'back_end/supabase/functions/_shared/interview-assessors',
  'back_end/supabase/functions/interview-tool-assess',
  'back_end/supabase/functions/interview-assessor-aid',
  'back_end/supabase/functions/interview-session-probe',
]

function pipelineFiles() {
  const files = new Set()
  for (const rel of LOAD_FILES) files.add(join(srcRoot, rel))
  files.add(join(srcRoot, 'pages/InterviewPage.tsx'))
  for (const dir of PIPELINE_DIRS) {
    for (const f of walkTsFiles(join(repoRoot, dir))) files.add(f)
  }
  for (const f of walkTsFiles(join(srcRoot, 'components'))) {
    const base = basename(f)
    if (/^Interview/.test(base) || base === 'DashboardChatSpace.tsx') files.add(f)
  }
  return [...files]
}

{
  const ghost = join(srcRoot, '__missing_bind_probe__.ts')
  assert.equal(resolveExisting(ghost), null, 'negative: missing file does not resolve')
}

const targets = pipelineFiles()
assert.ok(targets.length > 80, 'pipeline walk covers creation, sitting, and marking')
const problems = []

for (const abs of targets) {
  const rel = relRepo(abs)
  if (!existsSync(abs)) {
    problems.push(`${rel}: file missing`)
    continue
  }
  const sf = parseFile(abs)
  for (const spec of collectModuleSpecs(sf)) {
    if (isPackageSpec(spec) || isJsonSpec(spec)) continue
    const target = resolveFrom(abs, spec)
    if (!target) problems.push(`${rel}: cannot find module '${spec}'`)
  }
  for (const row of collectImportedNames(sf)) {
    if (isJsonSpec(row.spec) || isPackageSpec(row.spec) || row.namespace) continue
    const target = resolveFrom(abs, row.spec)
    if (!target) continue
    const exported = collectExports(target)
    if (!exported.has(row.imported ?? row.name) && (row.imported ?? row.name) !== 'default') {
      problems.push(`${rel}: '${row.imported ?? row.name}' is not exported from ${row.spec}`)
    }
  }
  problems.push(...checkNamedReexports(abs, rel))
  const missing = collectUnboundNames(sf, collectLocalBindings(sf))
  for (const name of missing) {
    problems.push(`${rel}: unbound ${name}`)
  }
}

assert.equal(
  problems.join('\n'),
  '',
  problems.length ? `import/export mismatches:\n${problems.join('\n')}` : 'ok',
)

const page = readFileSync(join(srcRoot, 'pages/InterviewPage.tsx'), 'utf8')
assert.match(page, /isPackedCodingPath,/, 'InterviewPage imports packed-src helper')
assert.match(page, /src\.filter\(\(p\) => isPackedCodingPath\(p, lang\)\)/, 'InterviewPage uses the imported helper')

console.log('interviewLoadBindings.unit.mjs: ok')
