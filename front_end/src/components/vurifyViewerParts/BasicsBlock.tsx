import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import type { VurifyViewerBasics, VurifyViewerDoc } from './types'
import { asString } from './types'
import { BlockChrome } from './BlockChrome'
import { DocField } from './DocField'
import { ViewerEditable } from './ViewerEditable'
import { ViewerLinkField } from './ViewerLinkField'
import { ViewerRule } from './ViewerRule'
import { DEFAULT_LINK_KIND, type EdgeElementId } from './elementMap'
import { patchBasics } from './patch'
import { VIEWER_TOC_BASICS_ID } from './viewerToc'
import {
  useLeaveThen,
  useMountEnterClass,
  ViewerMotion,
} from './ViewerMotion'

type BasicsBlockProps = {
  basics: VurifyViewerBasics
  editable?: boolean
  onChange: (next: VurifyViewerDoc) => void
  doc: VurifyViewerDoc
}

function SoftSep() {
  return <span className="theme-vurify-viewer__soft-sep" aria-hidden />
}

function ChipRemove({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      className="theme-vurify-viewer__chip-remove"
      aria-label={label}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onRemove}
    >
      <X aria-hidden className="size-3" strokeWidth={1.75} />
    </button>
  )
}

function TextSlot({
  show,
  className = '',
  removeLabel,
  editable,
  onRemove,
  children,
}: {
  show: boolean
  className?: string
  removeLabel: string
  editable?: boolean
  onRemove: () => void
  children: ReactNode
}) {
  return (
    <ViewerMotion
      show={show}
      className={['theme-vurify-viewer__text-slot', className].filter(Boolean).join(' ')}
    >
      {editable ? <ChipRemove label={removeLabel} onRemove={onRemove} /> : null}
      {children}
    </ViewerMotion>
  )
}

