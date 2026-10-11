import { createPortal } from 'react-dom'
import type { RefObject } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import type { DataColumn } from '../lib/data'
import {
  createRuleId,
  dataTypeForColumn,
  defaultParamsForOperator,
  listOperatorsForType,
  type DataFilterOperatorDefinition,
  type DataFilterParamField,
  type DataFilterRule,
} from '../lib/data'
import { IconButton } from './IconButton'
import { Button } from './Button'
import { DatePicker } from './DatePicker'
import { Input } from './Input'
import { Select } from './Select'
import { Switch } from './Switch'
import { ThemeScroll } from './ThemeScroll'
import { TimePicker } from './TimePicker'
import { Tooltip } from './Tooltip'

type DataColumnFilterMenuProps = {
  column: DataColumn
  rules: DataFilterRule[]
  /** Commit draft rules and close. */
  onApply: (next: DataFilterRule[]) => void
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
  isOpen: boolean
  debug?: boolean
}

const PANEL_Z = 530
const MENU_PORTAL_Z = 560
const VIEWPORT_EDGE = 8
const ANCHOR_GAP = 6
const FILTER_ICON_BTN_CLASS = '[&_svg]:size-3.5'
const FILTER_FIELD_CLASS = 'theme-data-filter__control-field min-w-0'

function resolveThemePortalRoot(anchor: HTMLElement): HTMLElement {
  return (
    (anchor.closest('.theme') as HTMLElement | null) ??
    (document.querySelector('.theme-root') as HTMLElement | null) ??
    document.body
  )
}

function isPortaledMenuTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('.theme-menu-portal-host'))
}

function splitDatetimeLocalParam(raw: string): { date: string; time: string } {
  const m = raw.trim().match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/)
  if (m) return { date: m[1], time: m[2] }
  return { date: '', time: '' }
}

function mergeDatetimeLocalParam(date: string, time: string): string {
  if (!date.trim() && !time.trim()) return ''
  const d = date.trim()
  const t = time.trim()
  if (!d) return ''
  return `${d}T${t || '00:00'}`
}

type FilterDatetimeLocalFieldProps = {
  label: string
  value: string
  onChange: (next: string) => void
}

const FILTER_DATE_PICKER_PROPS = { showPickerDropdown: false } as const

function FilterDatetimeLocalField({ label, value, onChange }: FilterDatetimeLocalFieldProps) {
  const { date, time } = splitDatetimeLocalParam(value)
  return (
    <div className="theme-data-filter__datetime min-w-0">
      <DatePicker
        size="xs"
        label={label}
        className={FILTER_FIELD_CLASS}
        value={date}
        onChange={(nextDate) => onChange(mergeDatetimeLocalParam(nextDate, time))}
        {...FILTER_DATE_PICKER_PROPS}
      />
      <TimePicker
        size="xs"
        label={`${label} time`}
        className={FILTER_FIELD_CLASS}
        value={time}
        onChange={(nextTime) => onChange(mergeDatetimeLocalParam(date, nextTime))}
        {...FILTER_DATE_PICKER_PROPS}
      />
    </div>
  )
}

type FilterParamFieldProps = {
  field: DataFilterParamField
  value: string
  onChange: (next: string) => void
}

function FilterParamField({ field, value, onChange }: FilterParamFieldProps) {
  switch (field.input) {
    case 'date':
      return (
        <DatePicker
          size="xs"
          label={field.label}
          className={FILTER_FIELD_CLASS}
          value={value}
          onChange={onChange}
          showPickerDropdown={false}
        />
      )
    case 'time':
      return (
        <TimePicker
          size="xs"
          label={field.label}
          className={FILTER_FIELD_CLASS}
          value={value}
          onChange={onChange}
          showPickerDropdown={false}
        />
      )
    case 'datetime-local':
      return <FilterDatetimeLocalField label={field.label} value={value} onChange={onChange} />
    case 'number':
      return (
        <Input
          size="xs"
          type="number"
          placeholder={field.label}
          aria-label={field.label}
          className={FILTER_FIELD_CLASS}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )
    default:
      return (
        <Input
          size="xs"
          type="text"
          placeholder={field.label}
          aria-label={field.label}
          className={FILTER_FIELD_CLASS}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )
  }
}

