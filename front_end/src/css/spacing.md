# UI spacing scale

Cross-feature **padding / gap** reference for the theme UI. Run skill **`padding-workflow`** after implementing shells, settings rows, or menus inside padded containers. Indexer entry: `project_indexer/front_end/src/css/spacing.md`.

## Scale

| Token | Typical use |
|-------|-------------|
| `0.75rem` (`py-3`, `gap-3`, `padding-block: 0.75rem`) | Settings / form rows, section header → body gap |
| `1rem` (`p-4`, `padding: 1rem`, `gap-4`, `column-gap: 1rem`) | Card shells, panel bodies, settings card pad, label ↔ control gap |
| `0.625rem` (`py-2.5`) | Compact title bars (toolbar height) |
| `1rem` horizontal (`px-4`) | Panel / window horizontal inset |
| `calc(* * var(--theme-menu-scale))` | Menu rails, docks, in-menu buttons — see `effects/menu-scale.css` |

## Patterns

| Pattern | Reference |
|---------|-----------|
| Settings overlay — card pad + equal rows | `effects/chart-panel.css` · `.theme-chart-panel__settings-row` |
| Framed chart / data card | `ChartCard.tsx` · `p-4` |
| Chart window title bar | `ChartPanel.tsx` · `px-4 py-2.5` |
| Menu dock inside a padded shell | Strip dock outer pad — `.theme-chart-panel__settings .theme-nmenu-dock { padding: 0 }` |
| Scroll list / menu panel | `menu-scale.css` · `--theme-menu-panel-padding-*` |

## Rules

1. Match the nearest sibling in the same feature before inventing new pad values.
2. Settings / option rows: grid `minmax(0,1fr) auto`, `align-items: center`, same `padding-block`, `column-gap: 1rem`.
3. No double pad on wrapper + dock + inner control.
4. Menus inside cards/panels: use `menuScale` on the menu root.
5. Showcase callouts use the same `p-4` shell as production cards unless demoing density.
