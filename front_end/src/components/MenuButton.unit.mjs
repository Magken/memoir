/**
 * Deletable menu rows keep a bin; delete must not close the panel.
 * Run: node front_end/src/components/MenuButton.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./MenuButton.tsx', import.meta.url)), 'utf8')

assert.match(src, /deletable\?: boolean/)
assert.match(src, /onDelete\?: \(id: string\) => void/)
assert.match(src, /Trash2/)
assert.match(src, /theme-menu__item-delete/)
assert.match(src, /onDelete\?\.\(item\.id\)/)

const deleteClick = src.match(
  /className="theme-menu__item-delete"[\s\S]{0,280}onClick=\{\(event\) => \{([\s\S]*?)\}\}/,
)
assert.ok(deleteClick, 'delete click handler must sit on the bin')
assert.doesNotMatch(deleteClick[1], /close\(/, 'negative: the bin must not close the menu')

assert.match(src, /detail\?: string/)
assert.match(src, /item\.detail/)
assert.match(src, /theme-menu--with-detail/)
assert.match(src, /theme-menu__item-copy/)
assert.match(src, /theme-menu__item-detail/)
assert.match(src, /menuPanelWidthPx/)
assert.match(src, /type-caption type-muted/)
assert.doesNotMatch(
  src,
  /flex flex-col items-start gap-0/,
  'negative: detail rows use menu copy classes, not a one-off flex stack',
)
assert.doesNotMatch(
  src,
  /detail: string\n/,
  'negative: detail is optional so existing menus stay one line',
)

const css = fs.readFileSync(
  fileURLToPath(new URL('../css/effects/button-extras.css', import.meta.url)),
  'utf8',
)
assert.match(css, /theme-menu__item-btn\.theme-btn:has\(\.theme-menu__item-copy\)/)
const detailRow = css.match(
  /\.theme-menu__item-btn\.theme-btn:has\(\.theme-menu__item-copy\) \{([^}]+)\}/,
)
assert.ok(detailRow, 'detail rows must grow instead of using the one-line height')
assert.match(detailRow[1], /height:\s*auto/)
const clipped = css.replace(
  /\.theme-menu__item-btn\.theme-btn:has\(\.theme-menu__item-copy\) \{[^}]+\}/,
  '.theme-menu__item-btn.theme-btn:has(.theme-menu__item-copy) { min-height: var(--theme-menu-row-height); }',
)
assert.equal(
  /\.theme-menu__item-btn\.theme-btn:has\(\.theme-menu__item-copy\) \{[^}]*height:\s*auto/.test(clipped),
  false,
  'negative: a fixed-height detail row must fail',
)

console.log('MenuButton: ok')
