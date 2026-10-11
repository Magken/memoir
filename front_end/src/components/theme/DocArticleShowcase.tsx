import { useRef, useState, type RefObject } from 'react'
import {
  DOC_ARTICLE_DEMO_LONG_FORM,
  DOC_ARTICLE_DEMO_NEWSLETTER,
  DOC_ARTICLE_LAYOUTS,
  DOC_ARTICLE_SECTION_KINDS,
  type DocArticleTocVariant,
} from '../../lib/docArticle'
import { Select } from '../Select'
import {
  DocArticle,
  DocArticleCallout,
  DocArticleDivider,
  DocArticleHeading,
  DocArticleImage,
  DocArticleLayout,
  DocArticleLink,
  DocArticleList,
  DocArticleParagraph,
  DocArticleQuote,
  DocArticleSection,
  DocArticleShell,
  DocArticleMasthead,
  DocArticleStat,
  DocArticleStats,
  DocArticleTable,
  DocArticleToc,
} from '../DocArticle'

const TOC_VARIANT_OPTIONS = [
  { value: 'list', label: 'List — compact card (all viewports)' },
  { value: 'sticky-anchor', label: 'Sticky anchor — scroll spy (lg+)' },
  { value: 'micro-anchor', label: 'Micro anchor — denser sticky rail (lg+)' },
] as const

function isStickyTocVariant(variant: DocArticleTocVariant): boolean {
  return variant === 'sticky-anchor' || variant === 'micro-anchor'
}

function LongFormChapter({
  id,
  title,
  paragraphs,
  intro,
  subsections,
}: {
  id: string
  title: string
  paragraphs?: readonly string[]
  intro?: string
  subsections?: Record<string, { title: string; body: string }>
}) {
  return (
    <DocArticleSection
      id={id}
      kind="paragraph"
      label={title}
      tags={['long-form']}
      registerInToc={false}
      className="theme-doc-article__section--long-form"
    >
      <DocArticleHeading level={2} sectionId={id}>
        {title}
      </DocArticleHeading>
      {intro ? <DocArticleParagraph variant="lead">{intro}</DocArticleParagraph> : null}
      {paragraphs?.map((paragraph) => (
        <DocArticleParagraph key={paragraph.slice(0, 24)}>{paragraph}</DocArticleParagraph>
      ))}
      {subsections
        ? Object.entries(subsections).map(([subsectionId, subsection]) => (
            <div key={subsectionId}>
              <DocArticleHeading level={3} tocId={subsectionId} tocLabel={subsection.title}>
                {subsection.title}
              </DocArticleHeading>
              <DocArticleParagraph>{subsection.body}</DocArticleParagraph>
            </div>
          ))
        : null}
    </DocArticleSection>
  )
}

