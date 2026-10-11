import { useRef, type ReactNode } from 'react'
import { asBool, asString, asStringList, newId, type VurifyViewerItem } from './types'
import { isCvDateRangeOrdered } from './itemDateOrder'
import {
  ITEM_FIELD_ORDER_KEY,
  resolveFieldOrder,
  type ItemBodySlot,
  viewerSlotTocId,
} from './itemFieldOrder'
import { DocField } from './DocField'
import { ViewerEditable } from './ViewerEditable'
import { ViewerLinkField } from './ViewerLinkField'
import { useLeaveThen, useMountEnterClass, ViewerMotion } from './ViewerMotion'
import { ViewerRemoveBtn } from './ViewerRemoveBtn'
import { StringListRows } from './StringListRows'
import { ItemFooterList } from './ItemFooterList'
import { fieldValueToLinkUrl } from '../../lib/docEditor/linkUrl'
import { formatCvDateStored, type CvSectionKind } from '../../lib/cvApi'

type ItemLayoutProps = {
  kind: CvSectionKind
  item: VurifyViewerItem
  editable?: boolean
  onPatch: (patch: VurifyViewerItem) => void
  fieldPrefix?: string
  /** Presence key for TOC / scroll anchors on body slots. */
  itemPresenceKey?: string
}

/** Empty → null so optional slots unmount (re-add from edge +). */
function optionalText(value: string): string | null {
  return value.trim() ? value : null
}

function optionalDate(value: string): string | null {
  const trimmed = optionalText(value)
  if (trimmed == null) return null
  const formatted = formatCvDateStored(trimmed)
  return typeof formatted === 'string' ? formatted : trimmed
}

function optionalStringList(next: string[]): string[] | null {
  return next.length > 0 ? next : null
}

function hostnameLinkLabel(url: string): string {
  const raw = url.trim()
  if (!raw) return ''
  try {
    const host = new URL(fieldValueToLinkUrl(raw)).hostname
    return host.replace(/^www\./i, '')
  } catch {
    return ''
  }
}

function SlotAnchor({
  slotId,
  slot,
  children,
}: {
  slotId?: string
  slot: ItemBodySlot
  children: ReactNode
}) {
  if (!slotId) return <>{children}</>
  const id = viewerSlotTocId(slotId, slot)
  return (
    <div id={id} data-doc-toc={id} data-vv-slot={slot} className="theme-vurify-viewer__slot">
      {children}
    </div>
  )
}

function DateRangeFields({
  item,
  editable,
  onPatch,
  fieldPrefix,
}: {
  item: VurifyViewerItem
  editable?: boolean
  onPatch: (patch: VurifyViewerItem) => void
  fieldPrefix: string
}) {
  const hasSingle = item.date != null || item.date_raw != null || item.year != null
  const hasRange = item.start != null || item.end != null || item.current != null
  const show = hasSingle || hasRange
  const modeRef = useRef<'single' | 'range'>('range')
  if (hasSingle) modeRef.current = 'single'
  else if (hasRange) modeRef.current = 'range'
  const mode = show ? (hasSingle ? 'single' : 'range') : modeRef.current

  const singleKey =
    item.date != null ? 'date' : item.date_raw != null ? 'date_raw' : item.year != null ? 'year' : 'date'
  const isCurrent = asBool(item.current)

  const onStartChange = (v: string) => {
    const start = optionalDate(v)
    // Deny out-of-order ranges — keep prior start (controlled value resets).
    if (start && item.end != null && !isCurrent && !isCvDateRangeOrdered(start, item.end)) {
      return
    }
    onPatch({ start })
  }

  const onEndChange = (v: string) => {
    const end = optionalDate(v)
    if (end && item.start != null && !isCvDateRangeOrdered(item.start, end)) {
      return
    }
    onPatch({ end, current: false })
  }

  return (
    <ViewerMotion show={show} className="theme-vurify-viewer__fold">
      {mode === 'single' ? (
        <DocField id={`${fieldPrefix}.${singleKey}`} role="date" className="theme-vurify-viewer__dates">
          <ViewerEditable
            value={asString(item[singleKey])}
            onChange={(v) => onPatch({ [singleKey]: optionalDate(v) })}
            placeholder="Date"
            allowEmpty
            disabled={!editable}
          />
        </DocField>
      ) : (
        <div className="theme-vurify-viewer__dates theme-vurify-viewer__dates--range">
          <DocField id={`${fieldPrefix}.start`} role="date">
            <ViewerEditable
              value={asString(item.start)}
              onChange={onStartChange}
              placeholder="Start"
              allowEmpty
              disabled={!editable}
            />
          </DocField>
          <span className="theme-vurify-viewer__date-dash" aria-hidden>
            –
          </span>
          {isCurrent ? (
            <button
              type="button"
              className="theme-vurify-viewer__present-btn"
              disabled={!editable}
              onClick={() => {
                if (!editable) return
                onPatch({ current: false, end: item.end ?? '' })
              }}
            >
              Present
            </button>
          ) : (
            <DocField id={`${fieldPrefix}.end`} role="date">
              <ViewerEditable
                value={asString(item.end)}
                onChange={onEndChange}
                placeholder="End"
                allowEmpty
                disabled={!editable}
              />
            </DocField>
          )}
        </div>
      )}
    </ViewerMotion>
  )
}

