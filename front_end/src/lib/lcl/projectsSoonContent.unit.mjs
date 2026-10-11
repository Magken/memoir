/**
 * Projects catalog fixtures + filter/page helpers.
 * Run: npx tsx front_end/src/lib/lcl/projectsSoonContent.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  PROJECT_ACCESS_FILTERS,
  PROJECTS_CATALOG_FIXTURES,
  PROJECTS_CATALOG_PAGE,
  filterProjectsCatalog,
  pageProjectsCatalog,
} from './projectsSoonContent.ts'

assert.ok(PROJECTS_CATALOG_FIXTURES.length > PROJECTS_CATALOG_PAGE)
assert.equal(pageProjectsCatalog(PROJECTS_CATALOG_FIXTURES, 1).length, PROJECTS_CATALOG_PAGE)
assert.ok(pageProjectsCatalog(PROJECTS_CATALOG_FIXTURES, 2).length > PROJECTS_CATALOG_PAGE)
assert.equal(filterProjectsCatalog(PROJECTS_CATALOG_FIXTURES, 'gras_to_text').length, 1)
assert.equal(filterProjectsCatalog(PROJECTS_CATALOG_FIXTURES, 'zzzz-none').length, 0)
assert.ok(
  filterProjectsCatalog(PROJECTS_CATALOG_FIXTURES, '', ['npm']).every((row) => row.access.includes('npm')),
  'access toggle keeps only matching kinds',
)
assert.ok(
  filterProjectsCatalog(PROJECTS_CATALOG_FIXTURES, '', ['npm']).length < PROJECTS_CATALOG_FIXTURES.length,
  'access filter narrows the catalog',
)
assert.equal(PROJECT_ACCESS_FILTERS.join(','), 'git,npm,website')
assert.doesNotMatch(
  PROJECTS_CATALOG_FIXTURES.map((row) => row.name).join(','),
  /Coming soon/,
  'negative: fixtures are catalog rows, not the old Coming soon title',
)

console.log('projectsSoonContent: ok')
