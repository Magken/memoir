import type { LucideIcon } from 'lucide-react'
import { Plus } from 'lucide-react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { useCallback, useId, useState } from 'react'
import { buttonSurfaceClass, type ButtonVariant } from '../lib/ui/buttonStyles'
import { BgParallaxScene } from './BgParallaxScene'
import { Button } from './Button'
import { TypeAnimText, type TypeAnimPreset } from './TypeAnimText'

export type AccordionPanelLink = {
  href: string
  label: string
}

export type AccordionItemData = {
  id: string
  title: string
  /** Plain string — animated on open; ReactNode — static panel reveal only */
  content: string | ReactNode
  icon?: LucideIcon
  /** `panels` variant — cover image with radial mask */
  image?: { src: string; alt: string }
  /** `panels` variant — action link; icon-only when collapsed, icon + label when open */
  link?: AccordionPanelLink
}

export type AccordionVariant = 'vertical' | 'panels'

type AccordionProps = {
  items: readonly AccordionItemData[]
  /** `vertical` — stacked FAQ · `panels` — expanding columns + rotated titles */
  variant?: AccordionVariant
  /** Only one panel open at a time (like `name` on native details) */
  exclusive?: boolean
  defaultOpenId?: string | null
  /** Enter preset for string body (`vertical`) — reserved; vertical uses CSS panel reveal for matched open/close timing */
  bodyAnim?: TypeAnimPreset
  /** Hover slide on trigger title — `vertical` only */
  titleAnim?: TypeAnimPreset
  /** Rotated column title — `panels` only; vertical sweep (default `slide-up`) */
  panelTitleAnim?: TypeAnimPreset
  /** `panels` — cover image shifts opposite pointer on hover */
  panelBgParallax?: boolean
  /** Parallax shift multiplier (`1` default, `0.25`–`2`) */
  panelBgParallaxStrength?: number
  triggerVariant?: ButtonVariant
  className?: string
  debug?: boolean
}

function panelGridColumns(count: number, activeIndex: number): string {
  return Array.from({ length: count }, (_, index) => (index === activeIndex ? '10fr' : '1fr')).join(
    ' ',
  )
}

