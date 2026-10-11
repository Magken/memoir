/**
 * Projects LCL CSS — pinned header + selected/idle Fab piles + centered Eye.
 * Run: node front_end/src/css/effects/projects-lcl.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const css = fs.readFileSync(fileURLToPath(new URL('./projects-lcl.css', import.meta.url)), 'utf8')

assert.match(css, /\.theme-projects-lcl__panel/)
assert.match(css, /theme-projects-lcl__access/)
assert.match(css, /theme-projects-lcl__table-shell/)
assert.match(css, /theme-projects-lcl__table-head/)
assert.match(
  css,
  /\.theme-projects-lcl__table-head \{[^}]*flex-shrink:\s*0/,
  'pinned head stays out of the scroll flex',
)
assert.match(css, /theme-projects-lcl__head-block/)
assert.match(
  css,
  /head-block \.theme-hairline-fx__rule \{[\s\S]{0,80}--theme-text/,
  'only the header divider is white',
)
assert.match(
  css,
  /\.theme-projects-lcl__table \.theme-lcl-table__head[\s\S]{0,80}cursor:\s*default/,
  'Name / Description / See more use default cursor (not pointer)',
)
assert.match(
  css,
  /\.theme-projects-lcl__access-fab\.theme-fab \{[\s\S]{0,400}cursor:\s*pointer/,
  'access Fabs keep the click pointer',
)
assert.doesNotMatch(
  css,
  /\.theme-projects-lcl__access-fab\.theme-fab \{[\s\S]{0,400}cursor:\s*default/,
  'negative: thead default cursor must not steal the Fab pointer',
)
assert.match(
  css,
  /\.theme-projects-lcl__thead \{[^}]*user-select:\s*none/,
  'header labels (Name / Description / See more) are not selectable',
)
assert.match(
  css,
  /\.theme-projects-lcl__thead \{[^}]*border-bottom:\s*0/,
  'static thead border removed — wipe owns the divider',
)
assert.doesNotMatch(
  css,
  /\.theme-projects-lcl__thead \{[^}]*border-bottom:\s*1px solid/,
  'negative: no static header border — LCL wipe animates the divider',
)
assert.match(css, /theme-projects-lcl__access-filters/)
assert.match(css, /theme-projects-lcl__access-fab-slot/)
assert.match(css, /theme-projects-lcl__access-fab/)
assert.match(css, /border-radius:\s*9999px/)
assert.match(
  css,
  /\.theme-projects-lcl__access-fab-slot \{[^}]*position:\s*absolute/,
  'Fab slots are absolutely seated for gsap x',
)
assert.match(
  css,
  /access-fab-slot \.theme-scroll-enter__mask/,
  'Fab scroll-enter mask clips the rise with the head list',
)
assert.match(
  css,
  /\.theme-projects-lcl__access-fab\.theme-fab \{[^}]*background:\s*#1a1a1a/,
  'idle Fab face is opaque, not transparent',
)
assert.doesNotMatch(
  css,
  /\.theme-projects-lcl__access-fab\.theme-fab \{[^}]*background:\s*transparent/,
  'negative: Fab faces must not be transparent',
)
assert.doesNotMatch(css, /is-pile-start/, 'negative: pile gap is gsap x, not margin class')
assert.match(
  css,
  /access-fab--git:not\(\.is-on\)[^}]*color:\s*#ffffff/,
  'idle git icon is white on black page',
)
assert.match(
  css,
  /access-fab--npm:not\(\.is-on\)[^}]*color:\s*#cb3837/i,
  'idle npm icon is npm red',
)
assert.match(
  css,
  /\.theme-projects-lcl__access-fab\.is-on[^}]*background:\s*#ffffff/,
  'selected Fab is white',
)
assert.match(
  css,
  /\.theme-projects-lcl__access-fab\.is-on[^}]*color:\s*#0a0a0a/,
  'selected Fab icon is black',
)
assert.doesNotMatch(
  css,
  /access-fab--(?:git|npm|website):not\(\.is-on\)[^}]*background:\s*#(?:181717|cb3837|0969da)/i,
  'negative: do not brand-paint idle Fab backgrounds',
)
assert.match(
  css,
  /access-icon--git[^}]*#ffffff/,
  'row git icon is white on black',
)
assert.doesNotMatch(css, /#f05032/, 'negative: no git-orange stand-in for git')
assert.match(
  css,
  /\.theme-projects-lcl__access \.theme-lcl-table__cell \{[^}]*justify-content:\s*center/,
  'row access icons are centered',
)
assert.match(
  css,
  /\.theme-projects-lcl__more \.theme-lcl-table__cell \{[^}]*justify-content:\s*center/,
  'See more Eye is centered',
)
assert.match(css, /theme-projects-lcl__thead/)
assert.match(
  css,
  /\.theme-projects-lcl__thead \{[^}]*border-bottom:\s*0/,
  'static thead border off — head-block wipe owns the divider',
)
assert.doesNotMatch(
  css,
  /\.theme-projects-lcl__thead \{[^}]*border-bottom:\s*1px solid/,
  'negative: no static header border — LCL wipe animates the divider',
)
assert.doesNotMatch(
  css,
  /\.theme-projects-lcl__thead \{[^}]*border-top:/,
  'negative: no line above thead — search frames the top',
)
assert.doesNotMatch(css, /data-shift|translate\(calc\(-50%/, 'negative: no peel-seat recipe')
assert.match(css, /theme-projects-lcl__head/)
assert.match(
  css,
  /\.theme-projects-lcl__desc[\s\S]{0,200}white-space:\s*nowrap/,
  'desc stays on one line',
)
assert.match(
  css,
  /\.theme-projects-lcl__desc \.theme-lcl-table__cell \{[^}]*overflow:\s*hidden/,
  'desc cells clip — no bleed into Access',
)
assert.doesNotMatch(
  css,
  /\.theme-projects-lcl__table__row|\.theme-lcl-table__row[^{]*\{[^}]*border-bottom:\s*1px solid/,
  'negative: row hairlines come from theme-lcl-table eirene, not a border-bottom recipe',
)
assert.doesNotMatch(
  css,
  /\.theme-projects-lcl__name[^{]*\{[^}]*border-bottom/,
  'negative: no per-cell border recipe for rows',
)
assert.doesNotMatch(css, /Coming soon/, 'negative: CSS is catalog chrome, not Coming soon title')
assert.match(
  css,
  /\.theme-projects-lcl\.is-leaving[\s\S]{0,220}scrollbar-color:\s*transparent\s+transparent/,
  'leave forces a transparent nano thumb without removing the rail',
)
assert.doesNotMatch(
  css,
  /\.theme-projects-lcl\.is-leaving[\s\S]{0,280}overflow:\s*hidden/,
  'negative: overflow hidden collapses the gutter and widens the table mid-leave',
)
assert.doesNotMatch(
  css,
  /\.theme-projects-lcl\.is-leaving[\s\S]{0,280}scrollbar-width:\s*none/,
  'negative: scrollbar-width none also drops the gutter and elongates rows',
)

console.log('projects-lcl: ok')