function MotionChip({
  className,
  onRemove,
  removeLabel,
  editable,
  children,
}: {
  className: string
  onRemove: () => void
  removeLabel: string
  editable?: boolean
  children: ReactNode
}) {
  const enterClass = useMountEnterClass()
  const { run, leaveClass } = useLeaveThen(onRemove)
  return (
    <li
      className={['theme-vurify-viewer__motion', className, enterClass, leaveClass]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
      {editable ? <ChipRemove label={removeLabel} onRemove={run} /> : null}
    </li>
  )
}

function LinkMotionChip({
  onRemove,
  renderField,
}: {
  onRemove: () => void
  renderField: (api: { onRemove: () => void }) => ReactNode
}) {
  const enterClass = useMountEnterClass()
  const { run, leaveClass } = useLeaveThen(onRemove)
  return (
    <li
      className={[
        'theme-vurify-viewer__motion',
        'theme-vurify-viewer__link-bit',
        enterClass,
        leaveClass,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {renderField({ onRemove: run })}
    </li>
  )
}

export function BasicsBlock({ basics, editable = true, onChange, doc }: BasicsBlockProps) {
  const [headlineSlot, setHeadlineSlot] = useState(() => Boolean(basics.headline?.trim()))
  const [summarySlot, setSummarySlot] = useState(() => Boolean(basics.summary?.trim()))

  useEffect(() => {
    if (basics.headline?.trim()) setHeadlineSlot(true)
    if (basics.summary?.trim()) setSummarySlot(true)
  }, [basics.headline, basics.summary])

  const commit = (patch: Partial<VurifyViewerBasics>) => {
    onChange(patchBasics(doc, patch))
  }

  const onEdge = (id: EdgeElementId) => {
    if (id === 'title' && !basics.display_name?.trim()) commit({ display_name: '' })
    if (id === 'subheading' && !basics.headline?.trim() && !headlineSlot) {
      commit({ headline: '' })
      setHeadlineSlot(true)
    }
    if (id === 'text' && !basics.summary?.trim() && !summarySlot) {
      commit({ summary: '' })
      setSummarySlot(true)
    }
    if (id === 'list') commit({ emails: [...(basics.emails ?? []), ''] })
    if (id === 'phone') {
      commit({ phones: [...(basics.phones ?? []), { value: '', label: null }] })
    }
    if (id === 'location') {
      commit({
        locations: [...(basics.locations ?? []), { raw: '' }],
      })
    }
    if (id === 'link') {
      commit({
        links: [
          ...(basics.links ?? []),
          { url: '', kind: DEFAULT_LINK_KIND, label: '' },
        ],
      })
    }
    if (id === 'language') {
      commit({
        languages: [...(basics.languages ?? []), { name: '', level: '' }],
      })
    }
  }

  type ContactBit = {
    id: string
    value: string
    onChange: (v: string) => void
    onRemove: () => void
    placeholder: string
    removeLabel: string
  }

  const contactBits: ContactBit[] = []

  basics.emails?.forEach((email, index) => {
    contactBits.push({
      id: `basics.email.${index}`,
      value: email,
      placeholder: 'email@example.com',
      removeLabel: 'Remove email',
      onChange: (next) => {
        if (!next.trim()) {
          commit({ emails: basics.emails.filter((_, i) => i !== index) })
          return
        }
        const emails = basics.emails.map((row, i) => (i === index ? next : row))
        commit({ emails })
      },
      onRemove: () => commit({ emails: basics.emails.filter((_, i) => i !== index) }),
    })
  })
  basics.phones?.forEach((phone, index) => {
    contactBits.push({
      id: `basics.phone.${index}`,
      value: asString(phone.value),
      placeholder: 'Phone',
      removeLabel: 'Remove phone',
      onChange: (value) => {
        if (!value.trim()) {
          commit({ phones: basics.phones.filter((_, i) => i !== index) })
          return
        }
        const phones = basics.phones.map((row, i) => (i === index ? { ...row, value } : row))
        commit({ phones })
      },
      onRemove: () => commit({ phones: basics.phones.filter((_, i) => i !== index) }),
    })
  })
  basics.locations?.forEach((loc, index) => {
    const shown =
      asString(loc.raw) || [loc.city, loc.region, loc.country].filter(Boolean).join(', ')
    contactBits.push({
      id: `basics.loc.${index}`,
      value: shown,
      placeholder: 'Location',
      removeLabel: 'Remove location',
      onChange: (raw) => {
        if (!raw.trim()) {
          commit({ locations: basics.locations.filter((_, i) => i !== index) })
          return
        }
        const locations = basics.locations.map((row, i) =>
          i === index ? { ...row, raw } : row,
        )
        commit({ locations })
      },
      onRemove: () => commit({ locations: basics.locations.filter((_, i) => i !== index) }),
    })
  })

  const links = basics.links ?? []
  const languages = basics.languages ?? []
  const showContact = contactBits.length > 0
  const showLinks = links.length > 0
  const showLanguages = languages.length > 0
  const showHeadline = Boolean(basics.headline?.trim()) || headlineSlot
  const showSummary = Boolean(basics.summary?.trim()) || summarySlot

  return (
    <BlockChrome
      editable={editable}
      target={{ scope: 'basics' }}
      basics={{ ...basics, headlineSlot, summarySlot }}
      onSelect={onEdge}
      className="theme-vurify-viewer__basics"
    >
      <header
        className="theme-vurify-viewer__masthead"
        id={VIEWER_TOC_BASICS_ID}
        data-doc-toc={VIEWER_TOC_BASICS_ID}
      >
        <DocField id="basics.display_name" role="display">
          <ViewerEditable
            value={basics.display_name}
            onChange={(display_name) => commit({ display_name })}
            placeholder="Your name"
            allowEmpty
            disabled={!editable}
          />
        </DocField>

        <TextSlot
          show={showHeadline}
          className="theme-vurify-viewer__text-slot--lead"
          removeLabel="Remove headline"
          editable={editable}
          onRemove={() => {
            commit({ headline: '' })
            setHeadlineSlot(false)
          }}
        >
          <DocField id="basics.headline" role="lead">
            <ViewerEditable
              value={basics.headline}
              onChange={(headline) => {
                commit({ headline })
                if (!headline.trim()) setHeadlineSlot(false)
                else setHeadlineSlot(true)
              }}
              placeholder="Headline"
              allowEmpty
              disabled={!editable}
            />
          </DocField>
        </TextSlot>

        <ViewerMotion show={showContact} as="div" className="theme-vurify-viewer__contact-wrap">
          <ul className="theme-vurify-viewer__contact-line" aria-label="Contact">
            {contactBits.map((bit, index) => (
              <MotionChip
                key={bit.id}
                className="theme-vurify-viewer__contact-bit"
                removeLabel={bit.removeLabel}
                editable={editable}
                onRemove={bit.onRemove}
              >
                {index > 0 ? <SoftSep /> : null}
                <DocField id={bit.id} role="meta">
                  <ViewerEditable
                    value={bit.value}
                    onChange={bit.onChange}
                    placeholder={bit.placeholder}
                    allowEmpty
                    disabled={!editable}
                  />
                </DocField>
              </MotionChip>
            ))}
          </ul>
        </ViewerMotion>

        {showContact && (showLinks || showLanguages) ? (
          <ViewerRule className="theme-vurify-viewer__rule--soft" />
        ) : null}

        <ViewerMotion show={showLinks} as="div" className="theme-vurify-viewer__links-wrap">
          <ul className="theme-vurify-viewer__links-line" aria-label="Links">
            {links.map((link, index) => (
              <LinkMotionChip
                key={`link-${index}`}
                onRemove={() => {
                  commit({ links: links.filter((_, i) => i !== index) })
                }}
                renderField={({ onRemove }) => (
                  <>
                    {index > 0 ? <SoftSep /> : null}
                    <DocField id={`basics.link.${index}`} role="meta">
                      <ViewerLinkField
                        label={asString(link.label)}
                        url={asString(link.url)}
                        editable={editable}
                        placeholderLabel={link.kind ? String(link.kind) : 'Link'}
                        onChange={({ label, url }) => {
                          const next = links.map((row, i) =>
                            i === index ? { ...row, label, url } : row,
                          )
                          commit({ links: next })
                        }}
                        onRemove={onRemove}
                      />
                    </DocField>
                  </>
                )}
              />
            ))}
          </ul>
        </ViewerMotion>

        {showLinks && showLanguages ? (
          <ViewerRule className="theme-vurify-viewer__rule--soft" />
        ) : null}

        <ViewerMotion show={showLanguages} as="div" className="theme-vurify-viewer__languages-wrap">
          <ul className="theme-vurify-viewer__languages" aria-label="Languages">
            {languages.map((lang, index) => (
              <MotionChip
                key={`lang-${index}`}
                className="theme-vurify-viewer__language-row"
                removeLabel="Remove language"
                editable={editable}
                onRemove={() =>
                  commit({ languages: languages.filter((_, i) => i !== index) })
                }
              >
                {index > 0 ? <SoftSep /> : null}
                <DocField id={`basics.lang.${index}.name`} role="meta">
                  <ViewerEditable
                    value={asString(lang.name)}
                    onChange={(name) => {
                      const level = asString(lang.level)
                      if (!name.trim() && !level.trim()) {
                        commit({ languages: languages.filter((_, i) => i !== index) })
                        return
                      }
                      const next = languages.map((row, i) =>
                        i === index ? { ...row, name } : row,
                      )
                      commit({ languages: next })
                    }}
                    placeholder="Language"
                    allowEmpty
                    disabled={!editable}
                  />
                </DocField>
                <span className="theme-vurify-viewer__contact-sep" aria-hidden>
                  ·
                </span>
                <DocField
                  id={`basics.lang.${index}.level`}
                  role="meta"
                  className="theme-vurify-viewer__lang-level"
                >
                  <ViewerEditable
                    value={asString(lang.level)}
                    onChange={(level) => {
                      const name = asString(lang.name)
                      if (!name.trim() && !level.trim()) {
                        commit({ languages: languages.filter((_, i) => i !== index) })
                        return
                      }
                      const next = languages.map((row, i) =>
                        i === index ? { ...row, level } : row,
                      )
                      commit({ languages: next })
                    }}
                    placeholder="Level"
                    allowEmpty
                    disabled={!editable}
                  />
                </DocField>
              </MotionChip>
            ))}
          </ul>
        </ViewerMotion>

        <TextSlot
          show={showSummary}
          className="theme-vurify-viewer__text-slot--summary"
          removeLabel="Remove summary"
          editable={editable}
          onRemove={() => {
            commit({ summary: '' })
            setSummarySlot(false)
          }}
        >
          <DocField id="basics.summary" role="body" className="theme-vurify-viewer__summary">
            <ViewerEditable
              value={basics.summary}
              onChange={(summary) => {
                commit({ summary })
                if (!summary.trim()) setSummarySlot(false)
                else setSummarySlot(true)
              }}
              placeholder="Summary"
              allowEmpty
              multiline
              rows={4}
              disabled={!editable}
            />
          </DocField>
        </TextSlot>

        <ViewerRule className="theme-vurify-viewer__rule--strong" />
      </header>
    </BlockChrome>
  )
}
