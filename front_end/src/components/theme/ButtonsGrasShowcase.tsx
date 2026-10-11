/**
 * Theme lab — GRAS controls use the same nest hairline / prose recipes as the site.
 */
import { Link } from 'react-router-dom'
import { GrasUnderlineButton } from '../GrasUnderlineButton'
import { LinkHoverFx } from '../LinkHoverFx'
import { TypeAnimText } from '../TypeAnimText'
import { PROSE_INLINE_CLASS, PROSE_INLINE_P_CLASS, proseInlineLinkClass } from '../../lib/animations/proseInlineLinks'

export function ButtonsGrasShowcase() {
  return (
    <div className="space-y-10">
      <p className="type-body-sm type-muted prose-measure mb-0">
        GRAS product chrome — nest rows and labels use{' '}
        <code className="type-code">GrasUnderlineButton</code> (hairline{' '}
        <code className="type-code">eirene</code> from{' '}
        <Link className="underline" to="/theme?section=typography-link-hovers">
          Link underlines
        </Link>
        ). Do not invent a second underline. Codrops presets stay on{' '}
        <code className="type-code">LinkHoverFx</code>. Vurify Elara lives under{' '}
        <Link className="underline" to="/theme?section=buttons-vurify">
          Vurify buttons
        </Link>
        .
      </p>

      <section className="space-y-4">
        <p className="type-overline">Nest row — site recipe</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          Same classes as [LclViewportPreview] nest: `theme-lcl-layout__nest-item` + hairline eirene
          pill. Product About / LCL / Atlas must use this button, not a hand-rolled class string.
        </p>
        <ul className="theme-lcl-layout__nest m-0 list-none p-0">
          {['Tide tables', 'Salt air', 'Lamp glass', 'Stone drum'].map((label) => (
            <li key={label}>
              <GrasUnderlineButton layout="nest">
                <TypeAnimText anim="slide-left" trigger="hover" className="type-h3 mb-0">
                  {label}
                </TypeAnimText>
              </GrasUnderlineButton>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Inline label</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          Content-sized hairline eirene — still the same wipe/pill, no square frame. Type scale comes
          from children (`type-h3` / `type-label`), not a second size system.
        </p>
        <div className="flex flex-wrap items-end gap-8">
          <GrasUnderlineButton layout="inline">
            <span className="type-label mb-0">Small label</span>
          </GrasUnderlineButton>
          <GrasUnderlineButton layout="inline">
            <span className="type-h3 mb-0">Tide</span>
          </GrasUnderlineButton>
          <GrasUnderlineButton layout="inline" disabled>
            <span className="type-h3 mb-0">Disabled</span>
          </GrasUnderlineButton>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Codrops Eirene (link-fx)</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          Site nest rows use the <strong>inverse</strong> hairline eirene. Codrops{' '}
          <code className="type-code">theme-link-fx--eirene</code> (pill flattens) is for marketing
          links via <code className="type-code">LinkHoverFx</code> — not a second nest button.
        </p>
        <div className="flex flex-wrap items-end gap-8">
          <LinkHoverFx variant="eirene">Contact</LinkHoverFx>
          <LinkHoverFx variant="elara">Studio</LinkHoverFx>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">In prose</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          Paragraph embeds stay on <code className="type-code">proseInlineLinkClass</code> only.
        </p>
        <div className={`${PROSE_INLINE_CLASS} prose-measure`}>
          <p className={`${PROSE_INLINE_P_CLASS} type-body-sm mb-0`}>
            A light covers a{' '}
            <button type="button" className={proseInlineLinkClass('md')}>
              reach
            </button>
            , and the lamp sits in a{' '}
            <button type="button" className={proseInlineLinkClass('sm')}>
              cage
            </button>
            .
          </p>
        </div>
      </section>
    </div>
  )
}