/**
 * Per-column filter popover — schema-driven by the column's data type (operators
 * from lib/data). Draft edits commit on Apply.
 */
export function DataColumnFilterMenu({
  column,
  rules,
  onApply,
  onClose,
  anchorRef,
  isOpen,
  debug = false,
}: DataColumnFilterMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [layoutTick, setLayoutTick] = useState(0)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const [draftRules, setDraftRules] = useState<DataFilterRule[]>(rules)

  const dataType = useMemo(() => dataTypeForColumn(column), [column])
  const operators = useMemo(() => listOperatorsForType(dataType), [dataType])
  const opById = useMemo(() => new Map(operators.map((o) => [o.id, o])), [operators])
  const operatorOptions = useMemo(
    () => operators.map((o) => ({ value: o.id, label: o.label })),
    [operators],
  )

  useLayoutEffect(() => {
    if (isOpen) setDraftRules(rules)
  }, [isOpen, rules])

  useLayoutEffect(() => {
    if (!isOpen) {
      setPortalRoot(null)
      return
    }
    if (anchorRef.current) setPortalRoot(resolveThemePortalRoot(anchorRef.current))
  }, [isOpen, anchorRef])

  const reposition = useCallback(() => {
    const anchor = anchorRef.current
    const panel = panelRef.current
    if (!anchor || !panel) return
    const ar = anchor.getBoundingClientRect()
    const pw = panel.offsetWidth || 272
    const ph = panel.offsetHeight || 200
    let left = ar.right - pw
    if (left < VIEWPORT_EDGE) left = VIEWPORT_EDGE
    if (left + pw > window.innerWidth - VIEWPORT_EDGE) {
      left = Math.max(VIEWPORT_EDGE, window.innerWidth - pw - VIEWPORT_EDGE)
    }
    let top = ar.bottom + ANCHOR_GAP
    if (top + ph > window.innerHeight - VIEWPORT_EDGE) top = ar.top - ph - ANCHOR_GAP
    if (top < VIEWPORT_EDGE) top = VIEWPORT_EDGE
    setPos({ top, left })
  }, [anchorRef])

  useLayoutEffect(() => {
    if (!isOpen || !portalRoot) return
    reposition()
    const id = requestAnimationFrame(() => reposition())
    return () => cancelAnimationFrame(id)
  }, [isOpen, portalRoot, reposition, layoutTick, draftRules.length])

  useEffect(() => {
    if (!isOpen) return
    const bump = () => setLayoutTick((t) => t + 1)
    window.addEventListener('scroll', bump, true)
    window.addEventListener('resize', bump)
    return () => {
      window.removeEventListener('scroll', bump, true)
      window.removeEventListener('resize', bump)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target
      if (panelRef.current?.contains(t as Node)) return
      if (anchorRef.current?.contains(t as Node)) return
      if (isPortaledMenuTarget(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDoc, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose, anchorRef])

  const addRule = () => {
    const first = operators[0]
    if (!first) return
    setDraftRules((prev) => [
      ...prev,
      { ruleId: createRuleId(), operatorId: first.id, params: defaultParamsForOperator(first), enabled: true },
    ])
  }

  const patchRuleParams = (ruleId: string, params: Record<string, string>) => {
    setDraftRules((prev) =>
      prev.map((r) => (r.ruleId === ruleId ? { ...r, params: { ...r.params, ...params } } : r)),
    )
  }

  const setOperator = (ruleId: string, opDef: DataFilterOperatorDefinition) => {
    setDraftRules((prev) =>
      prev.map((r) =>
        r.ruleId === ruleId
          ? { ...r, operatorId: opDef.id, params: defaultParamsForOperator(opDef), enabled: true }
          : r,
      ),
    )
  }

  const removeRule = (ruleId: string) => {
    setDraftRules((prev) => prev.filter((r) => r.ruleId !== ruleId))
  }

  const toggleRuleEnabled = (ruleId: string, enabled: boolean) => {
    setDraftRules((prev) => prev.map((r) => (r.ruleId === ruleId ? { ...r, enabled } : r)))
  }

  const applyDraft = () => {
    onApply(draftRules)
    onClose()
  }

  if (debug) {
    console.debug('[DataColumnFilterMenu]', { column: column.key, dataType, rules: draftRules.length, pos })
  }

  if (!isOpen || !portalRoot) return null

  const panel = (
    <div
      className="theme-tooltip-portal-host theme-tooltip-portal-host--interactive"
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: PANEL_Z }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-label={`Filters for ${column.header}`}
        className="theme-tooltip theme-tooltip--interactive theme-tooltip--bottom theme-tooltip--visible theme-data-filter-tooltip"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="theme-tooltip__content theme-tooltip__content--interactive theme-data-filter">
          <div className="theme-data-filter__bar">
            {draftRules.length > 0 ? (
              <button
                type="button"
                className="theme-data-filter__clear type-caption type-muted"
                onClick={() => setDraftRules([])}
              >
                Clear all
              </button>
            ) : (
              <span className="type-caption type-faint truncate">{column.header}</span>
            )}
            <IconButton
              icon={X}
              aria-label="Close filters"
              size="xs"
              variant="ghost"
              className={FILTER_ICON_BTN_CLASS}
              onClick={onClose}
            />
          </div>

          <ThemeScroll rail="mini" scrollClouds={false} className="theme-data-filter__body" tabIndex={-1}>
            {draftRules.map((rule) => {
              const opDef = opById.get(rule.operatorId) ?? operators[0]
              const paramFields = opDef?.params ?? []
              const ruleEnabled = rule.enabled !== false
              return (
                <div
                  key={rule.ruleId}
                  className="theme-data-filter__rule"
                  data-enabled={ruleEnabled ? 'true' : 'false'}
                >
                  <div className="theme-data-filter__rule-head min-w-0">
                    <Select
                      size="xs"
                      options={operatorOptions}
                      value={rule.operatorId}
                      portal
                      portalZIndex={MENU_PORTAL_Z}
                      scrollRail="hidden"
                      scrollClouds={false}
                      className={FILTER_FIELD_CLASS}
                      onChange={(value) => {
                        const next = opById.get(value)
                        if (next) setOperator(rule.ruleId, next)
                      }}
                    />
                    <Tooltip content={ruleEnabled ? 'Disable condition' : 'Enable condition'} placement="top">
                      <Switch
                        size="xs"
                        label="Enable condition"
                        checked={ruleEnabled}
                        className="theme-data-filter__toggle shrink-0"
                        onChange={(enabled) => toggleRuleEnabled(rule.ruleId, enabled)}
                      />
                    </Tooltip>
                    <Tooltip content="Remove condition" placement="top">
                      <IconButton
                        icon={Trash2}
                        aria-label="Remove condition"
                        size="xs"
                        variant="ghost"
                        className={FILTER_ICON_BTN_CLASS}
                        onClick={() => removeRule(rule.ruleId)}
                      />
                    </Tooltip>
                  </div>
                  {paramFields.length > 0 ? (
                    <div
                      className={[
                        'theme-data-filter__params min-w-0',
                        paramFields.length > 1 ? 'theme-data-filter__params--pair' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {paramFields.map((field) => (
                        <FilterParamField
                          key={field.key}
                          field={field}
                          value={rule.params[field.key] ?? ''}
                          onChange={(next) => patchRuleParams(rule.ruleId, { [field.key]: next })}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </ThemeScroll>

          <div className="theme-data-filter__footer">
            <Button
              type="button"
              size="xs"
              variant="outline"
              icon={Plus}
              className={FILTER_ICON_BTN_CLASS}
              onClick={addRule}
            >
              Add
            </Button>
            <Button type="button" size="xs" variant="default" onClick={applyDraft}>
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(portalRoot === document.body ? <div className="theme">{panel}</div> : panel, portalRoot)
}
