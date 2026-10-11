/**
 * PROJECT_INDEX matches folders under projects/.
 * Run: npx tsx front_end/src/lib/projectsCatalog/catalog.unit.mjs
 */
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PROJECT_INDEX } from './catalog.ts'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '../../../..')
const projectsRoot = join(repoRoot, 'projects')

const folders = readdirSync(projectsRoot).filter((name) => {
  if (name.startsWith('.')) return false
  return statSync(join(projectsRoot, name)).isDirectory()
})

const slugs = PROJECT_INDEX.map((entry) => entry.slug).sort()
assert.deepEqual(slugs, [...folders].sort())

for (const entry of PROJECT_INDEX) {
  assert.equal(entry.folder, `projects/${entry.slug}/`)
  assert.equal(folders.includes(entry.slug), true, entry.slug)
}

const readme = readFileSync(join(projectsRoot, 'README.md'), 'utf8')
const memoirIndex = readFileSync(join(repoRoot, 'project_indexer/projects/INDEX.md'), 'utf8')
for (const slug of folders) {
  assert.equal(readme.includes(`[${slug}]`), true, `projects/README.md names ${slug}`)
  assert.equal(memoirIndex.includes(`${slug}.md`), true, `project_indexer/projects/INDEX.md names ${slug}`)
  assert.equal(
    existsSync(join(projectsRoot, slug, 'CHANGELOG.md')),
    true,
    `${slug} has CHANGELOG.md`,
  )
}

const conventions = readFileSync(join(repoRoot, 'project_indexer/projects/CONVENTIONS.md'), 'utf8')
assert.match(conventions, /Keep the indexes current/)
assert.match(conventions, /projectsCatalog\/catalog\.ts/)
assert.match(conventions, /npmjs\.com/)
assert.match(conventions, /GitHub Packages/)
assert.match(conventions, /projects\/\.env/)

const rule = readFileSync(join(repoRoot, '.cursor/rules/project-folder.mdc'), 'utf8')
assert.match(rule, /projectsCatalog\/catalog\.ts/)
assert.match(rule, /not GitHub Packages/)

for (const rel of [
  '.cursor/skills/project-workflow/SKILL.md',
  '.claude/skills/project-workflow/SKILL.md',
]) {
  const skill = readFileSync(join(repoRoot, rel), 'utf8')
  assert.match(skill, /projectsCatalog\/catalog\.ts/, rel)
  assert.match(skill, /npm publish --access public/, rel)
  assert.match(skill, /projects\/\.env/, rel)
  assert.match(skill, /A GitHub Release is not npm publish/, rel)
  assert.match(skill, /Do not use GitHub Packages/, rel)
  assert.equal(
    skill.includes('GitHub Packages is the npm registry'),
    false,
    `${rel} negative: GitHub Packages is not the npm host`,
  )
}

assert.equal(
  slugs.includes('not-a-package'),
  false,
  'negative: the index only lists folders that exist under projects/',
)

console.log('projectsCatalog: ok')