type SkillEntry = { name?: string; level?: string | null }

function SkillRow({
  rowId,
  skill,
  index,
  showLevelCol,
  editable,
  fieldPrefix,
  onChangeSkill,
  onRemove,
}: {
  rowId: string
  skill: SkillEntry
  index: number
  showLevelCol: boolean
  editable?: boolean
  fieldPrefix: string
  onChangeSkill: (index: number, next: SkillEntry) => void
  onRemove: () => void
}) {
  const enterClass = useMountEnterClass()
  const { run, leaveClass } = useLeaveThen(onRemove)
  const levelSet = skill.level != null

  return (
    <div
      className={[
        'theme-vurify-viewer__skill-row',
        'theme-vurify-viewer__motion',
        enterClass,
        leaveClass,
      ]
        .filter(Boolean)
        .join(' ')}
      data-row-id={rowId}
      role="row"
    >
      <div className="theme-vurify-viewer__skill-name" role="cell">
        <DocField id={`${fieldPrefix}.skill.${index}.name`} role="list">
          <ViewerEditable
            value={asString(skill.name)}
            onChange={(name) => onChangeSkill(index, { ...skill, name })}
            placeholder="Skill"
            allowEmpty
            disabled={!editable}
          />
        </DocField>
      </div>
      {showLevelCol ? (
        <div className="theme-vurify-viewer__skill-level" role="cell">
          <ViewerMotion show={levelSet} className="theme-vurify-viewer__fold">
            <DocField id={`${fieldPrefix}.skill.${index}.level`} role="meta">
              <ViewerEditable
                value={asString(skill.level)}
                onChange={(level) =>
                  onChangeSkill(index, {
                    ...skill,
                    level: level.trim() ? level : null,
                  })
                }
                placeholder="Level"
                allowEmpty
                disabled={!editable}
              />
            </DocField>
          </ViewerMotion>
          {!levelSet && editable ? (
            <button
              type="button"
              className="theme-vurify-viewer__quiet-btn"
              onClick={() => onChangeSkill(index, { ...skill, level: '' })}
            >
              Add level
            </button>
          ) : null}
        </div>
      ) : null}
      {editable ? (
        <ViewerRemoveBtn label={`Remove skill ${index + 1}`} onClick={run} />
      ) : null}
    </div>
  )
}

