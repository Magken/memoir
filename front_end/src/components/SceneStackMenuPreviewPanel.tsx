import {
  sceneStackMenuPreviewLayout,
  type SceneStackMenuPreview,
  type SceneStackMenuPreviewColumn,
} from '../lib/menus/sceneStackMenu'
import { PointerFollowDeck } from './PointerFollowDeck'

type SceneStackMenuPreviewPanelProps = {
  preview: SceneStackMenuPreview
  /** BEM host: menu side panel or footer column. */
  host: 'menu' | 'footer'
  reducedMotion?: boolean
  /** Closed peels still fill the viewport — false pauses idle illustration orbit. */
  motionEnabled?: boolean
}

const HOST_PREFIX = {
  menu: 'theme-scene-stack-menu',
  footer: 'home-footer',
} as const

/**
 * Shared menu/footer preview: media+copy, cover (image under text), copy-only,
 * pathway split, or pricing cards.
 */
export function SceneStackMenuPreviewPanel({
  preview,
  host,
  reducedMotion = false,
  motionEnabled = true,
}: SceneStackMenuPreviewPanelProps) {
  const prefix = HOST_PREFIX[host]
  const layout = sceneStackMenuPreviewLayout(preview)

  return (
    <article
      className={[
        `${prefix}__preview-panel`,
        reducedMotion ? `${prefix}__preview-panel--instant` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-layout={layout}
    >
      {layout === 'media' && preview.image ? (
        <>
          <div
            className={[
              `${prefix}__preview-media`,
              preview.image.fit === 'contain' ? `${prefix}__preview-media--contain` : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <PointerFollowDeck
              className={`${prefix}__preview-follow`}
              fit={preview.image.fit === 'contain' ? 'contain' : 'cover'}
              idleWobble
              motionEnabled={motionEnabled}
              reducedMotion={reducedMotion}
            >
              <img
                src={preview.image.src}
                alt={preview.image.alt}
                className={[
                  `${prefix}__preview-image`,
                  preview.image.fit === 'contain' ? `${prefix}__preview-image--contain` : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                decoding="async"
                loading="lazy"
                draggable={false}
              />
            </PointerFollowDeck>
          </div>
          <PreviewCopy prefix={prefix} preview={preview} />
        </>
      ) : null}

      {layout === 'cover' && preview.image ? (
        <>
          <div className={`${prefix}__preview-media ${prefix}__preview-media--cover`} aria-hidden>
            <PointerFollowDeck
              className={`${prefix}__preview-follow`}
              fit="cover"
              idleWobble
              motionEnabled={motionEnabled}
              reducedMotion={reducedMotion}
              decorative
            >
              <img
                src={preview.image.src}
                alt=""
                className={`${prefix}__preview-image`}
                decoding="async"
                loading="lazy"
              />
            </PointerFollowDeck>
          </div>
          <div className={`${prefix}__preview-cover-fg`}>
            {preview.columns?.length ? (
              <PreviewSplit prefix={prefix} title={preview.title} columns={preview.columns} />
            ) : (
              <PreviewCopy prefix={prefix} preview={preview} />
            )}
          </div>
        </>
      ) : null}

      {layout === 'copy' ? <PreviewCopy prefix={prefix} preview={preview} /> : null}

      {layout === 'split' && preview.columns?.length ? (
        <PreviewSplit prefix={prefix} title={preview.title} columns={preview.columns} />
      ) : null}

      {layout === 'pricing' && preview.pricingCards?.length ? (
        <div className={`${prefix}__preview-pricing`}>
          <div className={`${prefix}__preview-pricing-head`}>
            {preview.overline ? (
              <p className={`${prefix}__preview-overline type-overline type-muted`}>
                {preview.overline}
              </p>
            ) : null}
            <h3 className={`${prefix}__preview-title type-display-md`}>{preview.title}</h3>
            {preview.body ? (
              <p className={`${prefix}__preview-body type-body-sm type-muted`}>{preview.body}</p>
            ) : null}
          </div>
          <div className={`${prefix}__preview-pricing-grid`}>
            {preview.pricingCards.map((card) => (
              <div key={card.id} className={`${prefix}__preview-price-card`} data-tier={card.id}>
                <p className={`${prefix}__preview-price-title type-overline`}>{card.title}</p>
                <p className={`${prefix}__preview-price-amount type-display-md`}>{card.price}</p>
                <p className={`${prefix}__preview-price-note type-caption type-muted`}>{card.note}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  )
}

function PreviewCopy({
  prefix,
  preview,
}: {
  prefix: string
  preview: SceneStackMenuPreview
}) {
  return (
    <div className={`${prefix}__preview-copy theme-shell-divider`}>
      {preview.overline ? (
        <p className={`${prefix}__preview-overline type-overline type-muted`}>{preview.overline}</p>
      ) : null}
      <h3 className={`${prefix}__preview-title type-display-md`}>{preview.title}</h3>
      {preview.body ? (
        <p
          className={[
            `${prefix}__preview-body`,
            prefix === 'theme-scene-stack-menu' ? 'type-body' : 'type-body-sm',
            'type-muted',
            prefix === 'theme-scene-stack-menu' ? 'prose-measure' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {preview.body}
        </p>
      ) : null}
      {preview.credit ? (
        <p className={`${prefix}__preview-credit type-caption type-muted`}>{preview.credit}</p>
      ) : null}
    </div>
  )
}

function PreviewSplit({
  prefix,
  title,
  columns,
}: {
  prefix: string
  title?: string
  columns: readonly SceneStackMenuPreviewColumn[]
}) {
  return (
    <div className={`${prefix}__preview-split`}>
      {title ? (
        <h3 className={`${prefix}__preview-split-heading type-display-md`}>{title}</h3>
      ) : null}
      {columns.map((column) => (
        <div key={column.title} className={`${prefix}__preview-column`}>
          {column.overline ? (
            <p className={`${prefix}__preview-overline type-overline type-muted`}>
              {column.overline}
            </p>
          ) : null}
          <h3 className={`${prefix}__preview-title type-display-md`}>{column.title}</h3>
          <p className={`${prefix}__preview-body type-body-sm type-muted`}>{column.body}</p>
        </div>
      ))}
    </div>
  )
}