function DocArticleDemoBody() {
  const demo = DOC_ARTICLE_DEMO_NEWSLETTER
  const longForm = DOC_ARTICLE_DEMO_LONG_FORM

  return (
    <>
      <DocArticleSection id="intro" kind="custom" label="Introduction" tags={['hero', 'newsletter']} registerInToc={false}>
        <DocArticleHeading level={2} sectionId="intro">
          Introduction
        </DocArticleHeading>
        <DocArticleParagraph variant="lead">{demo.intro}</DocArticleParagraph>
        <DocArticleParagraph dropCap>
          Where product design meets systems thinking — DocArticle is built for long-form reading on wide
          viewports. Scroll the demo to see the sticky anchor TOC highlight the active section and subsection.
        </DocArticleParagraph>
        <DocArticleImage src={demo.heroImage.src} alt={demo.heroImage.alt} caption={demo.heroImage.caption} />
      </DocArticleSection>

      <LongFormChapter id="overview" title={longForm.overview.title} paragraphs={longForm.overview.paragraphs} />
      <LongFormChapter id="difference" title={longForm.difference.title} paragraphs={longForm.difference.paragraphs} />
      <LongFormChapter id="importance" title={longForm.importance.title} paragraphs={longForm.importance.paragraphs} />
      <LongFormChapter
        id="quality"
        title={longForm.quality.title}
        intro={longForm.quality.intro}
        subsections={longForm.quality.subsections}
      />
      <LongFormChapter id="iteration" title={longForm.iteration.title} paragraphs={longForm.iteration.paragraphs} />
      <LongFormChapter id="components" title={longForm.components.title} paragraphs={longForm.components.paragraphs} />
      <LongFormChapter id="motion" title={longForm.motion.title} paragraphs={longForm.motion.paragraphs} />
      <LongFormChapter
        id="collaboration"
        title={longForm.collaboration.title}
        paragraphs={longForm.collaboration.paragraphs}
      />

      <DocArticleSection id="stats" kind="stats" label="Key figures" tags={['newsletter', 'proof']} registerInToc={false}>
        <DocArticleHeading level={2} sectionId="stats">
          Key figures
        </DocArticleHeading>
        <DocArticleStats>
          <DocArticleStat value="12" label="Section kinds" />
          <DocArticleStat value="2" label="TOC variants" />
          <DocArticleStat value="60ch" label="Reading measure" />
          <DocArticleStat value="lg+" label="Anchor TOC" />
        </DocArticleStats>
      </DocArticleSection>

      <DocArticleSection id="body-copy" kind="paragraph" label="Body patterns" tags={['newsletter', 'content']} registerInToc={false}>
        <DocArticleHeading level={2} sectionId="body-copy">
          Body patterns
        </DocArticleHeading>
        <DocArticleParagraph variant="lead">{demo.bodyLead}</DocArticleParagraph>
        <DocArticleParagraph>
          Jump to the{' '}
          <DocArticleLink sectionRef="reference-table">reference table</DocArticleLink>, the{' '}
          <DocArticleLink sectionRef="float-layout">float layout</DocArticleLink>, or the{' '}
          <DocArticleLink sectionRef="performance">performance</DocArticleLink> subsection.
        </DocArticleParagraph>
        <DocArticleCallout title="Note">{demo.callout}</DocArticleCallout>
        <DocArticleList compact muted>
          <li className="type-body-sm">
            <code className="type-code">DocArticleToc</code> is a single <code className="type-code">nav</code> — no
            extra wrapper cards.
          </li>
          <li className="type-body-sm">
            Subsections register via <code className="type-code">tocId</code> on{' '}
            <code className="type-code">DocArticleHeading</code>.
          </li>
          <li className="type-body-sm">Sticky anchor scroll spy is intended for uninterrupted lg+ reading.</li>
        </DocArticleList>
      </DocArticleSection>

      <DocArticleSection id="float-layout" kind="layout" label="Float layout" tags={['layout', 'wireframe']} registerInToc={false}>
        <DocArticleHeading level={2} sectionId="float-layout">
          Float image
        </DocArticleHeading>
        <DocArticleLayout
          variant="float-start"
          label="Float start (features-alternating-rows)"
          media={
            <DocArticleImage
              src={demo.floatImage.src}
              alt={demo.floatImage.alt}
              caption={demo.floatImage.caption}
            />
          }
        >
          <DocArticleParagraph dropCap>{demo.floatLead}</DocArticleParagraph>
          <DocArticleParagraph>
            Add a second paragraph to show wrap continuation. The figure uses a squarer aspect ratio inside float
            layouts so thumbnails feel editorial rather than cinematic.
          </DocArticleParagraph>
        </DocArticleLayout>
      </DocArticleSection>

      <DocArticleSection id="split-layout" kind="layout" label="Split layout" tags={['layout', 'wireframe']} registerInToc={false}>
        <DocArticleHeading level={2} sectionId="split-layout">
          Split copy / media
        </DocArticleHeading>
        <DocArticleLayout
          variant="split"
          label="Split (hero-split-copy-media)"
          media={
            <DocArticleImage
              src={demo.splitImage.src}
              alt={demo.splitImage.alt}
              caption={demo.splitImage.caption}
            />
          }
        >
          <DocArticleParagraph variant="lead">
            Fifty-fifty grids pair long-form copy with a hero illustration — the same frame used for landing hero
            splits, adapted here for in-article feature blocks.
          </DocArticleParagraph>
          <DocArticleParagraph>
            On narrow viewports the grid stacks: copy first, media second, preserving reading order.
          </DocArticleParagraph>
        </DocArticleLayout>
      </DocArticleSection>

      <DocArticleSection id="columns-layout" kind="layout" label="Two columns" tags={['layout', 'wireframe']} registerInToc={false}>
        <DocArticleHeading level={2} sectionId="columns-layout">
          Two-column prose
        </DocArticleHeading>
        <DocArticleLayout variant="two-column" label="Two-column (magazine)">
          <DocArticleParagraph>{demo.columnsA}</DocArticleParagraph>
          <DocArticleParagraph>{demo.columnsB}</DocArticleParagraph>
        </DocArticleLayout>
      </DocArticleSection>

      <DocArticleDivider label="Section break" />

      <DocArticleSection id="reference-table" kind="table" label="Reference table" tags={['reference']} registerInToc={false}>
        <DocArticleHeading level={2} sectionId="reference-table">
          Reference
        </DocArticleHeading>
        <DocArticleTable caption={demo.tableCaption}>
          <thead>
            <tr>
              <th scope="col">Kind</th>
              <th scope="col">Component</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {DOC_ARTICLE_SECTION_KINDS.map((row) => (
              <tr key={row.kind}>
                <td>
                  <code className="type-code">{row.kind}</code>
                </td>
                <td className="type-body-sm">{row.label}</td>
                <td className="type-body-sm type-muted">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </DocArticleTable>
      </DocArticleSection>

      <DocArticleSection id="closing-note" kind="quote" label="Closing" tags={['newsletter']} registerInToc>
        <DocArticleQuote attribution={demo.quoteAttribution} pull>
          {demo.quote}
        </DocArticleQuote>
        <DocArticleParagraph variant="caption">
          Return to the <DocArticleLink sectionRef="intro">introduction</DocArticleLink>.
        </DocArticleParagraph>
      </DocArticleSection>
    </>
  )
}

function DocArticleNewsletterDemo({
  tocVariant,
  scrollRootRef,
}: {
  tocVariant: DocArticleTocVariant
  scrollRootRef: RefObject<HTMLElement | null>
}) {
  const demo = DOC_ARTICLE_DEMO_NEWSLETTER

  const content = (
    <>
      {tocVariant === 'list' ? <DocArticleToc variant="list" title="In this document" /> : null}
      {isStickyTocVariant(tocVariant) ? (
        <div className="theme-doc-article__toc-mobile-fallback">
          <DocArticleToc variant="list" title="In this document" />
        </div>
      ) : null}
      {isStickyTocVariant(tocVariant) ? (
        <DocArticleMasthead
          title={demo.title}
          kicker={demo.kicker}
          byline={demo.byline}
          publishedAt={demo.publishedAt}
        />
      ) : null}
      <DocArticleDemoBody />
    </>
  )

  return (
    <DocArticle
      title={demo.title}
      slug={demo.slug}
      kicker={demo.kicker}
      byline={demo.byline}
      publishedAt={demo.publishedAt}
      measure="wide"
      scrollRootRef={scrollRootRef}
      showMasthead={!isStickyTocVariant(tocVariant)}
    >
      {isStickyTocVariant(tocVariant) ? (
        <DocArticleShell
          stickyToc
          microToc={tocVariant === 'micro-anchor'}
          toc={<DocArticleToc variant={tocVariant} />}
        >
          {content}
        </DocArticleShell>
      ) : (
        content
      )}
    </DocArticle>
  )
}

export function DocArticleShowcase() {
  const [tocVariant, setTocVariant] = useState<DocArticleTocVariant>('sticky-anchor')
  const stageRef = useRef<HTMLDivElement>(null)

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <p className="type-overline">In-page editorial documents</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">DocArticleToc</code> delegates sticky / micro-anchor to{' '}
          <code className="type-code">NanoAnchorMenu</code> — a text rail with scroll-spy indicator.
          The demo stage is height-capped; the rail stays sticky and scrolls on its own so the active
          section stays visible.
        </p>

        <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
          <p className="type-overline mb-2">Supported section kinds</p>
          <ul className="type-body-sm type-muted list-disc space-y-1 pl-5">
            {DOC_ARTICLE_SECTION_KINDS.map((item) => (
              <li key={item.kind}>
                <code className="type-code">{item.kind}</code> — {item.description}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
          <p className="type-overline mb-2">Layout arrangements (wireframe-aligned)</p>
          <ul className="type-body-sm type-muted list-disc space-y-1 pl-5">
            {DOC_ARTICLE_LAYOUTS.map((layout) => (
              <li key={layout.variant}>
                <code className="type-code">{layout.variant}</code> — {layout.name} (
                <code className="type-code">{layout.wireframeId}</code>) — {layout.purpose}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
            <p className="type-overline mb-1">TOC variants</p>
            <ul className="type-body-sm type-muted list-disc space-y-1 pl-5">
              <li>
                <code className="type-code">list</code> — bordered card at top of article
              </li>
              <li>
                <code className="type-code">sticky-anchor</code> —{' '}
                <code className="type-code">NanoAnchorMenu</code> left rail (lg+)
              </li>
              <li>
                <code className="type-code">micro-anchor</code> — denser nano rail + narrower column
              </li>
              <li>
                <code className="type-code">DocArticleShell</code> — reading grid for uninterrupted main column
              </li>
            </ul>
          </div>
          <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
            <p className="type-overline mb-1">Caveats</p>
            <ul className="type-body-sm type-muted list-disc space-y-1 pl-5">
              <li>Sticky anchor TOC is hidden below lg — use list variant on small screens.</li>
              <li>Requires a <code className="type-code">.theme</code> ancestor.</li>
              <li>PDF viewing lives under Theme → Data viz → PDF viewer.</li>
              <li>Section ids must be unique kebab-case slugs.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="w-full min-w-0 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[min(100%,16rem)] max-w-sm flex-1">
            <Select
              label="TOC variant"
              options={TOC_VARIANT_OPTIONS}
              value={tocVariant}
              onChange={(value) => setTocVariant(value as DocArticleTocVariant)}
              size="sm"
            />
          </div>
          <p className="type-body-sm type-muted pb-1">
            {isStickyTocVariant(tocVariant)
              ? `Resize to lg+ for the ${tocVariant === 'micro-anchor' ? 'micro' : 'sticky'} rail. Scroll the article — the TOC follows the active section independently.`
              : 'Compact list TOC — works at any viewport width.'}
          </p>
        </div>
        <div
          ref={stageRef}
          className={[
            'theme-doc-article__stage',
            'theme-doc-article__stage--scroll',
            isStickyTocVariant(tocVariant) ? 'theme-doc-article__stage--reading' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <DocArticleNewsletterDemo tocVariant={tocVariant} scrollRootRef={stageRef} />
        </div>
      </section>
    </div>
  )
}