function SkillMiniRows({
  item,
  editable,
  onPatch,
  fieldPrefix,
}: {
  item: VurifyViewerItem
  editable?: boolean
  onPatch: (patch: VurifyViewerItem) => void
  fieldPrefix: string
}) {
  const skills = Array.isArray(item.items) ? (item.items as SkillEntry[]) : []
  const idsRef = useRef<string[]>([])
  if (idsRef.current.length < skills.length) {
    const add = skills.length - idsRef.current.length
    for (let i = 0; i < add; i += 1) idsRef.current.push(newId())
  } else if (idsRef.current.length > skills.length) {
    idsRef.current = idsRef.current.slice(0, skills.length)
  }

  const anyLevel = skills.some((skill) => Boolean(asString(skill.level).trim()))
  const showLevelCol = anyLevel || Boolean(editable)

  const commitSkills = (next: SkillEntry[], nextIds?: string[]) => {
    if (nextIds) idsRef.current = nextIds
    onPatch({ items: next.length > 0 ? next : null })
  }

  return (
    <div className="theme-vurify-viewer__band">
      <div
        className={[
          'theme-vurify-viewer__skill-table',
          showLevelCol ? 'has-levels' : 'names-only',
          editable ? 'is-editable' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="table"
        aria-label="Skills"
      >
        {skills.map((skill, index) => {
          const rowId = idsRef.current[index] ?? `${fieldPrefix}-skill-${index}`
          return (
            <SkillRow
              key={rowId}
              rowId={rowId}
              skill={skill}
              index={index}
              showLevelCol={showLevelCol}
              editable={editable}
              fieldPrefix={fieldPrefix}
              onChangeSkill={(i, nextSkill) => {
                commitSkills(skills.map((row, j) => (j === i ? nextSkill : row)))
              }}
              onRemove={() => {
                commitSkills(
                  skills.filter((_, i) => i !== index),
                  idsRef.current.filter((_, i) => i !== index),
                )
              }}
            />
          )
        })}
        {editable && skills.length > 0 ? (
          <div className="theme-vurify-viewer__list-add">
            <button
              type="button"
              className="theme-vurify-viewer__quiet-btn"
              onClick={() => {
                idsRef.current = [...idsRef.current, newId()]
                commitSkills([...skills, { name: '' }])
              }}
            >
              Add skill
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ExtraStringRow({
  fieldKey,
  value,
  editable,
  fieldPrefix,
  onPatch,
}: {
  fieldKey: string
  value: string | null | undefined
  editable?: boolean
  fieldPrefix: string
  onPatch: (patch: VurifyViewerItem) => void
}) {
  const enterClass = useMountEnterClass()
  const { run, leaveClass } = useLeaveThen(() => onPatch({ [fieldKey]: null }))

  return (
    <div
      className={[
        'theme-vurify-viewer__meta-row',
        'theme-vurify-viewer__motion',
        enterClass,
        leaveClass,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <DocField id={`${fieldPrefix}.extra.${fieldKey}`} role="meta">
        <ViewerEditable
          value={asString(value)}
          onChange={(next) => onPatch({ [fieldKey]: optionalText(next) })}
          placeholder={fieldKey}
          allowEmpty
          disabled={!editable}
        />
      </DocField>
      {editable ? (
        <ViewerRemoveBtn label={`Remove ${fieldKey}`} onClick={run} />
      ) : null}
    </div>
  )
}

function ExtraListBlock({
  fieldKey,
  values,
  editable,
  fieldPrefix,
  onPatch,
}: {
  fieldKey: string
  values: string[]
  editable?: boolean
  fieldPrefix: string
  onPatch: (patch: VurifyViewerItem) => void
}) {
  const enterClass = useMountEnterClass()

  return (
    <div
      className={['theme-vurify-viewer__band', 'theme-vurify-viewer__motion', enterClass]
        .filter(Boolean)
        .join(' ')}
    >
      <StringListRows
        values={values}
        onChange={(next) => onPatch({ [fieldKey]: optionalStringList(next) })}
        editable={editable}
        aria-label={fieldKey}
        fieldPrefix={`${fieldPrefix}.extra.${fieldKey}`}
      />
    </div>
  )
}

function GenericExtraFields({
  item,
  knownKeys,
  editable,
  onPatch,
  fieldPrefix,
}: {
  item: VurifyViewerItem
  knownKeys: Set<string>
  editable?: boolean
  onPatch: (patch: VurifyViewerItem) => void
  fieldPrefix: string
}) {
  const extras = Object.keys(item).filter((key) => !knownKeys.has(key))
  if (extras.length === 0) return null

  return (
    <div className="theme-vurify-viewer__extras">
      {extras.map((key) => {
        const value = item[key]
        if (typeof value === 'boolean') return null
        if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
          return (
            <ExtraListBlock
              key={key}
              fieldKey={key}
              values={value as string[]}
              editable={editable}
              fieldPrefix={fieldPrefix}
              onPatch={onPatch}
            />
          )
        }
        if (typeof value === 'string' || value == null) {
          return (
            <ExtraStringRow
              key={key}
              fieldKey={key}
              value={value as string | null | undefined}
              editable={editable}
              fieldPrefix={fieldPrefix}
              onPatch={onPatch}
            />
          )
        }
        return null
      })}
    </div>
  )
}

function RoleBlock({
  role,
  index,
  editable,
  fieldPrefix,
  roles,
  onPatch,
}: {
  role: VurifyViewerItem
  index: number
  editable?: boolean
  fieldPrefix: string
  roles: VurifyViewerItem[]
  onPatch: (patch: VurifyViewerItem) => void
}) {
  const enterClass = useMountEnterClass()
  const { run, leaveClass } = useLeaveThen(() => {
    onPatch({ roles: roles.filter((_, i) => i !== index) })
  })

  return (
    <div
      className={[
        'theme-vurify-viewer__role',
        'theme-vurify-viewer__motion',
        enterClass,
        leaveClass,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-vurify-viewer__meta-row">
        <DocField id={`${fieldPrefix}.roles.${index}.title`} role="entry">
          <ViewerEditable
            value={asString(role.title ?? role.name)}
            onChange={(title) => {
              onPatch({
                roles: roles.map((row, i) => (i === index ? { ...row, title } : row)),
              })
            }}
            placeholder="Role"
            allowEmpty
            disabled={!editable}
          />
        </DocField>
        {editable ? (
          <ViewerRemoveBtn label={`Remove role ${index + 1}`} onClick={run} />
        ) : null}
      </div>
      <ViewerMotion show={role.bullets != null} className="theme-vurify-viewer__fold">
        <StringListRows
          values={asStringList(role.bullets)}
          onChange={(bullets) => {
            onPatch({
              roles: roles.map((row, i) =>
                i === index ? { ...row, bullets: optionalStringList(bullets) } : row,
              ),
            })
          }}
          editable={editable}
          fieldPrefix={`${fieldPrefix}.roles.${index}.bullets`}
        />
      </ViewerMotion>
    </div>
  )
}

export function ItemLayout({
  kind,
  item,
  editable,
  onPatch,
  fieldPrefix = 'item',
  itemPresenceKey,
}: ItemLayoutProps) {
  if (kind === 'skills') {
    return (
      <div className="theme-vurify-viewer__item-layout">
        <ViewerMotion show={item.category != null} className="theme-vurify-viewer__fold">
          <div className="theme-vurify-viewer__meta-row">
            <DocField id={`${fieldPrefix}.category`} role="entry">
              <ViewerEditable
                value={asString(item.category)}
                onChange={(category) => onPatch({ category: optionalText(category) ?? '' })}
                placeholder="Category"
                allowEmpty
                disabled={!editable}
              />
            </DocField>
            {editable ? (
              <ViewerRemoveBtn
                label="Remove category"
                onClick={() => onPatch({ category: null })}
              />
            ) : null}
          </div>
        </ViewerMotion>
        <ViewerMotion show={item.items != null} className="theme-vurify-viewer__fold">
          <SkillMiniRows
            item={item}
            editable={editable}
            onPatch={onPatch}
            fieldPrefix={fieldPrefix}
          />
        </ViewerMotion>
        <ViewerMotion show={item.bullets != null} className="theme-vurify-viewer__fold">
          <div className="theme-vurify-viewer__band">
            <StringListRows
              values={asStringList(item.bullets)}
              onChange={(bullets) => onPatch({ bullets: optionalStringList(bullets) })}
              editable={editable}
              aria-label="Skill lines"
              fieldPrefix={`${fieldPrefix}.bullets`}
            />
          </div>
        </ViewerMotion>
      </div>
    )
  }

  const known = new Set<string>([
    'id',
    'org',
    'title',
    'role',
    'institution',
    'degree',
    'field',
    'name',
    'start',
    'end',
    'current',
    'date',
    'date_raw',
    'year',
    'location',
    'employment_type',
    'bullets',
    'technologies',
    'stack',
    'url',
    'repo_url',
    'link_label',
    'body',
    'note',
    'summary',
    'description',
    'items',
    'roles',
    ITEM_FIELD_ORDER_KEY,
  ])

  const showLocation = item.location != null
  const linkHref = asString(item.url ?? item.repo_url)
  const linkLabel = asString(item.link_label) || hostnameLinkLabel(linkHref) || ''
  const linkUsesUrlKey = item.url != null || item.repo_url == null

  const primaryKey =
    item.title != null
      ? 'title'
      : item.name != null
        ? 'name'
        : item.org != null
          ? 'org'
          : item.institution != null
            ? 'institution'
            : kind === 'experience' || kind === 'volunteer'
              ? 'title'
              : kind === 'education'
                ? 'institution'
                : kind === 'projects'
                  ? 'name'
                  : 'title'

  const orgKey =
    kind === 'education' || primaryKey === 'org' ? null : item.org != null ? 'org' : null

  const bodyOrder = resolveFieldOrder(item, kind)

  const renderBodySlot = (slot: ItemBodySlot) => {
    switch (slot) {
      case 'employment_type':
        return (
          <ViewerMotion
            key={slot}
            show={
              (kind === 'experience' || kind === 'volunteer') && item.employment_type != null
            }
            className="theme-vurify-viewer__fold"
          >
            <SlotAnchor slotId={itemPresenceKey} slot={slot}>
              <div className="theme-vurify-viewer__meta-row">
                <DocField id={`${fieldPrefix}.employment_type`} role="meta">
                  <ViewerEditable
                    value={asString(item.employment_type)}
                    onChange={(employment_type) =>
                      onPatch({ employment_type: optionalText(employment_type) })
                    }
                    placeholder="Employment type"
                    allowEmpty
                    disabled={!editable}
                  />
                </DocField>
                {editable ? (
                  <ViewerRemoveBtn
                    label="Remove employment type"
                    onClick={() => onPatch({ employment_type: null })}
                  />
                ) : null}
              </div>
            </SlotAnchor>
          </ViewerMotion>
        )
      case 'location':
        return (
          <ViewerMotion key={slot} show={showLocation} className="theme-vurify-viewer__fold">
            <SlotAnchor slotId={itemPresenceKey} slot={slot}>
              <div className="theme-vurify-viewer__meta-row">
                <DocField id={`${fieldPrefix}.location`} role="meta">
                  <ViewerEditable
                    value={asString(item.location)}
                    onChange={(location) => onPatch({ location: optionalText(location) })}
                    placeholder="Location"
                    allowEmpty
                    disabled={!editable}
                  />
                </DocField>
                {editable ? (
                  <ViewerRemoveBtn
                    label="Remove location"
                    onClick={() => onPatch({ location: null })}
                  />
                ) : null}
              </div>
            </SlotAnchor>
          </ViewerMotion>
        )
      case 'text':
        return (
          <SlotAnchor key={slot} slotId={itemPresenceKey} slot={slot}>
            {(['body', 'note', 'summary', 'description'] as const).map((key) => (
              <ViewerMotion
                key={key}
                show={item[key] != null}
                className="theme-vurify-viewer__fold"
              >
                <div className="theme-vurify-viewer__meta-row">
                  <DocField id={`${fieldPrefix}.${key}`} role="body">
                    <ViewerEditable
                      value={asString(item[key])}
                      onChange={(v) => onPatch({ [key]: optionalText(v) })}
                      placeholder="Add text…"
                      allowEmpty
                      multiline
                      disabled={!editable}
                    />
                  </DocField>
                  {editable ? (
                    <ViewerRemoveBtn
                      label="Remove text"
                      onClick={() => onPatch({ [key]: null })}
                    />
                  ) : null}
                </div>
              </ViewerMotion>
            ))}
          </SlotAnchor>
        )
      case 'list':
        return (
          <ViewerMotion
            key={slot}
            show={item.bullets != null}
            className="theme-vurify-viewer__fold"
          >
            <SlotAnchor slotId={itemPresenceKey} slot={slot}>
              <div className="theme-vurify-viewer__band">
                <StringListRows
                  values={asStringList(item.bullets)}
                  onChange={(bullets) => onPatch({ bullets: optionalStringList(bullets) })}
                  editable={editable}
                  aria-label="Bullets"
                  fieldPrefix={`${fieldPrefix}.bullets`}
                />
              </div>
            </SlotAnchor>
          </ViewerMotion>
        )
      case 'footer':
        return (
          <div key={slot}>
            <ViewerMotion
              show={item.technologies != null}
              className="theme-vurify-viewer__fold"
            >
              <SlotAnchor slotId={itemPresenceKey} slot={slot}>
                <ItemFooterList
                  values={asStringList(item.technologies)}
                  onChange={(technologies) =>
                    onPatch({ technologies: optionalStringList(technologies) })
                  }
                  editable={editable}
                  placeholder="Tech"
                  aria-label="Tech stack"
                  fieldPrefix={`${fieldPrefix}.tech`}
                />
              </SlotAnchor>
            </ViewerMotion>
            <ViewerMotion show={item.stack != null} className="theme-vurify-viewer__fold">
              <SlotAnchor slotId={itemPresenceKey} slot={slot}>
                <ItemFooterList
                  values={asStringList(item.stack)}
                  onChange={(stack) => onPatch({ stack: optionalStringList(stack) })}
                  editable={editable}
                  placeholder="Stack"
                  aria-label="Stack"
                  fieldPrefix={`${fieldPrefix}.stack`}
                />
              </SlotAnchor>
            </ViewerMotion>
          </div>
        )
      case 'link':
        return (
          <ViewerMotion
            key={slot}
            show={item.url != null || item.repo_url != null}
            className="theme-vurify-viewer__fold"
          >
            <SlotAnchor slotId={itemPresenceKey} slot={slot}>
              <div className="theme-vurify-viewer__meta-row">
                <DocField id={`${fieldPrefix}.url`} role="meta">
                  <ViewerLinkField
                    label={linkLabel}
                    url={linkHref}
                    editable={editable}
                    placeholderLabel="Link"
                    aria-label="Link"
                    onChange={({ label: nextLabel, url: nextUrl }) => {
                      const patch: VurifyViewerItem = {
                        link_label: optionalText(nextLabel),
                      }
                      if (linkUsesUrlKey) patch.url = optionalText(nextUrl) ?? ''
                      else patch.repo_url = optionalText(nextUrl) ?? ''
                      onPatch(patch)
                    }}
                    onRemove={() => onPatch({ url: null, repo_url: null, link_label: null })}
                  />
                </DocField>
              </div>
            </SlotAnchor>
          </ViewerMotion>
        )
      case 'roles':
        return Array.isArray(item.roles) ? (
          <SlotAnchor key={slot} slotId={itemPresenceKey} slot={slot}>
            <div className="theme-vurify-viewer__roles">
              {(item.roles as VurifyViewerItem[]).map((role, index) => (
                <RoleBlock
                  key={asString(role.id) || `${fieldPrefix}-role-${index}`}
                  role={role}
                  index={index}
                  editable={editable}
                  fieldPrefix={fieldPrefix}
                  roles={item.roles as VurifyViewerItem[]}
                  onPatch={onPatch}
                />
              ))}
            </div>
          </SlotAnchor>
        ) : null
      default:
        return null
    }
  }

  return (
    <div className="theme-vurify-viewer__item-layout">
      <div className="theme-vurify-viewer__entry-head">
        <div className="theme-vurify-viewer__entry-main">
          {item[primaryKey] != null || editable ? (
            <DocField id={`${fieldPrefix}.${primaryKey}`} role="entry">
              <ViewerEditable
                value={asString(item[primaryKey])}
                onChange={(v) => onPatch({ [primaryKey]: v })}
                placeholder={primaryKey === 'institution' ? 'Institution' : 'Title'}
                allowEmpty
                disabled={!editable}
              />
            </DocField>
          ) : null}

          <ViewerMotion show={Boolean(orgKey)} className="theme-vurify-viewer__fold">
            <div className="theme-vurify-viewer__meta-row">
              <DocField id={`${fieldPrefix}.${orgKey ?? 'org'}`} role="org">
                <ViewerEditable
                  value={asString(orgKey ? item[orgKey] : '')}
                  onChange={(v) => {
                    if (!orgKey) return
                    onPatch({ [orgKey]: optionalText(v) })
                  }}
                  placeholder="Organization"
                  allowEmpty
                  disabled={!editable}
                />
              </DocField>
              {editable && orgKey ? (
                <ViewerRemoveBtn
                  label="Remove organization"
                  onClick={() => onPatch({ [orgKey]: null })}
                />
              ) : null}
            </div>
          </ViewerMotion>

          <ViewerMotion
            show={kind === 'education' && (item.degree != null || item.field != null)}
            className="theme-vurify-viewer__fold"
          >
            <div className="theme-vurify-viewer__entry-sub">
              <ViewerMotion show={item.degree != null} className="theme-vurify-viewer__fold">
                <DocField id={`${fieldPrefix}.degree`} role="org">
                  <ViewerEditable
                    value={asString(item.degree)}
                    onChange={(degree) => onPatch({ degree: optionalText(degree) })}
                    placeholder="Degree"
                    allowEmpty
                    disabled={!editable}
                  />
                </DocField>
              </ViewerMotion>
              <ViewerMotion
                show={item.degree != null && item.field != null}
                className="theme-vurify-viewer__fold"
                as="span"
              >
                <span className="theme-vurify-viewer__date-dash" aria-hidden>
                  ·
                </span>
              </ViewerMotion>
              <ViewerMotion show={item.field != null} className="theme-vurify-viewer__fold">
                <DocField id={`${fieldPrefix}.field`} role="org">
                  <ViewerEditable
                    value={asString(item.field)}
                    onChange={(field) => onPatch({ field: optionalText(field) })}
                    placeholder="Field"
                    allowEmpty
                    disabled={!editable}
                  />
                </DocField>
              </ViewerMotion>
              {editable ? (
                <ViewerRemoveBtn
                  label="Remove degree / field"
                  onClick={() => onPatch({ degree: null, field: null })}
                />
              ) : null}
            </div>
          </ViewerMotion>

          <ViewerMotion
            show={kind === 'projects' && item.role != null}
            className="theme-vurify-viewer__fold"
          >
            <div className="theme-vurify-viewer__meta-row">
              <DocField id={`${fieldPrefix}.role`} role="org">
                <ViewerEditable
                  value={asString(item.role)}
                  onChange={(role) => onPatch({ role: optionalText(role) })}
                  placeholder="Role"
                  allowEmpty
                  disabled={!editable}
                />
              </DocField>
              {editable ? (
                <ViewerRemoveBtn
                  label="Remove role"
                  onClick={() => onPatch({ role: null })}
                />
              ) : null}
            </div>
          </ViewerMotion>
        </div>

        <DateRangeFields
          item={item}
          editable={editable}
          onPatch={onPatch}
          fieldPrefix={fieldPrefix}
        />
      </div>

      {bodyOrder.map((slot) => renderBodySlot(slot))}

      <GenericExtraFields
        item={item}
        knownKeys={known}
        editable={editable}
        onPatch={onPatch}
        fieldPrefix={fieldPrefix}
      />
    </div>
  )
}
