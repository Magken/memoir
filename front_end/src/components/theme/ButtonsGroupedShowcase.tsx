import {
  Bold,
  Expand,
  Italic,
  LayoutGrid,
  ListTree,
  Mail,
  Minus,
  Plus,
  Underline,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '../Button'
import { ButtonGroup, ButtonGroupRow } from '../ButtonGroup'
import { IconButton } from '../IconButton'
import { ToolbarControlTray } from '../ToolbarControlTray'
import { ToolbarModeGroup } from '../ToolbarModeGroup'

const styleOptions = [
  { value: 'bold', label: 'Bold', icon: Bold },
  { value: 'italic', label: 'Italic', icon: Italic },
  { value: 'underline', label: 'Underline', icon: Underline },
] as const

const MONTH_OPTIONS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
].map((label, index) => ({ id: String(index), label }))

const COMPACT_SECONDARY_ACTIONS = [
  { id: 'cancel', label: 'Cancel' },
  { id: 'reset', label: 'Reset' },
  { id: 'revert', label: 'Revert' },
  { id: 'clear', label: 'Clear' },
] as const

const SCROLL_SHEET_OPTIONS = [
  { id: 'all', label: 'All orders' },
  { id: 'fulfillment', label: 'Fulfillment' },
  { id: 'finance', label: 'Finance' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'returns', label: 'Returns' },
  { id: 'channels', label: 'Channels' },
] as const