export function Accordion({
  items,
  variant = 'vertical',
  exclusive = true,
  defaultOpenId = null,
  bodyAnim: _bodyAnim = 'slide-up',
  titleAnim = 'slide-right',
  panelTitleAnim = 'slide-up',
  panelBgParallax = false,
  panelBgParallaxStrength,
  triggerVariant = 'ghost',
  className = '',
  debug = false,
}: AccordionProps) {
  const groupId = useId().replace(/:/g, '')
  const panelsDefaultId = defaultOpenId ?? items[0]?.id ?? null
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const initial = variant === 'panels' ? panelsDefaultId : defaultOpenId
    if (!initial) return new Set()
    return new Set([initial])
  })

  const activate = useCallback(
    (id: string) => {
      setOpenIds((current) => {
        const isOpen = current.has(id)
        if (variant === 'panels' && exclusive) {
          if (current.size === 1 && current.has(id)) return current
          return new Set([id])
        }
        if (exclusive) {
          return isOpen ? new Set() : new Set([id])
        }
        const next = new Set(current)
        if (isOpen) next.delete(id)
        else next.add(id)
        return next
      })
    },
    [exclusive, variant],
  )

  const hasOpen = openIds.size > 0
  const activePanelIndex = items.findIndex((item) => openIds.has(item.id))

  if (debug) {
    console.debug('[Accordion]', { variant, exclusive, openIds: [...openIds], count: items.length })
  }

  if (variant === 'panels') {
    const gridColumns = panelGridColumns(items.length, Math.max(0, activePanelIndex))

    return (
      <div
        className={[
          'theme-accordion',
          'theme-accordion--panels',
          panelBgParallax ? 'theme-accordion--panels-parallax' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        data-accordion-group={groupId}
      >
        <ul
          className="theme-accordion__panels"
          role="tablist"
          aria-label="Accordion panels"
          style={{ gridTemplateColumns: gridColumns } as CSSProperties}
        >
          {items.map((item) => {
            const isOpen = openIds.has(item.id)
            const LeadIcon = item.icon

            const onKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                activate(item.id)
              }
            }

            const columnArticle = (
              <article
                className="theme-accordion__column-article"
                role="tab"
                tabIndex={isOpen ? 0 : -1}
                aria-selected={isOpen}
                aria-controls={`${groupId}-${item.id}-panel`}
                id={`${groupId}-${item.id}-tab`}
                onClick={() => activate(item.id)}
                onKeyDown={onKeyDown}
              >
                {item.image ? (
                  <img
                    className={[
                      'theme-accordion__column-media',
                      panelBgParallax ? 'theme-bg-parallax__media' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    src={item.image.src}
                    alt={item.image.alt}
                    loading="lazy"
                  />
                ) : null}
                <h3 className="theme-accordion__column-heading type-overline type-tracking-wide type-invert">
                  <TypeAnimText
                    anim={panelTitleAnim}
                    trigger="hover"
                    className="theme-accordion__column-heading-text"
                  >
                    {item.title}
                  </TypeAnimText>
                </h3>
                {typeof item.content === 'string' ? (
                  <p
                    id={`${groupId}-${item.id}-panel`}
                    className="theme-accordion__column-text type-body-sm type-muted"
                    role="tabpanel"
                    aria-labelledby={`${groupId}-${item.id}-tab`}
                    aria-hidden={!isOpen}
                  >
                    {item.content}
                  </p>
                ) : (
                  <div
                    id={`${groupId}-${item.id}-panel`}
                    className="theme-accordion__column-text"
                    role="tabpanel"
                    aria-labelledby={`${groupId}-${item.id}-tab`}
                    aria-hidden={!isOpen}
                  >
                    {isOpen ? item.content : null}
                  </div>
                )}
                {LeadIcon && item.link ? (
                  <a
                    href={item.link.href}
                    className={buttonSurfaceClass({
                      size: 'sm',
                      variant: 'action',
                      className: 'theme-accordion__column-action',
                    })}
                    aria-label={isOpen ? undefined : item.link.label}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <LeadIcon aria-hidden className="theme-btn__icon shrink-0" strokeWidth={2} />
                    <TypeAnimText
                      anim="flip"
                      trigger="hover"
                      inButton
                      className="theme-btn__label shrink-0"
                    >
                      {item.link.label}
                    </TypeAnimText>
                  </a>
                ) : null}
              </article>
            )

            return (
              <li
                key={item.id}
                role="presentation"
                className={[
                  'theme-accordion__column',
                  isOpen ? 'theme-accordion__column--open' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-active={isOpen ? 'true' : 'false'}
                onPointerEnter={() => activate(item.id)}
              >
                {panelBgParallax && item.image ? (
                  <BgParallaxScene
                    strength={panelBgParallaxStrength}
                    className="theme-accordion__column-scene"
                  >
                    {columnArticle}
                  </BgParallaxScene>
                ) : (
                  columnArticle
                )}
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div
      className={[
        'theme-accordion',
        'theme-accordion--vertical',
        hasOpen ? 'theme-accordion--has-open' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-accordion-group={groupId}
    >
      {items.map((item) => {
        const isOpen = openIds.has(item.id)
        const LeadIcon = item.icon

        return (
          <section
            key={item.id}
            className={['theme-accordion__item', isOpen ? 'theme-accordion__item--open' : '']
              .filter(Boolean)
              .join(' ')}
          >
            <Button
              type="button"
              variant={triggerVariant}
              active={isOpen}
              id={`${groupId}-${item.id}-trigger`}
              aria-expanded={isOpen}
              aria-controls={`${groupId}-${item.id}-panel`}
              className="theme-accordion__trigger"
              onClick={() => activate(item.id)}
            >
              {LeadIcon ? (
                <LeadIcon aria-hidden className="theme-accordion__lead-icon" strokeWidth={2} />
              ) : null}
              <TypeAnimText
                anim={titleAnim}
                trigger="hover"
                inButton
                className="theme-accordion__trigger-title"
              >
                {item.title}
              </TypeAnimText>
              <Plus
                aria-hidden
                className={['theme-accordion__chevron', isOpen ? 'theme-accordion__chevron--open' : '']
                  .filter(Boolean)
                  .join(' ')}
                strokeWidth={2}
              />
            </Button>
            <div
              id={`${groupId}-${item.id}-panel`}
              className="theme-accordion__panel"
              role="region"
              aria-hidden={!isOpen}
              aria-labelledby={`${groupId}-${item.id}-trigger`}
            >
              <div
                className={['theme-accordion__panel-inner', 'type-body-sm']
                  .filter(Boolean)
                  .join(' ')}
              >
                {typeof item.content === 'string' ? (
                  <p className="theme-accordion__body-text">{item.content}</p>
                ) : (
                  item.content
                )}
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}
