import type { WireframeIconId } from './wireframeIcons'

export type WireframeFillCell = {
  copy?: string
  icon?: WireframeIconId
  /** Icon-only row — no copy. */
  icons?: readonly WireframeIconId[]
  /** Skeleton-loader lines (shimmer) instead of copy. */
  skeleton?: boolean
}

export type WireframeLayoutFill = {
  blocks?: Record<string, WireframeFillCell>
  micro?: Record<string, Record<string, WireframeFillCell>>
}

const header = { copy: 'Vurify', icon: 'sparkles' as const }
const footer = { copy: 'Privacy · Terms', icon: 'globe' as const }

export const WIREFRAME_FILLS: Record<string, WireframeLayoutFill> = {
  'holy-grail': {
    blocks: {
      header: { copy: 'Vurify · Hire · Apply', icon: 'sparkles' },
      nav: { copy: 'Stages · Briefs · Pool', icon: 'layers' },
      main: { copy: 'Candidate day — talk, form, code, writing', icon: 'file-text' },
      aside: { copy: 'Evidence pack', icon: 'shield' },
      footer,
    },
  },
  'landing-standard': {
    blocks: {
      header: { copy: 'Vurify · Product · Pricing', icon: 'sparkles' },
      hero: { copy: 'Hire with evidence, not a recap deck', icon: 'sparkles' },
      'feat-a': { copy: 'Conversation', icon: 'message' },
      'feat-b': { copy: 'Form + coding', icon: 'code' },
      'feat-c': { copy: 'Writing', icon: 'pen' },
      proof: { copy: 'Teams who keep the score on the work', icon: 'users' },
      cta: { copy: 'Try a candidate day', icon: 'route' },
      footer,
    },
  },
  'split-screen': {
    blocks: {
      header: { copy: 'Vurify', icon: 'sparkles' },
      'panel-a': { copy: 'Apply with a real work sample', icon: 'briefcase' },
      'panel-b': { copy: 'Stage kit preview', icon: 'monitor' },
      footer,
    },
  },
  zigzag: {
    blocks: {
      header,
      'copy-a': { copy: 'One package from capture to report', icon: 'package' },
      'media-a': { copy: 'Interview stage', icon: 'monitor' },
      'media-b': { copy: 'Verified grading', icon: 'shield' },
      'copy-b': { copy: 'Reviewers open the same artifact', icon: 'users' },
      'copy-c': { copy: 'Decision leaves with evidence attached', icon: 'check' },
      'media-c': { copy: 'Report', icon: 'file-text' },
      footer,
    },
  },
  'blog-single': {
    blocks: {
      header: { copy: 'Journal', icon: 'newspaper' },
      hero: { copy: 'Why scores should live on the work', icon: 'sparkles' },
      content: { copy: 'Capture, score, review, report — four beats, one package.', icon: 'book' },
      author: { copy: 'Vurify · Product', icon: 'user' },
      related: { copy: 'More on candidate day', icon: 'layers' },
      footer,
    },
  },
  'blog-sidebar': {
    blocks: {
      header: { copy: 'Journal', icon: 'newspaper' },
      hero: { copy: 'Evidence stays with the score', icon: 'shield' },
      content: { copy: 'A person opens the package the model already marked.', icon: 'file-text' },
      sidebar: { copy: 'On this page · Subscribe', icon: 'mail' },
      footer,
    },
  },
  magazine: {
    blocks: {
      header: { copy: 'Vurify Journal · Search', icon: 'search' },
      lead: { copy: 'Candidate day, written as a product', icon: 'sparkles' },
      'card-a': { copy: 'Talk dialect', icon: 'message' },
      'card-b': { copy: 'Form gates', icon: 'check' },
      'card-c': { copy: 'Coding runner', icon: 'code' },
      'card-d': { copy: 'Writing verify', icon: 'pen' },
      'card-e': { copy: 'Assessor aid', icon: 'bot' },
      sidebar: { copy: 'Trending · Newsletter', icon: 'mail' },
      footer,
    },
  },
  'docs-three-col': {
    blocks: {
      header: { copy: 'Docs · Search', icon: 'search' },
      'doc-nav': { copy: 'Start · Stages · Assess', icon: 'book' },
      content: { copy: 'How a stage kit is scored', icon: 'file-text' },
      toc: { copy: 'On this page', icon: 'layers' },
      footer,
    },
  },
  'app-shell': {
    blocks: {
      topbar: { copy: 'Interviews · New brief', icon: 'menu' },
      sidebar: { copy: 'Library · Pool · Settings', icon: 'layers' },
      main: { copy: 'Open briefs', icon: 'briefcase' },
    },
  },
  'dashboard-grid': {
    blocks: {
      topbar: { copy: 'Today · Org', icon: 'home' },
      'kpi-a': { copy: '12 live', icon: 'calendar' },
      'kpi-b': { copy: '4 scored', icon: 'check' },
      'kpi-c': { copy: '2 in review', icon: 'users' },
      'kpi-d': { copy: '1 package', icon: 'package' },
      chart: { copy: 'Throughput this week', icon: 'chart' },
      'widget-a': { copy: 'Queue', icon: 'layers' },
      'widget-b': { copy: 'Activity', icon: 'workflow' },
    },
  },
  pricing: {
    blocks: {
      header,
      intro: { copy: 'Plans for hiring teams', icon: 'sparkles' },
      'plan-a': { copy: 'Start', icon: 'home' },
      'plan-b': { copy: 'Team — highlighted', icon: 'star' },
      'plan-c': { copy: 'Org', icon: 'building' },
      faq: { copy: 'What is a candidate day?', icon: 'message' },
      footer,
    },
  },
  'portfolio-grid': {
    blocks: {
      header,
      intro: { copy: 'Work that shows the dialect', icon: 'sparkles' },
      'tile-a': { copy: 'Conversation', icon: 'message' },
      'tile-b': { copy: 'Form', icon: 'check' },
      'tile-c': { copy: 'Coding', icon: 'code' },
      'tile-d': { copy: 'Writing', icon: 'pen' },
      'tile-e': { copy: 'Grading', icon: 'shield' },
      'tile-f': { copy: 'Report', icon: 'file-text' },
      footer,
    },
  },
  'ecommerce-plp': {
    blocks: {
      header: { copy: 'Library · Search', icon: 'search' },
      toolbar: { copy: '24 briefs · Newest', icon: 'filter' },
      filters: { copy: 'Role · Stage · Status', icon: 'filter' },
      'prod-a': { copy: 'Senior screen', icon: 'briefcase' },
      'prod-b': { copy: 'Design craft', icon: 'pen' },
      'prod-c': { copy: 'Platform loop', icon: 'code' },
      'prod-d': { copy: 'Writing pack', icon: 'file-text' },
      'prod-e': { copy: 'Conversation-only try', icon: 'message' },
      'prod-f': { copy: 'Org onboarding', icon: 'building' },
      footer,
    },
  },
  'ecommerce-pdp': {
    blocks: {
      header,
      gallery: { copy: 'Stage stills', icon: 'image' },
      buybox: { copy: 'Start this brief', icon: 'bag' },
      details: { copy: 'Conversation · Form · Coding · Writing', icon: 'layers' },
      related: { copy: 'Nearby roles', icon: 'route' },
      footer,
    },
  },
  contact: {
    blocks: {
      header,
      form: { copy: 'Name · Email · Note', icon: 'mail' },
      map: { copy: 'Write us · Hours', icon: 'pin' },
      footer,
    },
  },
  'auth-minimal': {
    blocks: {
      form: { copy: 'Email · Continue', icon: 'lock' },
      brand: { copy: 'Vurify — hire with evidence', icon: 'sparkles' },
    },
  },

  'hero-centered-stack': {
    micro: {
      hero: {
        eyebrow: { copy: 'Candidate day', icon: 'sparkles' },
        headline: { copy: 'Hire with evidence' },
        sub: { skeleton: true },
        actions: { icons: ['briefcase', 'route'] },
        logos: { icons: ['building', 'globe', 'users', 'workflow'] },
      },
    },
  },
  'hero-split-copy-media': {
    blocks: {
      media: { copy: 'Stage kit', icon: 'monitor' },
    },
    micro: {
      copy: {
        badge: { copy: 'Live', icon: 'sparkles' },
        title: { copy: 'A day that scores the work' },
        body: { copy: 'Reviewers open the same artifact the candidate submitted.' },
        'cta-row': { copy: 'Try Vurify', icon: 'play' },
      },
    },
  },
  'hero-fullbleed-overlay': {
    micro: {
      backdrop: {
        eyebrow: { copy: 'Product', icon: 'sparkles' },
        headline: { copy: 'Evidence stays with the score' },
        cta: { copy: 'See a day', icon: 'play' },
      },
    },
  },
  'hero-bento': {
    blocks: {
      'thumb-a': { copy: 'Conversation thread', icon: 'message' },
      'thumb-b': { copy: 'Code runner', icon: 'code' },
    },
    micro: {
      lead: {
        title: { copy: 'Four beats. One package.' },
        sub: { copy: 'Capture, score, review, report.' },
        cta: { copy: 'Open the kit', icon: 'layers' },
      },
    },
  },
  'hero-app-screenshot': {
    blocks: {
      device: { copy: 'Browser frame', icon: 'monitor' },
    },
    micro: {
      bullets: {
        head: { copy: 'What the interview holds' },
        'item-a': { copy: 'Conversation that harvests facts', icon: 'message' },
        'item-b': { copy: 'Tools scored in place', icon: 'code' },
        'item-c': { copy: 'A report that still carries evidence', icon: 'shield' },
      },
    },
  },
  'hero-minimal-type': {
    micro: {
      type: {
        display: { copy: 'Score the work, not a recap.' },
        link: { copy: 'How a day runs →', icon: 'route' },
      },
    },
  },
  'cta-centered-band': {
    micro: {
      cta: {
        headline: { copy: 'Run a candidate day' },
        button: { copy: 'Start a brief', icon: 'sparkles' },
      },
    },
  },
  'cta-split-contrast': {
    blocks: {
      copy: { copy: 'Keep the trace on the artifact', icon: 'shield' },
    },
    micro: {
      action: {
        btn: { copy: 'Hire with Vurify', icon: 'briefcase' },
        note: { copy: 'No second spreadsheet' },
      },
    },
  },
  'cta-newsletter-inline': {
    micro: {
      signup: {
        title: { copy: 'Product notes, not a digest' },
        hint: { copy: 'A few times a year' },
        input: { copy: 'you@company.com', icon: 'mail' },
        submit: { copy: 'Subscribe', icon: 'mail' },
      },
    },
  },
  'cta-floating-card': {
    blocks: {
      bg: { copy: 'Quiet band' },
    },
    micro: {
      card: {
        title: { copy: 'Try the interview' },
        sub: { copy: 'Conversation-only path on mobile' },
        btn: { copy: 'Try interview', icon: 'play' },
      },
    },
  },
  'features-icon-grid': {
    blocks: {
      'feat-a': { copy: 'Conversation', icon: 'message' },
      'feat-b': { copy: 'Tools', icon: 'code' },
      'feat-c': { copy: 'Grade', icon: 'shield' },
    },
    micro: {
      intro: {
        label: { copy: 'Stage kit' },
        title: { copy: 'What the interview is made of' },
      },
    },
  },
  'features-bento-grid': {
    blocks: {
      big: { copy: 'Verified grading on the same package', icon: 'shield' },
      'sm-a': { copy: 'Conversation', icon: 'message' },
      'sm-b': { copy: 'Form', icon: 'check' },
      'sm-c': { copy: 'Coding', icon: 'code' },
      'sm-d': { copy: 'Writing', icon: 'pen' },
    },
  },
  'features-alternating-rows': {
    blocks: {
      'copy-a': { copy: 'Capture lands in the kit', icon: 'package' },
      'media-a': { copy: 'Stage still', icon: 'image' },
      'media-b': { copy: 'Score trace', icon: 'shield' },
      'copy-b': { copy: 'Review opens that same file', icon: 'users' },
    },
  },
  'features-horizontal-cards': {
    blocks: {
      head: { copy: 'Walk the kit', icon: 'route' },
      'card-a': { copy: 'Opening', icon: 'message' },
      'card-b': { copy: 'Tool', icon: 'code' },
      'card-c': { copy: 'Writing', icon: 'pen' },
      'card-d': { copy: 'Close', icon: 'check' },
    },
  },
  'features-comparison-table': {
    blocks: {
      corner: { copy: 'In the package' },
      'h-a': { copy: 'Start' },
      'h-b': { copy: 'Team', icon: 'star' },
      'h-c': { copy: 'Org' },
      'row-1': { copy: 'Conversation' },
      'row-2': { copy: 'Tools' },
      'row-3': { copy: 'Assessor' },
      'row-4': { copy: 'Report' },
      'c1-a': { copy: 'Yes', icon: 'check' },
      'c1-b': { copy: 'Yes', icon: 'check' },
      'c1-c': { copy: '—', icon: 'minus' },
      'c2-a': { copy: 'Yes', icon: 'check' },
      'c2-b': { copy: 'Yes', icon: 'check' },
      'c2-c': { copy: 'Yes', icon: 'check' },
      'c3-a': { copy: '—', icon: 'minus' },
      'c3-b': { copy: 'Yes', icon: 'check' },
      'c3-c': { copy: '—', icon: 'minus' },
      'c4-a': { copy: 'Yes', icon: 'check' },
      'c4-b': { copy: 'Yes', icon: 'check' },
      'c4-c': { copy: 'Yes', icon: 'check' },
    },
  },
  'proof-logo-strip': {
    blocks: {
      label: { copy: 'Trusted by hiring desks' },
      'logo-a': { copy: 'Auryn', icon: 'building' },
      'logo-b': { copy: 'North', icon: 'globe' },
      'logo-c': { copy: 'Harbor', icon: 'briefcase' },
      'logo-d': { copy: 'Field', icon: 'users' },
      'logo-e': { copy: 'Lattice', icon: 'workflow' },
    },
  },
  'proof-testimonial-cards': {
    blocks: {
      intro: { copy: 'From desks that ran the interview', icon: 'quote' },
      'quote-b': { copy: 'The score never left the work.', icon: 'quote' },
      'quote-c': { copy: 'Review was the same file.', icon: 'quote' },
    },
    micro: {
      'quote-a': {
        text: { copy: 'We stopped pasting into a second tool.' },
        avatar: { copy: 'Photo', icon: 'user' },
        name: { copy: 'Maya Chen · Head of Talent' },
      },
    },
  },
  'proof-featured-quote': {
    micro: {
      quote: {
        mark: { copy: 'Quote', icon: 'quote' },
        text: { copy: 'The report still carried the evidence.' },
        attr: { copy: 'Hiring lead · Org plan' },
      },
    },
  },
  'proof-stats-row': {
    blocks: {
      head: { copy: 'A day, counted' },
      'stat-b': { copy: '4 beats', icon: 'layers' },
      'stat-c': { copy: '1 package', icon: 'package' },
      'stat-d': { copy: '0 recap decks', icon: 'file-text' },
    },
    micro: {
      'stat-a': {
        num: { copy: '1' },
        label: { copy: 'Artifact' },
      },
    },
  },
  'nav-standard-bar': {
    blocks: {
      logo: { copy: 'Vurify', icon: 'sparkles' },
      links: { copy: 'Product · Pricing · Journal', icon: 'menu' },
      actions: { copy: 'Sign in · Hire', icon: 'lock' },
    },
  },
  'nav-centered-logo': {
    blocks: {
      'links-left': { copy: 'Product · Days', icon: 'layers' },
      logo: { copy: 'Vurify', icon: 'sparkles' },
      'links-right': { copy: 'Hire · Apply', icon: 'briefcase' },
    },
  },
  'nav-mega-hint': {
    micro: {
      bar: {
        logo: { copy: 'Vurify', icon: 'sparkles' },
        links: { copy: 'Product ▾' },
        cta: { copy: 'Hire', icon: 'briefcase' },
      },
      panel: {
        'col-a': { copy: 'Conversation · Form', icon: 'message' },
        'col-b': { copy: 'Coding · Writing', icon: 'code' },
        'col-c': { copy: 'Verified grading', icon: 'shield' },
      },
    },
  },
  'footer-columns': {
    blocks: {
      brand: { copy: 'Vurify — hire with evidence', icon: 'sparkles' },
      'col-a': { copy: 'Product', icon: 'layers' },
      'col-b': { copy: 'Company', icon: 'building' },
      'col-c': { copy: 'Legal', icon: 'file-text' },
      legal: { copy: '© Vurify', icon: 'globe' },
    },
  },
  'footer-fat-newsletter': {
    blocks: {
      bottom: { copy: 'Privacy · Journal', icon: 'globe' },
    },
    micro: {
      newsletter: {
        copy: { copy: 'Occasional product notes' },
        submit: { copy: 'Email · Join', icon: 'mail' },
      },
      columns: {
        a: { copy: 'Product' },
        b: { copy: 'Days' },
        c: { copy: 'Docs' },
        d: { copy: 'Contact' },
      },
    },
  },
  'footer-minimal': {
    blocks: {
      logo: { copy: 'Vurify', icon: 'sparkles' },
      links: { copy: 'Privacy · Journal', icon: 'globe' },
      copy: { copy: '© 2026' },
    },
  },
  'content-faq-accordion': {
    blocks: {
      head: { copy: 'Questions before a day', icon: 'message' },
    },
    micro: {
      list: {
        'q-a': { copy: 'What is a candidate day?' },
        'q-b': { copy: 'Does review use a second file?' },
        'q-c': { copy: 'Can we start with talk only?' },
        'q-d': { copy: 'Where does the score live?' },
      },
    },
  },
  'content-timeline': {
    blocks: {
      'dot-a': { copy: '01', icon: 'package' },
      'copy-a': { copy: 'Capture — work lands in the kit' },
      'dot-b': { copy: '02', icon: 'shield' },
      'copy-b': { copy: 'Score — marks attach to that artifact' },
      'dot-c': { copy: '03', icon: 'users' },
      'copy-c': { copy: 'Review — a person opens the same package' },
    },
  },
  'content-team-grid': {
    blocks: {
      intro: { copy: 'The desk', icon: 'users' },
      'person-b': { copy: 'Jordan · Assess', icon: 'user' },
      'person-c': { copy: 'Sam · Conversation', icon: 'user' },
      'person-d': { copy: 'Riley · Tools', icon: 'user' },
    },
    micro: {
      'person-a': {
        photo: { copy: 'Portrait', icon: 'user' },
        name: { copy: 'Maya Chen' },
        role: { copy: 'Head of Talent' },
      },
    },
  },
  'content-pricing-cards': {
    blocks: {
      toggle: { copy: 'Monthly · Yearly', icon: 'calendar' },
      'plan-b': { copy: 'Team — the desk plan', icon: 'star' },
      'plan-c': { copy: 'Org', icon: 'building' },
    },
    micro: {
      'plan-a': {
        name: { copy: 'Start' },
        price: { copy: 'Conversation-first' },
        features: { copy: 'One live day' },
        btn: { copy: 'Begin', icon: 'sparkles' },
      },
    },
  },
  'content-tabbed-panel': {
    blocks: {
      panel: { copy: 'Coding runner — traces stay on the attempt', icon: 'code' },
    },
    micro: {
      tabs: {
        'tab-a': { copy: 'Conversation', icon: 'message' },
        'tab-b': { copy: 'Coding', icon: 'code' },
        'tab-c': { copy: 'Writing', icon: 'pen' },
      },
    },
  },
  'form-contact-stack': {
    micro: {
      form: {
        title: { copy: 'Write the desk' },
        'field-a': { copy: 'Name', icon: 'user' },
        'field-b': { copy: 'Work email', icon: 'mail' },
        'field-c': { copy: 'What you want to run' },
        submit: { copy: 'Send', icon: 'mail' },
      },
    },
  },
  'form-split-benefits': {
    blocks: {
      form: { copy: 'Work email · Role', icon: 'mail' },
    },
    micro: {
      benefits: {
        head: { copy: 'Why a day' },
        'b-a': { copy: 'Score on the work', icon: 'shield' },
        'b-b': { copy: 'One package', icon: 'package' },
        'b-c': { copy: 'Review in place', icon: 'users' },
      },
    },
  },
  'form-step-indicator': {
    blocks: {
      fields: { copy: 'Org name · Seat count', icon: 'building' },
      actions: { copy: 'Back · Continue', icon: 'route' },
    },
    micro: {
      steps: {
        s1: { copy: '1 Account', icon: 'check' },
        s2: { copy: '2 Org', icon: 'building' },
        s3: { copy: '3 Day' },
      },
    },
  },
  'stats-dashboard-strip': {
    blocks: {
      'kpi-a': { copy: '12 live', icon: 'calendar' },
      'kpi-b': { copy: '4 scored', icon: 'check' },
      'kpi-c': { copy: '2 review', icon: 'users' },
      'kpi-d': { copy: '1 pack', icon: 'package' },
      chart: { copy: 'Throughput', icon: 'chart' },
    },
  },
  'stats-split-chart': {
    blocks: {
      chart: { copy: 'Score traces this week', icon: 'chart' },
    },
    micro: {
      sidebar: {
        title: { copy: 'By stage' },
        legend: { copy: 'Conversation · Tool · Write', icon: 'layers' },
        filter: { copy: 'This week', icon: 'calendar' },
      },
    },
  },
  'stats-before-after': {
    blocks: {
      label: { copy: 'Recap deck vs package' },
    },
    micro: {
      before: {
        metric: { copy: 'Paste out' },
        caption: { copy: 'Score in a second file' },
      },
      after: {
        metric: { copy: 'One artifact' },
        caption: { copy: 'Evidence still attached' },
      },
    },
  },
}

export function resolveWireframeFill(
  layoutId: string,
  area: string,
  microArea?: string,
): WireframeFillCell | undefined {
  const fill = WIREFRAME_FILLS[layoutId]
  if (!fill) return undefined
  if (microArea) return fill.micro?.[area]?.[microArea]
  return fill.blocks?.[area]
}