export function ButtonsGroupedShowcase() {
  const [groupFormats, setGroupFormats] = useState<string[]>(['bold'])
  const [groupPeriod, setGroupPeriod] = useState('0')
  const [groupScrollSheet, setGroupScrollSheet] = useState('all')
  const [groupCompactAction, setGroupCompactAction] = useState('reset')
  const [groupToolbarMode, setGroupToolbarMode] = useState('pages')

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <p className="type-overline">Grouped buttons</p>
        <p className="type-body-sm type-muted prose-measure">
          Clustered controls for toolbars and action rows —{' '}
          <code className="type-code">ButtonGroup</code> (segmented trays),{' '}
          <code className="type-code">ToolbarModeGroup</code> (icon mode switcher), and{' '}
          <code className="type-code">ToolbarControlTray</code> (flat control cluster, optional{' '}
          <code className="type-code">border=&quot;tooltip&quot;</code> for floating format bars).
        </p>
      </section>

      <section className="space-y-4">
        <p className="type-caption type-faint font-mono">ButtonGroup</p>
        <p className="type-body-sm type-muted prose-measure">
          Gapped <code className="type-code">inset</code> slots — no flush dividers.{' '}
          <code className="type-code">toggle</code> fills each pressed segment;
          <code className="type-code">card</code> and <code className="type-code">compact</code> wrap
          secondary actions in an inset tray — use <code className="type-code">ButtonGroupRow</code>{' '}
          with a standalone primary outside;
          <code className="type-code">paged</code> animates chevron windows with a sliding
          selection; <code className="type-code">scroll</code> keeps every tab in a fixed-width
          strip — chevrons scroll horizontally with no scrollbar.
        </p>
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="type-caption type-faint font-mono">toggle — multi-select fill per segment</p>
            <ButtonGroup variant="toggle" aria-label="Text style">
              {styleOptions.map((option) => {
                const pressed = groupFormats.includes(option.value)
                return (
                  <IconButton
                    key={option.value}
                    icon={option.icon}
                    aria-label={option.label}
                    aria-pressed={pressed}
                    active={pressed}
                    size="sm"
                    onClick={() =>
                      setGroupFormats((current) =>
                        pressed
                          ? current.filter((value) => value !== option.value)
                          : [...current, option.value],
                      )
                    }
                  />
                )
              })}
            </ButtonGroup>
          </div>
          <div className="space-y-2">
            <p className="type-caption type-faint font-mono">card + row — grouped pair, primary outside</p>
            <ButtonGroupRow>
              <ButtonGroup variant="card" aria-label="Secondary actions">
                <Button size="sm">Cancel</Button>
                <Button size="sm">Reset</Button>
              </ButtonGroup>
              <Button variant="action" size="sm" labelAnim={false}>
                Save
              </Button>
            </ButtonGroupRow>
          </div>
          <div className="space-y-2">
            <p className="type-caption type-faint font-mono">
              compact + row — dense tray, more secondaries, primary outside
            </p>
            <ButtonGroupRow>
              <ButtonGroup variant="compact" aria-label="Secondary actions">
                {COMPACT_SECONDARY_ACTIONS.map((action) => {
                  const active = groupCompactAction === action.id
                  return (
                    <Button
                      key={action.id}
                      size="sm"
                      active={active}
                      aria-pressed={active}
                      onClick={() => setGroupCompactAction(action.id)}
                    >
                      {action.label}
                    </Button>
                  )
                })}
              </ButtonGroup>
              <Button variant="action" size="sm" labelAnim={false}>
                Apply
              </Button>
            </ButtonGroupRow>
          </div>
          <div className="space-y-2">
            <p className="type-caption type-faint font-mono">paged — animated chevrons + sliding window</p>
            <ButtonGroup variant="paged" pageSize={4} aria-label="Billing period">
              {MONTH_OPTIONS.map((option) => (
                <Button
                  key={option.id}
                  size="sm"
                  labelAnim={false}
                  active={groupPeriod === option.id}
                  aria-pressed={groupPeriod === option.id}
                  onClick={() => setGroupPeriod(option.id)}
                >
                  {option.label}
                </Button>
              ))}
            </ButtonGroup>
          </div>
          <div className="space-y-2">
            <p className="type-caption type-faint font-mono">
              scroll — chevron strip, no scrollbar (`--theme-btn-group-scroll-width`)
            </p>
            <ButtonGroup
              variant="scroll"
              className="theme-buttons-showcase__scroll-group"
              aria-label="Worksheet tabs"
            >
              {SCROLL_SHEET_OPTIONS.map((option) => (
                <Button
                  key={option.id}
                  size="sm"
                  labelAnim={false}
                  active={groupScrollSheet === option.id}
                  aria-pressed={groupScrollSheet === option.id}
                  onClick={() => setGroupScrollSheet(option.id)}
                >
                  {option.label}
                </Button>
              ))}
            </ButtonGroup>
          </div>
          <p className="type-caption type-muted">
            Style: <span className="font-mono">{groupFormats.join(', ') || 'none'}</span>
            {' · '}
            Period:{' '}
            <span className="font-mono">{MONTH_OPTIONS.find((m) => m.id === groupPeriod)?.label}</span>
            {' · '}
            Scroll:{' '}
            <span className="font-mono">
              {SCROLL_SHEET_OPTIONS.find((sheet) => sheet.id === groupScrollSheet)?.label}
            </span>
            {' · '}
            Compact:{' '}
            <span className="font-mono">
              {COMPACT_SECONDARY_ACTIONS.find((action) => action.id === groupCompactAction)?.label}
            </span>
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-caption type-faint font-mono">ToolbarModeGroup</p>
        <p className="type-body-sm type-muted prose-measure">
          Side-panel icon mode switcher — wraps <code className="type-code">ButtonGroup</code>{' '}
          <code className="type-code">toggle</code> with toolbar outline chrome (
          <code className="type-code">toolbar-groups.css</code>).
        </p>
        <div className="space-y-2">
          <ToolbarModeGroup aria-label="Panel views">
            {(
              [
                { id: 'pages', label: 'Pages', icon: LayoutGrid },
                { id: 'contents', label: 'Contents', icon: ListTree },
                { id: 'links', label: 'Links', icon: Mail },
              ] as const
            ).map((option) => (
              <IconButton
                key={option.id}
                icon={option.icon}
                aria-label={option.label}
                aria-pressed={groupToolbarMode === option.id}
                size="xs"
                active={groupToolbarMode === option.id}
                onClick={() => setGroupToolbarMode(option.id)}
              />
            ))}
          </ToolbarModeGroup>
          <p className="type-caption type-muted">
            Active: <span className="font-mono">{groupToolbarMode}</span>
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-caption type-faint font-mono">ToolbarControlTray</p>
        <p className="type-body-sm type-muted prose-measure">
          Flat card shell for clustered icon controls. Default = ribbon / PdfViewer zoom tray;{' '}
          <code className="type-code">border=&quot;tooltip&quot;</code> = DocEditor floating selection
          format bar (tooltip border + shadow, ghost icons).
        </p>
        <div className="flex flex-wrap items-start gap-8">
          <div className="space-y-2">
            <p className="type-caption type-faint font-mono">default — zoom / ribbon cluster</p>
            <ToolbarControlTray>
              <span className="theme-toolbar-control-tray__zoom-step">
                <IconButton icon={Minus} aria-label="Zoom out" size="xs" variant="ghost" />
                <span className="theme-toolbar-control-tray__value type-caption tabular-nums">100%</span>
                <IconButton icon={Plus} aria-label="Zoom in" size="xs" variant="ghost" />
              </span>
              <IconButton icon={Expand} aria-label="Fit page" size="xs" variant="ghost" active />
            </ToolbarControlTray>
            <p className="type-caption type-muted">PdfViewer zoom tray pattern</p>
          </div>
          <div className="space-y-2">
            <p className="type-caption type-faint font-mono">border=&quot;tooltip&quot; — floating format</p>
            <ToolbarControlTray border="tooltip">
              <IconButton
                icon={Bold}
                aria-label="Bold"
                size="xs"
                variant="ghost"
                active={groupFormats.includes('bold')}
                aria-pressed={groupFormats.includes('bold')}
                onClick={() =>
                  setGroupFormats((current) =>
                    current.includes('bold')
                      ? current.filter((value) => value !== 'bold')
                      : [...current, 'bold'],
                  )
                }
              />
              <IconButton
                icon={Italic}
                aria-label="Italic"
                size="xs"
                variant="ghost"
                active={groupFormats.includes('italic')}
                aria-pressed={groupFormats.includes('italic')}
                onClick={() =>
                  setGroupFormats((current) =>
                    current.includes('italic')
                      ? current.filter((value) => value !== 'italic')
                      : [...current, 'italic'],
                  )
                }
              />
              <IconButton
                icon={Underline}
                aria-label="Underline"
                size="xs"
                variant="ghost"
                active={groupFormats.includes('underline')}
                aria-pressed={groupFormats.includes('underline')}
                onClick={() =>
                  setGroupFormats((current) =>
                    current.includes('underline')
                      ? current.filter((value) => value !== 'underline')
                      : [...current, 'underline'],
                  )
                }
              />
            </ToolbarControlTray>
            <p className="type-caption type-muted">DocEditor selection floating toolbar</p>
          </div>
        </div>
      </section>
    </div>
  )
}
