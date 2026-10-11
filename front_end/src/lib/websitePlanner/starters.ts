import { createFlowNode } from '../flowEditor/flowElementRegistry'
import { applyDagreLayout } from '../flowEditor/reactFlowBridge'
import type { FlowDocument } from '../flowEditor/types'
import { FLOW_SCHEMA_VERSION } from '../flowEditor/types'
import { ensureWebsitePlannerElementsRegistered } from './elements'

export function createBlankWebsitePlan(): FlowDocument {
  ensureWebsitePlannerElementsRegistered()
  return {
    nodes: [],
      edges: [],
      groups: [],
      meta: {
        schemaVersion: FLOW_SCHEMA_VERSION,
        workflowId: 'website-planner',
        prototype: 'website-planner',
      notes: 'Blank website plan — add the Home Page Scene and its Internal Scenes from the palette.',
    },
  }
}

export function createHomeScenePlan(): FlowDocument {
  ensureWebsitePlannerElementsRegistered()
  const groupId = 'group-home-page'
  const loadingGroupId = 'group-home-loading-scene'
  const landingGroupId = 'group-home-landing-scenes'
  const offerGroupId = 'group-home-what-we-offer'
  const howItWorksGroupId = 'group-home-how-it-works'
  const pricingGroupId = 'group-home-pricing'
  const closingGroupId = 'group-home-closing'
  const inviteGroupId = 'group-home-future-invites'

  const home = createFlowNode('plan.page', 'page-scene-home', { x: 0, y: 0 })
  home.label = 'Home Page Scene'
  home.groupId = groupId
  home.config = {
    status: 'existing',
    phase: 'page scene',
    summary:
      'Root Home experience owning Loading, Landing, What We Do, What gets it done, How It Works, Pricing, and planned later scenes as siblings.',
  }

  const loading = createFlowNode('plan.section', 'scene-home-loading', { x: 0, y: 0 })
  loading.label = 'Loading Scene'
  loading.groupId = loadingGroupId
  loading.config = {
    status: 'existing',
    phase: 'entry',
    summary:
      'Run the Extruded 3D Word Cloud — Spiral Pack while Home becomes ready, then exit with the GSAP peel reveal.',
  }

  const wordCloud = createFlowNode('plan.ui', 'ui-loading-word-cloud', { x: 0, y: 0 })
  wordCloud.label = 'Extruded 3D Word Cloud — Spiral Pack'
  wordCloud.groupId = loadingGroupId
  wordCloud.config = {
    status: 'existing',
    phase: 'loading visual',
    summary: 'Primary Loading Scene visual: extruded 3D words in a spiral-pack layout.',
    continuesAs: 'Landing Scene background (treatment TBD)',
  }

  const landing = createFlowNode('plan.section', 'scene-home-landing', { x: 0, y: 0 })
  landing.label = 'Landing Scene'
  landing.groupId = landingGroupId
  landing.ports = [
    { id: 'in-parent', direction: 'in', label: 'from Home' },
    { id: 'in-from-loading', direction: 'in', label: 'from Loading' },
    { id: 'out-statement', direction: 'out', label: 'Statement' },
    { id: 'out-background', direction: 'out', label: 'Background' },
    { id: 'out-hire', direction: 'out', label: 'Hire' },
    { id: 'out-apply', direction: 'out', label: 'Apply' },
    { id: 'out', direction: 'out', label: 'next scene' },
  ]
  landing.config = {
    status: 'existing',
    phase: 'default active scene',
    summary:
      'Hero only: statement, Hire / Apply, and the persistent word-cloud background after Loading.',
  }

  const landingStatement = createFlowNode('plan.ui', 'ui-landing-statement', { x: 0, y: 0 })
  landingStatement.label = '“Talent made visible”'
  landingStatement.groupId = landingGroupId
  landingStatement.ports = [{ id: 'in', direction: 'in', label: 'from Landing' }]
  landingStatement.config = {
    status: 'existing',
    phase: 'landing message',
    summary: 'Primary three-line Landing statement revealed over the persistent word cloud.',
  }

  const landingWordCloud = createFlowNode(
    'plan.ui',
    'ui-landing-word-cloud-background',
    { x: 0, y: 0 },
  )
  landingWordCloud.label = 'Word-cloud Background'
  landingWordCloud.groupId = landingGroupId
  landingWordCloud.ports = [{ id: 'in', direction: 'in', label: 'from Landing' }]
  landingWordCloud.config = {
    status: 'existing',
    phase: 'landing background',
    summary:
      'Landing role of the same persistent loading word cloud; this is a planning reference, not a second canvas.',
  }

  const hireAction = createFlowNode('plan.ui', 'ui-landing-hire-action', { x: 0, y: 0 })
  hireAction.label = 'Hire Action Button'
  hireAction.groupId = landingGroupId
  hireAction.config = {
    status: 'existing',
    phase: 'landing action',
    summary:
      'Hire marquee → Stage 1 organisation signup (employer). Out port still unconnected until /sign-up?kind=organisation ships; see Theme Site plan.',
  }

  const applyAction = createFlowNode('plan.ui', 'ui-landing-apply-action', { x: 0, y: 0 })
  applyAction.label = 'Apply Action Button'
  applyAction.groupId = landingGroupId
  applyAction.config = {
    status: 'existing',
    phase: 'landing action',
    summary:
      'Apply marquee → Stage 1 personal signup (candidate) + CV intake bot. Out port unconnected until /sign-up?kind=personal ships; see Theme Site plan.',
  }

  const whatWeDo = createFlowNode('plan.section', 'scene-home-what-we-do-video', {
    x: 0,
    y: 0,
  })
  whatWeDo.label = 'What We Do — Video Scene'
  whatWeDo.groupId = groupId
  whatWeDo.config = {
    status: 'existing',
    phase: 'scene 02',
    summary:
      '“See beyond” / looping video / “the résumé.” Sticky scrubbed video expansion with Effect 2 title enter.',
  }

  const whatWeOffer = createFlowNode('plan.section', 'scene-home-what-we-offer', {
    x: 0,
    y: 0,
  })
  whatWeOffer.label = 'What gets it done'
  whatWeOffer.groupId = offerGroupId
  whatWeOffer.ports = [
    { id: 'in', direction: 'in', label: 'from Video' },
    { id: 'out-accordion', direction: 'out', label: 'Feature Accordion' },
    { id: 'out-next', direction: 'out', label: 'next scene' },
  ]
  whatWeOffer.config = {
    status: 'existing',
    phase: 'scene 03',
    summary:
      'Effect 2 title enter + VurifyOfferAccordion L/R visual slides — surfaces that get the job done.',
  }

  const featureAccordion = createFlowNode('plan.ui', 'ui-home-feature-accordion', {
    x: 0,
    y: 0,
  })
  featureAccordion.label = 'Vurify Offer Accordion'
  featureAccordion.groupId = offerGroupId
  featureAccordion.ports = [{ id: 'in', direction: 'in', label: 'from What gets it done' }]
  featureAccordion.config = {
    status: 'existing',
    phase: 'what gets it done',
    summary:
      'Feature rows with benefit-led copy and L/R media slides (hover / once).',
  }

  const howItWorks = createFlowNode('plan.section', 'scene-home-how-it-works', {
    x: 0,
    y: 0,
  })
  howItWorks.label = 'How It Works'
  howItWorks.groupId = howItWorksGroupId
  howItWorks.ports = [
    { id: 'in', direction: 'in', label: 'from Offer' },
    { id: 'out-employers', direction: 'out', label: 'Employers' },
    { id: 'out-candidates', direction: 'out', label: 'Candidates' },
    { id: 'out-timeline', direction: 'out', label: 'Expertise Timeline' },
    { id: 'out-next', direction: 'out', label: 'next scene' },
  ]
  howItWorks.config = {
    status: 'existing',
    phase: 'scene 04',
    summary:
      'Sticky For + employers/candidates marquees; page-flow VurifyExpertiseTimeline (audience click switch). Get Started scrolls to Pricing.',
  }

  const employersAudience = createFlowNode('plan.ui', 'ui-home-how-employers', {
    x: 0,
    y: 0,
  })
  employersAudience.label = 'For Employers — Marquee'
  employersAudience.groupId = howItWorksGroupId
  employersAudience.ports = [{ id: 'in', direction: 'in', label: 'from How It Works' }]
  employersAudience.config = {
    status: 'existing',
    phase: 'how it works',
    summary: 'Audience switch control — Hire with signal marquee housing.',
  }

  const candidatesAudience = createFlowNode('plan.ui', 'ui-home-how-candidates', {
    x: 0,
    y: 0,
  })
  candidatesAudience.label = 'For Candidates — Marquee'
  candidatesAudience.groupId = howItWorksGroupId
  candidatesAudience.ports = [{ id: 'in', direction: 'in', label: 'from How It Works' }]
  candidatesAudience.config = {
    status: 'existing',
    phase: 'how it works',
    summary: 'Audience switch control — Show what you can do marquee housing.',
  }

  const expertiseTimeline = createFlowNode('plan.ui', 'ui-home-expertise-timeline', {
    x: 0,
    y: 0,
  })
  expertiseTimeline.label = 'Vurify Expertise Timeline'
  expertiseTimeline.groupId = howItWorksGroupId
  expertiseTimeline.ports = [{ id: 'in', direction: 'in', label: 'from How It Works' }]
  expertiseTimeline.config = {
    status: 'existing',
    phase: 'how it works',
    summary:
      'Six scroll-scrubbed steps per audience (employers / candidates); final rail holds Get Started → Pricing.',
  }

  const pricing = createFlowNode('plan.section', 'scene-home-pricing', {
    x: 0,
    y: 0,
  })
  pricing.label = 'Pricing — Vurify Costs?'
  pricing.groupId = pricingGroupId
  pricing.ports = [
    { id: 'in', direction: 'in', label: 'from How It Works' },
    { id: 'out-tier', direction: 'out', label: 'Tier control' },
    { id: 'out-table', direction: 'out', label: 'Pricing table' },
    { id: 'out-next', direction: 'out', label: 'next scene' },
  ]
  pricing.config = {
    status: 'existing',
    phase: 'scene 05',
    summary:
      '“for [vurify-tiered] Vurify Costs?” header (Effect 2 enter; Vurify color inverts vs tier chrome) + feature table.',
  }

  const pricingTier = createFlowNode('plan.ui', 'ui-home-pricing-tier', {
    x: 0,
    y: 0,
  })
  pricingTier.label = 'Vurify Tiered Radio'
  pricingTier.groupId = pricingGroupId
  pricingTier.ports = [{ id: 'in', direction: 'in', label: 'from Pricing' }]
  pricingTier.config = {
    status: 'existing',
    phase: 'pricing',
    summary:
      'RadioGroup variant vurify-tiered — Candidates · Employers Solo/Team (Premium pop morph). Cap label Employers.',
  }

  const pricingTable = createFlowNode('plan.ui', 'ui-home-pricing-table', {
    x: 0,
    y: 0,
  })
  pricingTable.label = 'Vurify Pricing Table'
  pricingTable.groupId = pricingGroupId
  pricingTable.ports = [{ id: 'in', direction: 'in', label: 'from Pricing' }]
  pricingTable.config = {
    status: 'existing',
    phase: 'pricing',
    summary:
      'Price header · icon + feature + tick rows · CTA; L/R out→in on tier change (Free / Solo / Team).',
  }

  const proofInPractice = createFlowNode(
    'plan.section',
    'scene-home-proof-in-practice',
    { x: 0, y: 0 },
  )
  proofInPractice.label = 'Proof in Practice — Transition Scene'
  proofInPractice.groupId = groupId
  proofInPractice.config = {
    status: 'planned',
    phase: 'transition scene 2',
    summary:
      'One immersive interactive example: a verified profile, portfolio, or candidate story.',
  }

  const resultsTrust = createFlowNode('plan.section', 'scene-home-results-trust', {
    x: 0,
    y: 0,
  })
  resultsTrust.label = 'Results / Trust'
  resultsTrust.groupId = groupId
  resultsTrust.chrome = {
    fill: 'var(--theme-surface-inset)',
    borderColor: 'var(--theme-text-muted)',
    borderStyle: 'dashed',
  }
  resultsTrust.config = {
    status: 'blocked',
    phase: 'deferred — real proof required',
    summary:
      'Future metrics, testimonials, or partner logos. Keep out of the live page until credible proof exists.',
  }

  const faq = createFlowNode('plan.section', 'scene-home-faq', { x: 0, y: 0 })
  faq.label = 'FAQ'
  faq.groupId = groupId
  faq.config = {
    status: 'planned',
    phase: 'in-page scene',
    summary: 'Four to six high-value questions only.',
  }

  const finalCta = createFlowNode('plan.section', 'scene-home-final-cta', {
    x: 0,
    y: 0,
  })
  finalCta.label = 'Reviews + Take a test interview'
  finalCta.groupId = closingGroupId
  finalCta.ports = [
    { id: 'in', direction: 'in', label: 'from prior scene' },
    { id: 'out-next', direction: 'out', label: 'reveal footer' },
  ]
  finalCta.config = {
    status: 'existing',
    phase: 'scene 06 then 07',
    summary:
      'Scene 06 reviews (What people say about Vurify + VurifyTestimonialShift). Scene 07 Take a test interview kit chooser. Scroll end after Scene 07 reveals the under-page footer.',
  }

  const footer = createFlowNode('plan.section', 'scene-home-footer', {
    x: 0,
    y: 0,
  })
  footer.label = 'Footer — Reveal Under Page'
  footer.groupId = closingGroupId
  footer.ports = [
    { id: 'in', direction: 'in', label: 'after Try Vurify' },
    { id: 'out-brand', direction: 'out', label: 'Brand column' },
    { id: 'out-photo-menu', direction: 'out', label: 'Photo menu' },
    { id: 'out-newsletter', direction: 'out', label: 'Newsletter' },
  ]
  footer.config = {
    status: 'existing',
    phase: 'shell underlay (always expanded)',
    summary:
      'Like SceneMenuShell menu layer (sits behind the peel/page card) but never collapsed — scrolling past Scene 07 uncovers a full-height footer. Three columns · complement-tinted underlay · HomeFooter.',
  }

  const footerBrand = createFlowNode('plan.ui', 'ui-home-footer-brand', {
    x: 0,
    y: 0,
  })
  footerBrand.label = 'Brand — Image + Text'
  footerBrand.groupId = closingGroupId
  footerBrand.ports = [{ id: 'in', direction: 'in', label: 'from Footer' }]
  footerBrand.config = {
    status: 'existing',
    phase: 'footer col 1',
    summary:
      'Same language as SceneStackMenu preview: media + overline + title + short body (not a second word-cloud).',
  }

  const footerPhotoMenu = createFlowNode('plan.ui', 'ui-home-footer-photo-menu', {
    x: 0,
    y: 0,
  })
  footerPhotoMenu.label = 'Photo Menu — Links'
  footerPhotoMenu.groupId = closingGroupId
  footerPhotoMenu.ports = [{ id: 'in', direction: 'in', label: 'from Footer' }]
  footerPhotoMenu.config = {
    status: 'existing',
    phase: 'footer col 2',
    summary:
      'Vertical photo-menu buttons (image flag + label) to key destinations — marquee-menu + housing; sitemap-style, not the peel stack.',
  }

  const footerNewsletter = createFlowNode('plan.form', 'form-home-footer-newsletter', {
    x: 0,
    y: 0,
  })
  footerNewsletter.label = 'Newsletter — Standard Fields'
  footerNewsletter.groupId = closingGroupId
  footerNewsletter.ports = [{ id: 'in', direction: 'in', label: 'from Footer' }]
  footerNewsletter.config = {
    status: 'existing',
    phase: 'footer col 3',
    summary:
      'Email (required) + optional name · product Input / Button — do NOT use TextInputFx / Vurify floating-label FX for this pass.',
  }

  const candidateInvite = createFlowNode(
    'plan.section',
    'scene-home-candidate-invite',
    { x: 0, y: 0 },
  )
  candidateInvite.label = 'Candidate Invite Scene'
  candidateInvite.groupId = inviteGroupId
  candidateInvite.chrome = {
    fill: 'var(--theme-surface-inset)',
    borderColor: 'var(--theme-text-muted)',
    borderStyle: 'dashed',
  }
  candidateInvite.config = {
    status: 'planned',
    phase: 'future — inactive',
    summary:
      'Greyed-out placeholder for a future invited-candidate view; not part of the default Home flow.',
  }

  const hiringManagerInvite = createFlowNode(
    'plan.section',
    'scene-home-hiring-manager-invite',
    { x: 0, y: 0 },
  )
  hiringManagerInvite.label = 'Hiring Manager Invite Scene'
  hiringManagerInvite.groupId = inviteGroupId
  hiringManagerInvite.chrome = {
    fill: 'var(--theme-surface-inset)',
    borderColor: 'var(--theme-text-muted)',
    borderStyle: 'dashed',
  }
  hiringManagerInvite.config = {
    status: 'planned',
    phase: 'future — inactive',
    summary:
      'Greyed-out placeholder for a future hiring-manager view; not part of the default Home flow.',
  }

  const pageMenu = createFlowNode('plan.navigation', 'navigation-home-page-menu', { x: 0, y: 0 })
  pageMenu.label = 'Page Menu'
  pageMenu.groupId = groupId
  pageMenu.config = {
    status: 'existing',
    phase: 'homepage navigation',
    summary: 'Global Home page menu context for Scene 2 onward; destinations can expand later.',
  }

  return applyDagreLayout(
    {
    nodes: [
      home,
        loading,
        wordCloud,
        landing,
        landingStatement,
        landingWordCloud,
        hireAction,
        applyAction,
        whatWeDo,
        whatWeOffer,
        featureAccordion,
        howItWorks,
        employersAudience,
        candidatesAudience,
        expertiseTimeline,
        pricing,
        pricingTier,
        pricingTable,
        proofInPractice,
        resultsTrust,
        faq,
        finalCta,
      footer,
        footerBrand,
        footerPhotoMenu,
        footerNewsletter,
        candidateInvite,
        hiringManagerInvite,
        pageMenu,
    ],
    edges: [
        {
          id: 'home-contains-loading',
          source: home.id,
          target: loading.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'loading-contains-word-cloud',
          source: loading.id,
          target: wordCloud.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'home-contains-landing',
          source: home.id,
          target: landing.id,
          sourceHandle: 'out',
          targetHandle: 'in-parent',
          label: 'contains',
        },
        {
          id: 'loading-transitions-to-landing',
          source: loading.id,
          target: landing.id,
          sourceHandle: 'out',
          targetHandle: 'in-from-loading',
          label: 'transitions to',
          style: { animated: true },
        },
        {
          id: 'landing-contains-statement',
          source: landing.id,
          target: landingStatement.id,
          sourceHandle: 'out-statement',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'landing-contains-word-cloud-background',
          source: landing.id,
          target: landingWordCloud.id,
          sourceHandle: 'out-background',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'landing-contains-hire-action',
          source: landing.id,
          target: hireAction.id,
          sourceHandle: 'out-hire',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'landing-contains-apply-action',
          source: landing.id,
          target: applyAction.id,
          sourceHandle: 'out-apply',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'home-contains-what-we-do',
          source: home.id,
          target: whatWeDo.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'landing-transitions-to-what-we-do',
          source: landing.id,
          target: whatWeDo.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'transitions to',
          style: { animated: true },
        },
        {
          id: 'home-contains-what-we-offer',
          source: home.id,
          target: whatWeOffer.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'what-we-do-transitions-to-offer',
          source: whatWeDo.id,
          target: whatWeOffer.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'transitions to',
        },
        {
          id: 'offer-contains-feature-accordion',
          source: whatWeOffer.id,
          target: featureAccordion.id,
          sourceHandle: 'out-accordion',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'home-contains-how-it-works',
          source: home.id,
          target: howItWorks.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'offer-transitions-to-how-it-works',
          source: whatWeOffer.id,
          target: howItWorks.id,
          sourceHandle: 'out-next',
          targetHandle: 'in',
          label: 'transitions to',
        },
        {
          id: 'how-it-works-contains-employers',
          source: howItWorks.id,
          target: employersAudience.id,
          sourceHandle: 'out-employers',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'how-it-works-contains-candidates',
          source: howItWorks.id,
          target: candidatesAudience.id,
          sourceHandle: 'out-candidates',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'how-it-works-contains-timeline',
          source: howItWorks.id,
          target: expertiseTimeline.id,
          sourceHandle: 'out-timeline',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'home-contains-pricing',
          source: home.id,
          target: pricing.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'how-it-works-transitions-to-pricing',
          source: howItWorks.id,
          target: pricing.id,
          sourceHandle: 'out-next',
          targetHandle: 'in',
          label: 'transitions to',
          style: { animated: true },
        },
        {
          id: 'pricing-contains-tier',
          source: pricing.id,
          target: pricingTier.id,
          sourceHandle: 'out-tier',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'pricing-contains-table',
          source: pricing.id,
          target: pricingTable.id,
          sourceHandle: 'out-table',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'home-contains-proof',
          source: home.id,
          target: proofInPractice.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'pricing-transitions-to-proof',
          source: pricing.id,
          target: proofInPractice.id,
          sourceHandle: 'out-next',
          targetHandle: 'in',
          label: 'transitions to',
          style: { animated: true },
        },
        {
          id: 'home-contains-results-trust',
          source: home.id,
          target: resultsTrust.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'results-depends-on-proof',
          source: resultsTrust.id,
          target: proofInPractice.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'depends on',
        },
        {
          id: 'home-contains-faq',
          source: home.id,
          target: faq.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'proof-transitions-to-faq',
          source: proofInPractice.id,
          target: faq.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'transitions to',
        },
        {
          id: 'home-contains-final-cta',
          source: home.id,
          target: finalCta.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'faq-transitions-to-final-cta',
          source: faq.id,
          target: finalCta.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'transitions to',
        },
        {
          id: 'home-contains-footer',
          source: home.id,
          target: footer.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'try-vurify-reveals-footer',
          source: finalCta.id,
          target: footer.id,
          sourceHandle: 'out-next',
          targetHandle: 'in',
          label: 'reveals',
          style: { animated: true },
        },
        {
          id: 'footer-contains-brand',
          source: footer.id,
          target: footerBrand.id,
          sourceHandle: 'out-brand',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'footer-contains-photo-menu',
          source: footer.id,
          target: footerPhotoMenu.id,
          sourceHandle: 'out-photo-menu',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'footer-contains-newsletter',
          source: footer.id,
          target: footerNewsletter.id,
          sourceHandle: 'out-newsletter',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'home-contains-page-menu',
          source: home.id,
          target: pageMenu.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'home-contains-candidate-invite',
          source: home.id,
          target: candidateInvite.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'contains',
        },
        {
          id: 'home-contains-hiring-manager-invite',
          source: home.id,
          target: hiringManagerInvite.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'contains',
        },
      ],
      groups: [
        {
          id: groupId,
          label: 'Home Page',
          nodeIds: [
            home.id,
            pageMenu.id,
            whatWeDo.id,
            proofInPractice.id,
            resultsTrust.id,
            faq.id,
          ],
          notes:
            'Outer Home Page owns standalone Internal Scenes plus nested groups for Loading, Landing, Offer, How It Works, Pricing, Closing, and future invites.',
        },
        {
          id: loadingGroupId,
          label: 'Loading Scene',
          nodeIds: [loading.id, wordCloud.id],
          parentGroupId: groupId,
          notes: 'Nested loading scene and its visual content.',
        },
        {
          id: landingGroupId,
          label: 'Landing Scene',
          nodeIds: [
            landing.id,
            landingStatement.id,
            landingWordCloud.id,
            hireAction.id,
            applyAction.id,
          ],
          parentGroupId: groupId,
          notes:
            'Landing hero only — statement, word-cloud background role, and Hire / Apply actions.',
        },
        {
          id: offerGroupId,
          label: 'What gets it done',
          nodeIds: [whatWeOffer.id, featureAccordion.id],
          parentGroupId: groupId,
          notes: 'Features scene with VurifyOfferAccordion contents.',
        },
        {
          id: howItWorksGroupId,
          label: 'How It Works',
          nodeIds: [
            howItWorks.id,
            employersAudience.id,
            candidatesAudience.id,
            expertiseTimeline.id,
          ],
          parentGroupId: groupId,
          notes:
            'Sticky For + audience marquees and scroll-scrubbed expertise timeline (Get Started → Pricing).',
        },
        {
          id: pricingGroupId,
          label: 'Pricing',
          nodeIds: [pricing.id, pricingTier.id, pricingTable.id],
          parentGroupId: groupId,
          notes:
            'Scene 05 — vurify-tiered radio (Candidates · Employers Solo/Team) + VurifyPricingTable.',
        },
        {
          id: closingGroupId,
          label: 'Closing',
          nodeIds: [
            finalCta.id,
            footer.id,
            footerBrand.id,
            footerPhotoMenu.id,
            footerNewsletter.id,
          ],
          parentGroupId: groupId,
          notes:
            'Scene 06 reviews then Scene 07 Take a test interview, then reveal-under Footer (brand · photo menu · newsletter). Footer is a shell underlay — always expanded.',
        },
        {
          id: inviteGroupId,
          label: 'Future Invite Scenes',
          nodeIds: [candidateInvite.id, hiringManagerInvite.id],
          parentGroupId: groupId,
          notes: 'Muted Candidate and Hiring Manager invite placeholders.',
        },
      ],
    meta: {
      schemaVersion: FLOW_SCHEMA_VERSION,
      workflowId: 'website-planner',
        prototype: 'home-page-scene-plan',
      notes:
          'Live through Scene 07 + Footer: Loading → Landing → What We Do → What gets it done → How It Works → Pricing → reviews → Take a test interview → reveal-under Footer (brand · photo menu · Input newsletter). Still planned mid-flow: Proof → FAQ. Nested groups for Loading, Landing, Offer, How It Works, Pricing, Closing, Future Invites.',
      },
    },
    'TB',
  )
}
