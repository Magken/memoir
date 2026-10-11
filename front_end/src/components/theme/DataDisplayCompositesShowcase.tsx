import { useMemo, useState } from 'react'
import type { TextArrangement } from '../../lib/animations/textDisplayArrangements'
import { textDisplayCategoryOptions } from '../../lib/animations/textDisplayArrangements'
import { motionTextArrangements } from '../textDisplayMotionArrangements'
import { Select } from '../Select'

const textArrangements: TextArrangement[] = [
  {
    id: 'landing-centered-xl',
    category: 'landing',
    name: 'Centered display XL',
    purpose: 'Default SaaS landing — centered tag, largest display, and supporting deck.',
    reference: 'Stripe / Notion home heroes — symmetric stack, generous vertical rhythm.',
    stack: 'text-center · type-tag · type-display-xl · type-body-lg type-muted',
    preview: (
      <div className="mx-auto max-w-4xl space-y-4 text-center">
        <p className="mb-0">
          <span className="type-tag">Now in beta</span>
        </p>
        <h1 className="type-display-xl type-light mb-0">Financial infrastructure for the internet</h1>
        <p className="type-body-lg type-muted mx-auto max-w-2xl mb-0">
          Millions of companies use shared primitives to launch, scale, and accept payments globally.
        </p>
      </div>
    ),
  },
  {
    id: 'landing-word-stack',
    category: 'landing',
    name: 'Tight word stack',
    purpose: 'One word per line at display scale — poster density without a single long line.',
    reference: 'Linear / Vercel — stacked display lines, tight leading, left or center aligned.',
    stack: 'type-display-xl type-tracking-tight · space-y-0',
    preview: (
      <div className="space-y-0">
        <p className="type-display-xl type-light type-tracking-tight mb-0">Plan.</p>
        <p className="type-display-xl type-light type-tracking-tight mb-0">Build.</p>
        <p className="type-display-xl type-accent type-tracking-tight mb-0">Ship.</p>
      </div>
    ),
  },
  {
    id: 'landing-accent-lines',
    category: 'landing',
    name: 'Neutral + accent lines',
    purpose: 'Two-line display — first line neutral, second line gradient or accent.',
    reference: 'Apple product moments — contrast between statement and payoff line.',
    stack: 'type-display-lg type-light · type-display-lg type-gradient',
    preview: (
      <div className="max-w-4xl space-y-1">
        <p className="type-display-lg type-light mb-0">The best way</p>
        <p className="type-display-lg type-gradient mb-0">to build the web</p>
      </div>
    ),
  },
  {
    id: 'landing-serif-hero',
    category: 'landing',
    name: 'Serif editorial landing',
    purpose: 'Display serif italic for brand-led or creative product landings.',
    reference: 'Aesop / editorial SaaS — italic display + muted sans deck, often centered.',
    stack: 'text-center · type-display-lg type-serif-italic · type-lead type-muted',
    preview: (
      <div className="mx-auto max-w-3xl space-y-4 text-center">
        <h1 className="type-display-lg type-serif-italic mb-0">Craft meets velocity</h1>
        <p className="type-lead type-muted mb-0">
          A landing voice that leads with display serif, then settles into a calm sans lead.
        </p>
      </div>
    ),
  },
  {
    id: 'landing-split-deck',
    category: 'landing',
    name: 'Split headline + deck',
    purpose: 'Large title in one column, supporting copy in the other — wide hero band.',
    reference: 'Asana / enterprise feature pages — headline column + explanation column.',
    stack: 'grid md:grid-cols-2 · type-display-md · type-body-lg type-muted',
    preview: (
      <div className="grid max-w-4xl gap-6 md:grid-cols-2 md:gap-10 md:items-end">
        <h1 className="type-display-md type-light mb-0">Work on a single surface</h1>
        <p className="type-body-lg type-muted mb-0">
          Split the hero: display scale owns the promise; body-lg carries the proof in a second column.
        </p>
      </div>
    ),
  },
  {
    id: 'landing-left-rail',
    category: 'landing',
    name: 'Left-aligned product hero',
    purpose: 'Classic left stack — eyebrow, display, lead, optional meta — full width band.',
    reference: 'GitHub / developer tools — left-aligned display-lg with long-form deck.',
    stack: 'type-overline · type-display-lg · type-lead · type-caption type-faint',
    preview: (
      <div className="max-w-3xl space-y-3">
        <p className="type-overline type-tracking-wide mb-0">Developer platform</p>
        <h1 className="type-display-lg type-light mb-0">Build and ship from one workspace</h1>
        <p className="type-lead type-muted mb-0">
          Left-aligned landing stack — eyebrow, large display, lead paragraph, then fine print.
        </p>
        <p className="type-caption type-faint mb-0">No credit card required · Free for individuals</p>
      </div>
    ),
  },
  {
    id: 'landing-stat-hook',
    category: 'landing',
    name: 'Headline + stat row',
    purpose: 'Display title with tabular proof points beneath — trust without charts.',
    reference: 'Fintech / infra landings — big headline, 2–3 numeric hooks in a row.',
    stack: 'type-display-md · type-display-sm type-tabular · type-caption',
    preview: (
      <div className="max-w-4xl space-y-8">
        <h1 className="type-display-md type-light max-w-2xl mb-0">
          Payments infrastructure built for scale
        </h1>
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <div className="space-y-1">
            <p className="type-display-sm type-tabular type-semibold mb-0">135+</p>
            <p className="type-caption type-faint mb-0">Currencies</p>
          </div>
          <div className="space-y-1">
            <p className="type-display-sm type-tabular type-semibold mb-0">99.99%</p>
            <p className="type-caption type-faint mb-0">Uptime</p>
          </div>
          <div className="space-y-1">
            <p className="type-display-sm type-tabular type-semibold mb-0">$640B</p>
            <p className="type-caption type-faint mb-0">Volume</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'landing-invert-hero',
    category: 'landing',
    name: 'Invert display hero',
    purpose: 'Full-band landing title on photography or gradient — difference blend.',
    reference: 'Fullscreen marketing heroes — display-lg invert over media without boxed scrim.',
    stack: 'type-invert-demo-bg · type-display-lg type-invert · type-body-lg type-invert',
    preview: (
      <div className="relative min-h-[12rem] overflow-visible rounded-[0.125rem] border-2 border-[var(--theme-border-strong)] p-8 md:p-10">
        <div className="type-invert-demo-bg absolute inset-0 rounded-[0.0625rem]" aria-hidden />
        <div className="relative max-w-3xl space-y-3">
          <h1 className="type-display-lg type-invert mb-0">See clearly on any canvas</h1>
          <p className="type-body-lg type-invert type-light mb-0">
            Stack invert display with a lighter invert deck over gradients or photography.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'landing-outlined-pair',
    category: 'landing',
    name: 'Outlined + solid pair',
    purpose: 'Stroked display line above a filled display line — event / launch energy.',
    reference: 'Agency launch pages — outline stroke headline, solid payoff beneath.',
    stack: 'type-display-md type-outlined · type-display-lg',
    preview: (
      <div className="space-y-2">
        <p className="type-display-md type-outlined mb-0">INTRODUCING</p>
        <p className="type-display-lg type-light mb-0">The next release</p>
      </div>
    ),
  },
  {
    id: 'landing-cta-deck',
    category: 'landing',
    name: 'Display + link deck',
    purpose: 'Large title with inline text CTA in the supporting line — no button chrome.',
    reference: 'Docs and dev landings — headline + “Get started →” as type-link in deck.',
    stack: 'type-display-md · type-body-lg · type-link',
    preview: (
      <div className="max-w-3xl space-y-4">
        <h1 className="type-display-md type-light mb-0">Start building in minutes</h1>
        <p className="type-body-lg type-muted mb-0">
          Install the SDK, run your first request, and read the guides.{' '}
          <a href="/" className="type-link">
            Get started
          </a>
        </p>
      </div>
    ),
  },
  {
    id: 'hero-stack',
    category: 'hero',
    name: 'Hero stack',
    purpose: 'Primary landing headline with context line and supporting deck.',
    reference: 'Common on product sites (Linear, Stripe) — eyebrow → display → lead.',
    stack: 'type-overline · type-display-xl · type-lead type-muted',
    preview: (
      <div className="space-y-3 max-w-3xl">
        <p className="type-overline type-tracking-wide">Design engineering</p>
        <h1 className="type-display-xl type-light">Build what feels inevitable</h1>
        <p className="type-lead type-muted mb-0">
          A type stack for hero regions — eyebrow, display, and lead deck.
        </p>
      </div>
    ),
  },
  {
    id: 'centered-masthead',
    category: 'hero',
    name: 'Centered masthead',
    purpose: 'Publication-style centered title block for essays and newsletters.',
    reference: 'Medium / Substack article headers — centered rhythm, muted subtitle.',
    stack: 'text-center · type-overline · type-h1 · type-subtitle type-muted',
    preview: (
      <div className="mx-auto max-w-2xl space-y-2 text-center">
        <p className="type-overline type-tracking-wide">Essay · 8 min read</p>
        <h1 className="type-h1 type-serif-italic">The quiet craft of layout</h1>
        <p className="type-subtitle type-muted mb-0">Why arrangement matters as much as type choice</p>
      </div>
    ),
  },
  {
    id: 'split-gradient-lines',
    category: 'hero',
    name: 'Split-line display',
    purpose: 'Two-line display with accent on the second line for product moments.',
    reference: 'Apple-style split headlines — neutral line one, accent line two.',
    stack: 'type-display-lg · type-display-md type-gradient',
    preview: (
      <div className="space-y-1">
        <p className="type-display-lg type-light mb-0">Think in systems.</p>
        <p className="type-display-md type-gradient mb-0">Ship in stories.</p>
      </div>
    ),
  },
  {
    id: 'outlined-statement',
    category: 'hero',
    name: 'Outlined statement',
    purpose: 'Poster-weight headline that stays light on busy backgrounds.',
    reference: 'Agency / event sites — stroked display type over photography.',
    stack: 'type-display-sm type-outlined',
    preview: <p className="type-display-sm type-outlined mb-0">OPEN STUDIO</p>,
  },
  {
    id: 'invert-band',
    category: 'hero',
    name: 'Invert on band',
    purpose: 'Headline legible over gradients or imagery without a scrim box.',
    reference: 'Fullscreen hero overlays — difference blend on mixed media.',
    stack: 'type-invert-demo-bg · type-display-sm type-invert',
    preview: (
      <div className="relative min-h-[8rem] overflow-visible rounded-[0.125rem] border-2 border-[var(--theme-border-strong)] p-4">
        <div className="type-invert-demo-bg absolute inset-0 rounded-[0.0625rem]" aria-hidden />
        <p className="type-display-sm type-invert relative max-w-xl mb-0">
          Legible on any background
        </p>
      </div>
    ),
  },
  {
    id: 'section-divider',
    category: 'section',
    name: 'Divider label',
    purpose: 'Named section break before a block of content.',
    reference: 'Documentation and marketing long pages — labeled horizontal rule.',
    stack: 'theme-divider-row · type-overline · type-h3',
    preview: (
      <div className="space-y-4 max-w-2xl">
        <div className="theme-divider-row">
          <hr className="theme-divider theme-divider--strong" />
          <span className="theme-divider-row__label type-overline">Capabilities</span>
          <hr className="theme-divider theme-divider--strong" />
        </div>
        <h2 className="type-h3 mb-0">Everything in one surface</h2>
      </div>
    ),
  },
  {
    id: 'side-rail-label',
    category: 'section',
    name: 'Side-rail label',
    purpose: 'Section title with a narrow category column and wider copy column.',
    reference: 'Editorial / annual-report grids — label column + headline column.',
    stack: 'grid · type-overline · type-h3 · type-body-sm type-muted',
    preview: (
      <div className="grid max-w-2xl grid-cols-[5.5rem_1fr] gap-4 sm:gap-6">
        <p className="type-overline type-tracking-wide pt-1 mb-0">Chapter</p>
        <div className="space-y-2">
          <h2 className="type-h3 mb-0">Arrangement as a system</h2>
          <p className="type-body-sm type-muted mb-0">
            Pair a fixed-width label column with fluid headline copy.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'numbered-step',
    category: 'section',
    name: 'Numbered step',
    purpose: 'Ordered feature or process block with tabular index.',
    reference: 'Process pages and feature lists — 01 / 02 / 03 with titles.',
    stack: 'type-overline type-tabular · type-h4 · type-body-sm',
    preview: (
      <div className="flex max-w-md gap-4">
        <p className="type-overline type-tabular type-faint shrink-0 mb-0">01</p>
        <div className="space-y-1">
          <h3 className="type-h4 mb-0">Choose a scale</h3>
          <p className="type-body-sm type-muted mb-0">Start from display, heading, or body tokens.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'magazine-kicker',
    category: 'article',
    name: 'Magazine kicker',
    purpose: 'Editorial opener — kicker, serif headline, and deck paragraph.',
    reference: 'Print magazine spreads — kicker + italic display + lead deck.',
    stack: 'type-h6 · type-h2 type-serif-italic · type-lead',
    preview: (
      <div className="space-y-2 max-w-2xl">
        <p className="type-h6 type-muted mb-0">Cover story</p>
        <h2 className="type-h2 type-serif-italic">Editorial voice for longform</h2>
        <p className="type-lead mb-0">
          Stack serif italic on the headline, then a lead paragraph for the deck.
        </p>
      </div>
    ),
  },
  {
    id: 'luxury-small-caps',
    category: 'article',
    name: 'Small caps + serif',
    purpose: 'Premium label paired with a display serif line.',
    reference: 'Luxury brand sites — small caps category + italic display.',
    stack: 'type-h4 type-small-caps · type-display-sm type-serif-italic',
    preview: (
      <div className="space-y-2">
        <p className="type-h4 type-small-caps type-muted mb-0">Collection</p>
        <p className="type-display-sm type-serif-italic mb-0">Refined elegance</p>
      </div>
    ),
  },
  {
    id: 'dropcap-open',
    category: 'article',
    name: 'Drop cap opening',
    purpose: 'Article body opening after a section title.',
    reference: 'Newspaper and literary web — raised initial on first paragraph.',
    stack: 'type-h2 · type-body type-dropcap',
    preview: (
      <div className="space-y-3 max-w-2xl">
        <h2 className="type-h2 mb-0">Opening paragraph</h2>
        <p className="type-body type-dropcap mb-0">
          Typography is not only size and weight — it is the spatial relationship between lines.
          This arrangement pairs a section heading with a drop-cap body opener.
        </p>
      </div>
    ),
  },
  {
    id: 'highlight-lede',
    category: 'article',
    name: 'Highlighted lede',
    purpose: 'Lead sentence with a emphasized phrase inside the flow.',
    reference: 'Blog intros and release notes — inline highlight on key term.',
    stack: 'type-lead · type-highlight-strong',
    preview: (
      <p className="type-lead max-w-2xl mb-0">
        The arrangement library combines existing{' '}
        <span className="type-highlight-strong">type-*</span> classes — no new primitives.
      </p>
    ),
  },
  {
    id: 'card-title-stack',
    category: 'ui',
    name: 'Card title stack',
    purpose: 'Compact title block for cards, tiles, and list rows.',
    reference: 'Dashboard cards and app tiles — title → subtitle → meta.',
    stack: 'type-title · type-subtitle · type-caption type-faint',
    preview: (
      <div className="space-y-1">
        <p className="type-title mb-0">Workspace settings</p>
        <p className="type-subtitle type-muted mb-0">Manage team access and billing</p>
        <p className="type-caption type-faint mb-0">Updated 2 hours ago</p>
      </div>
    ),
  },
  {
    id: 'panel-header',
    category: 'ui',
    name: 'Panel header',
    purpose: 'Settings or modal section header with helper line.',
    reference: 'SaaS settings panels — label + heading + helper text.',
    stack: 'type-label · type-h5 · type-body-sm type-muted',
    preview: (
      <div className="space-y-1">
        <p className="type-label mb-0">Notifications</p>
        <h3 className="type-h5 mb-0">Email preferences</h3>
        <p className="type-body-sm type-muted mb-0">Choose what we send and how often.</p>
      </div>
    ),
  },
  {
    id: 'ui-status-line',
    category: 'ui',
    name: 'Status inline',
    purpose: 'Single line mixing neutral copy with semantic status words.',
    reference: 'Admin tables and activity feeds — inline success / error tokens.',
    stack: 'type-body-sm · type-success · type-error',
    preview: (
      <p className="type-body-sm mb-0">
        Deploy <span className="type-success type-semibold">succeeded</span> · rollback{' '}
        <span className="type-error type-semibold">failed</span>
      </p>
    ),
  },
  {
    id: 'pull-quote',
    category: 'quote',
    name: 'Pull quote',
    purpose: 'Extracted quote with left rule and attribution.',
    reference: 'Editorial layouts — blockquote rail + caption credit.',
    stack: 'type-blockquote · type-caption type-faint',
    preview: (
      <figure className="max-w-md space-y-2">
        <blockquote className="type-blockquote mb-0">
          Arrangement is the invisible grid readers feel before they read a word.
        </blockquote>
        <figcaption className="type-caption type-faint mb-0">— Jan Tschichold</figcaption>
      </figure>
    ),
  },
  {
    id: 'quote-inline',
    category: 'quote',
    name: 'Inline quote',
    purpose: 'Shorter emphasis pull without full blockquote scale.',
    reference: 'Feature callouts — italic quote class mid-page.',
    stack: 'type-quote · type-caption',
    preview: (
      <div className="max-w-sm space-y-2">
        <p className="type-quote mb-0">&ldquo;Good typography is invisible.&rdquo;</p>
        <p className="type-caption type-faint mb-0">Design principle</p>
      </div>
    ),
  },
  {
    id: 'meta-byline',
    category: 'meta',
    name: 'Byline row',
    purpose: 'Author, date, and reading time on one muted line.',
    reference: 'Blog posts and docs — caption metadata with separators.',
    stack: 'type-caption type-faint · type-accent',
    preview: (
      <p className="type-caption type-faint mb-0">
        <span className="type-accent">Alex Chen</span>
        <span aria-hidden> · </span>
        <time dateTime="2026-06-20">20 Jun 2026</time>
        <span aria-hidden> · </span>
        6 min read
      </p>
    ),
  },
  {
    id: 'tag-meta-row',
    category: 'meta',
    name: 'Tag + label row',
    purpose: 'Version or category chip beside a compact label.',
    reference: 'Changelog entries and API docs — tag + mono label.',
    stack: 'type-tag · type-label · type-body-sm type-muted',
    preview: (
      <div className="flex flex-wrap items-center gap-2">
        <span className="type-tag">v2.4</span>
        <span className="type-label">Typography</span>
        <span className="type-body-sm type-muted">Arrangement library added</span>
      </div>
    ),
  },
  {
    id: 'pricing-stack',
    category: 'pricing',
    name: 'Price stack',
    purpose: 'Primary price with billing period and short plan descriptor.',
    reference: 'SaaS pricing cards — tabular display price + caption cadence + muted detail.',
    stack: 'type-display-sm type-tabular · type-caption · type-body-sm type-muted',
    preview: (
      <div className="space-y-1">
        <p className="type-display-sm type-tabular type-semibold mb-0">
          $29<span className="type-body type-muted">/mo</span>
        </p>
        <p className="type-caption type-faint mb-0">Billed annually</p>
        <p className="type-body-sm type-muted mb-0">Everything in Pro, plus SSO.</p>
      </div>
    ),
  },
  {
    id: 'pricing-compare',
    category: 'pricing',
    name: 'Compare-at price',
    purpose: 'Current price beside struck-through former price — sale or plan change.',
    reference: 'E-commerce and upgrade flows — strike + tabular current value.',
    stack: 'type-strike type-muted · type-display-sm type-tabular · type-caption',
    preview: (
      <div className="flex flex-wrap items-baseline gap-3">
        <p className="type-body-lg type-strike type-muted mb-0">$49</p>
        <p className="type-display-sm type-tabular type-semibold mb-0">$29</p>
        <p className="type-caption type-success mb-0">Save 41%</p>
      </div>
    ),
  },
  {
    id: 'wayfinding-breadcrumb',
    category: 'wayfinding',
    name: 'Breadcrumb trail',
    purpose: 'Hierarchical path with linked ancestors and muted current segment.',
    reference: 'Docs and admin shells — caption-scale links separated by middots.',
    stack: 'type-caption · type-link · type-faint',
    preview: (
      <nav aria-label="Breadcrumb" className="type-caption">
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 mb-0 list-none p-0">
          <li>
            <a href="/" className="type-link">
              Home
            </a>
          </li>
          <li className="type-faint" aria-hidden>
            /
          </li>
          <li>
            <a href="/" className="type-link">
              Settings
            </a>
          </li>
          <li className="type-faint" aria-hidden>
            /
          </li>
          <li className="type-faint mb-0">Billing</li>
        </ol>
      </nav>
    ),
  },
  {
    id: 'wayfinding-nav-active',
    category: 'wayfinding',
    name: 'Active nav link',
    purpose: 'Current page in a text nav — accent weight and underline.',
    reference: 'Header nav and docs sidebars — type-link with is-active / aria-current.',
    stack: 'type-label · type-link · type-link.is-active',
    preview: (
      <nav aria-label="Section" className="flex flex-wrap gap-x-5 gap-y-2">
        <a href="/" className="type-label type-link">
          Overview
        </a>
        <a href="/" className="type-label type-link is-active" aria-current="page">
          Billing
        </a>
        <a href="/" className="type-label type-link">
          Team
        </a>
      </nav>
    ),
  },
  {
    id: 'wayfinding-filter-selected',
    category: 'wayfinding',
    name: 'Selected text filter',
    purpose: 'Inline filter set with one chosen item highlighted as text, not a chip.',
    reference: 'Category pickers and sort rows — type-link is-selected pill text.',
    stack: 'type-label · type-link · type-link.is-selected',
    preview: (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <span className="type-label type-muted">View:</span>
        <a href="/" className="type-label type-link is-selected" aria-current="true">
          All
        </a>
        <a href="/" className="type-label type-link">
          Draft
        </a>
        <a href="/" className="type-label type-link">
          Published
        </a>
      </div>
    ),
  },
  {
    id: 'state-empty',
    category: 'state',
    name: 'Empty state',
    purpose: 'Centered message when a list or panel has no content yet.',
    reference: 'Dashboard empty panels — short title + muted helper, no illustration.',
    stack: 'text-center · type-h4 · type-body-sm type-muted',
    preview: (
      <div className="mx-auto max-w-sm space-y-2 text-center">
        <p className="type-h4 mb-0">No projects yet</p>
        <p className="type-body-sm type-muted mb-0">
          Create a workspace to start arranging type compositions.
        </p>
      </div>
    ),
  },
  {
    id: 'state-404',
    category: 'state',
    name: '404 page',
    purpose: 'Error code at display scale with title and recovery deck.',
    reference: 'Marketing 404 pages — tabular code + heading + short body.',
    stack: 'type-display-sm type-tabular · type-h2 · type-body-sm type-muted',
    preview: (
      <div className="max-w-md space-y-2">
        <p className="type-display-sm type-tabular type-faint mb-0">404</p>
        <h1 className="type-h2 mb-0">Page not found</h1>
        <p className="type-body-sm type-muted mb-0">
          The link may be broken or the page may have moved.
        </p>
      </div>
    ),
  },
  {
    id: 'state-warning-banner',
    category: 'state',
    name: 'Warning banner',
    purpose: 'Inline alert headline with supporting detail — text only, no box component.',
    reference: 'System banners and deprecation notices — warning label + body copy.',
    stack: 'type-label type-warning · type-body-sm',
    preview: (
      <div className="max-w-2xl space-y-1">
        <p className="type-label type-warning mb-0">Scheduled maintenance</p>
        <p className="type-body-sm mb-0">
          APIs will be read-only on Sunday 02:00–04:00 UTC. Plan exports accordingly.
        </p>
      </div>
    ),
  },
  {
    id: 'state-error-headline',
    category: 'state',
    name: 'Error headline',
    purpose: 'Form or page-level failure — error title with muted remediation line.',
    reference: 'Checkout and auth errors — type-error heading + helper text.',
    stack: 'type-h4 type-error · type-body-sm type-muted',
    preview: (
      <div className="max-w-md space-y-1">
        <p className="type-h4 type-error mb-0">Payment could not be processed</p>
        <p className="type-body-sm type-muted mb-0">
          Check your card details or try a different payment method.
        </p>
      </div>
    ),
  },
  {
    id: 'section-feature-cell',
    category: 'section',
    name: 'Feature cell',
    purpose: 'Icon-less feature block — label, title, and one-line description.',
    reference: 'Product feature grids — overline category + h4 + body-sm (Notion, Linear).',
    stack: 'type-overline · type-h4 · type-body-sm type-muted',
    preview: (
      <div className="max-w-xs space-y-2">
        <p className="type-overline type-tracking-wide mb-0">Collaboration</p>
        <h3 className="type-h4 mb-0">Shared arrangements</h3>
        <p className="type-body-sm type-muted mb-0">
          Compose type stacks once and reuse them across landing sections.
        </p>
      </div>
    ),
  },
  {
    id: 'landing-underlined-keyword',
    category: 'landing',
    name: 'Underlined keyword',
    purpose: 'Display or heading with accent underline on the key word only.',
    reference: 'Feature landings and blogs — type-underline on a single emphasized term.',
    stack: 'type-display-md · type-underline · type-underline-wavy',
    preview: (
      <h1 className="type-display-md type-light max-w-3xl mb-0">
        Ship faster with{' '}
        <span className="type-underline">better typography</span>
      </h1>
    ),
  },
  {
    id: 'article-soft-highlight',
    category: 'article',
    name: 'Soft highlight lede',
    purpose: 'Lead paragraph with gentle inline highlight — softer than strong callout.',
    reference: 'Release notes and blog intros — type-highlight on a phrase in type-lead.',
    stack: 'type-lead · type-highlight',
    preview: (
      <p className="type-lead max-w-2xl mb-0">
        Arrangements combine scale classes with{' '}
        <span className="type-highlight">soft emphasis</span> for readable inline callouts.
      </p>
    ),
  },
  {
    id: 'quote-testimonial',
    category: 'quote',
    name: 'Marketing testimonial',
    purpose: 'Customer quote with name and role — sans body, not blockquote rail.',
    reference: 'Landing social proof — body-lg quote + accent name + faint role.',
    stack: 'type-body-lg · type-accent · type-caption type-faint',
    preview: (
      <figure className="max-w-lg space-y-3">
        <blockquote className="type-body-lg mb-0">
          &ldquo;We replaced ad-hoc heading stacks with a shared arrangement library in a day.&rdquo;
        </blockquote>
        <figcaption className="mb-0">
          <p className="type-accent type-semibold mb-0">Morgan Lee</p>
          <p className="type-caption type-faint mb-0">Head of Design, Northline</p>
        </figcaption>
      </figure>
    ),
  },
  {
    id: 'ui-data-label-value',
    category: 'ui',
    name: 'Label + mono value',
    purpose: 'Compact metric cell — UI label over tabular mono figure.',
    reference: 'Dashboard stat tiles — type-label + type-mono type-tabular.',
    stack: 'type-label · type-mono type-tabular type-h4',
    preview: (
      <div className="space-y-1">
        <p className="type-label mb-0">Active users</p>
        <p className="type-mono type-tabular type-h4 type-semibold mb-0">24,891</p>
      </div>
    ),
  },
  {
    id: 'meta-legal-fine-print',
    category: 'meta',
    name: 'Legal fine print',
    purpose: 'Dense consent or footer copy at caption scale.',
    reference: 'Signup footers and cookie bars — overline + faint caption block.',
    stack: 'type-overline · type-caption type-faint',
    preview: (
      <div className="max-w-lg space-y-2">
        <p className="type-overline mb-0">Terms</p>
        <p className="type-caption type-faint mb-0">
          By continuing you agree to our Terms of Service and Privacy Policy. We process data as
          described in our documentation. You may withdraw consent at any time.
        </p>
      </div>
    ),
  },
  {
    id: 'meta-changelog-release',
    category: 'meta',
    name: 'Changelog release',
    purpose: 'Version tag, release title, and compact bullet list of changes.',
    reference: 'Product changelog pages — type-tag + h4 + theme-list--compact.',
    stack: 'type-tag · type-h4 · theme-list--compact · type-body-sm',
    preview: (
      <div className="max-w-lg space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="type-tag">v2.4</span>
          <h3 className="type-h4 mb-0">Text arrangement library</h3>
        </div>
        <ul className="theme-list theme-list--compact theme-list--muted">
          <li className="type-body-sm">Pricing and wayfinding compositions</li>
          <li className="type-body-sm">Empty and status text patterns</li>
          <li className="type-body-sm">Landing underline and soft highlight variants</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'link-deck',
    category: 'meta',
    name: 'Link deck',
    purpose: 'Short description ending with an inline text link.',
    reference: 'Marketing teasers — body copy + text CTA link.',
    stack: 'type-body-sm type-muted · type-link',
    preview: (
      <p className="type-body-sm type-muted max-w-2xl mb-0">
        Explore individual scale classes on the Typography tab, or browse compositions here.
      </p>
    ),
  },
  ...motionTextArrangements,
]

function ArrangementRow({ arrangement }: { arrangement: TextArrangement }) {
  const categoryLabel =
    textDisplayCategoryOptions.find((option) => option.value === arrangement.category)?.label ??
    arrangement.category

  return (
    <li className="theme-shell-divider grid gap-5 py-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-10">
      <aside className="min-w-0 space-y-2">
        <p className="type-label mb-0">{arrangement.name}</p>
        <p className="type-caption type-faint mb-0">{categoryLabel}</p>
        <p className="type-body-sm type-muted mb-0">{arrangement.purpose}</p>
        <p className="type-caption type-faint mb-0">{arrangement.reference}</p>
        <p className="type-code mb-0 break-words">{arrangement.stack}</p>
      </aside>
      <div className="min-w-0">{arrangement.preview}</div>
    </li>
  )
}

export function DataDisplayCompositesShowcase() {
  const [category, setCategory] = useState<string>('all')

  const visible = useMemo(
    () =>
      category === 'all'
        ? textArrangements
        : textArrangements.filter((arrangement) => arrangement.category === category),
    [category],
  )

  const grouped = useMemo(() => {
    if (category !== 'all') {
      return [{ id: category, label: textDisplayCategoryOptions.find((o) => o.value === category)?.label ?? category, items: visible }]
    }
    return textDisplayCategoryOptions
      .filter((option) => option.value !== 'all')
      .map((option) => ({
        id: option.value,
        label: option.label,
        items: textArrangements.filter((arrangement) => arrangement.category === option.value),
      }))
      .filter((group) => group.items.length > 0)
  }, [category, visible])

  return (
    <div className="space-y-10">
      <div className="space-y-3 prose-measure">
        <p className="type-body-sm type-muted mb-0">
          A browsable library of <strong>text display arrangements</strong> — static stacks of{' '}
          <code className="type-code">.type-*</code> tokens plus a <strong>Motion & bands</strong>{' '}
          group (marquees, tickers, rotating headlines, counters, announcement bars, clip-slot
          columns). Filter by purpose or browse all divider rows.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <Select
          label="Purpose"
          options={[...textDisplayCategoryOptions]}
          value={category}
          onChange={setCategory}
        />
        <p className="type-caption type-faint pb-2 mb-0">
          {visible.length} arrangement{visible.length === 1 ? '' : 's'}
        </p>
      </div>

      {category === 'all' ? (
        <div className="space-y-0">
          {grouped.map((group) => (
            <section key={group.id} className="space-y-0">
              <p className="type-overline border-b py-4 mb-0">{group.label}</p>
              <ul className="theme-shell-divider divide-y border-b">
                {group.items.map((arrangement) => (
                  <ArrangementRow key={arrangement.id} arrangement={arrangement} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="theme-shell-divider divide-y border-y">
          {visible.map((arrangement) => (
            <ArrangementRow key={arrangement.id} arrangement={arrangement} />
          ))}
        </ul>
      )}
    </div>
  )
}
