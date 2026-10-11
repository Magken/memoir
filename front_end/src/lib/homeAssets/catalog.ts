/**
 * Home public media — files live in `front_end/public/home/` (Vite URL `/home/…`).
 * unDraw needs no credit. Storyset / Freepik free files do — store `credit` +
 * `creditHref` when used, and render `credit` as static text (not a hyperlink).
 */

export type HomeAssetKind = 'gif' | 'svg' | 'png' | 'webp' | 'mp4'

export type HomeAsset = {
  id: string
  /** Public URL (`/home/…` or `/errors/…`). */
  src: string
  kind: HomeAssetKind
  alt: string
  /** Still frame for mp4s — shown before the video decoder attaches. */
  poster?: string
  /** Timestamp stills for offer accordion hover (no decoder). */
  frames?: readonly string[]
  /** Attribution label — render as non-clickable text when present. */
  credit?: string
  /** Attribution URL kept for the catalogue (not wired as an href in UI). */
  creditHref?: string
  /** Optional illustration source page. */
  sourceHref?: string
}

export const HOME_ASSETS = {
  mark: {
    id: 'vurify-mark',
    src: '/home/vurify-mark.png',
    kind: 'png',
    alt: 'Vurify mark',
  },
  logo: {
    id: 'vurify-logo',
    src: '/home/vurify-logo.png',
    kind: 'png',
    alt: 'Vurify logo',
  },
  talentMadeVisible: {
    id: 'talent-made-visible',
    src: '/home/talent-made-visible.svg',
    kind: 'svg',
    alt: 'Illustrated person presenting work on a large screen',
    sourceHref: 'https://undraw.co/',
  },
  whatWeDo: {
    id: 'what-we-do',
    src: '/home/what-we-do.svg',
    kind: 'svg',
    alt: 'Illustrated documents, identity, and paper trails of work',
    sourceHref: 'https://undraw.co/',
  },
  /** Scene 02 reel — merged 4s beats from the five offer clips; replace later with a authored film. */
  whatWeDoReel: {
    id: 'what-we-do-reel',
    src: '/home/what-we-do-reel.mp4',
    kind: 'mp4',
    alt: 'Product demo compilation',
    poster: '/home/what-we-do-reel.poster.webp',
  },
  beyondResumeA: {
    id: 'beyond-resume-a',
    src: '/home/beyond-resume-a.svg',
    kind: 'svg',
    alt: 'Illustrated person with a résumé packet',
    sourceHref: 'https://undraw.co/',
  },
  beyondResumeB: {
    id: 'beyond-resume-b',
    src: '/home/beyond-resume-b.svg',
    kind: 'svg',
    alt: 'Illustrated résumés and candidate profiles',
    sourceHref: 'https://undraw.co/',
  },
  whatGetsItDone: {
    id: 'what-gets-it-done',
    src: '/home/what-gets-it-done.svg',
    kind: 'svg',
    alt: 'Illustrated person walking through interview steps',
    sourceHref: 'https://undraw.co/',
  },
  howItWorks: {
    id: 'how-it-works',
    src: '/home/how-it-works.svg',
    kind: 'svg',
    alt: 'Illustrated organisation path from interviewers to results',
    sourceHref: 'https://undraw.co/',
  },
  tryVurify: {
    id: 'try-vurify',
    src: '/home/try-vurify.svg',
    kind: 'svg',
    alt: 'Illustrated candidate starting an interview',
    sourceHref: 'https://undraw.co/',
  },
  pricing: {
    id: 'pricing',
    src: '/home/pricing.svg',
    kind: 'svg',
    alt: 'Illustrated credit card and payment slip',
    sourceHref: 'https://undraw.co/',
  },
  /** Scene 03 offer — organisation front card. */
  offerAgencyManagement: {
    id: 'offer-agency-management',
    src: '/home/offer/agency-management.svg',
    kind: 'svg',
    alt: 'Illustrated organisation hiring board',
    sourceHref: 'https://undraw.co/',
  },
  offerAgencyManagementVideo: {
    id: 'offer-agency-management-video',
    src: '/home/offer/agency-management.mp4',
    kind: 'mp4',
    alt: 'Organisation workspace preview',
    poster: '/home/offer/agency-management.poster.webp',
    frames: [
      '/home/offer/agency-management.f1.webp',
      '/home/offer/agency-management.f2.webp',
      '/home/offer/agency-management.f3.webp',
      '/home/offer/agency-management.f4.webp',
    ],
  },
  /** Scene 03 offer — interview creation front (review / analysis craft). */
  offerReviewAnalysis: {
    id: 'offer-review-analysis',
    src: '/home/offer/review-analysis.svg',
    kind: 'svg',
    alt: 'Illustrated review of interview analysis',
    sourceHref: 'https://undraw.co/',
  },
  offerInterviewCreationVideo: {
    id: 'offer-interview-creation-video',
    src: '/home/offer/interview-creation.mp4',
    kind: 'mp4',
    alt: 'Interview creator preview',
    poster: '/home/offer/interview-creation.poster.webp',
    frames: [
      '/home/offer/interview-creation.f1.webp',
      '/home/offer/interview-creation.f2.webp',
      '/home/offer/interview-creation.f3.webp',
      '/home/offer/interview-creation.f4.webp',
    ],
  },
  offerResumeUpload: {
    id: 'offer-resume-upload',
    src: '/home/offer/resume-upload.svg',
    kind: 'svg',
    alt: 'Illustrated résumé upload',
    sourceHref: 'https://undraw.co/',
  },
  offerCvIntakeVideo: {
    id: 'offer-cv-intake-video',
    src: '/home/offer/cv-intake.mp4',
    kind: 'mp4',
    alt: 'CV intake preview',
    poster: '/home/offer/cv-intake.poster.webp',
    frames: [
      '/home/offer/cv-intake.f1.webp',
      '/home/offer/cv-intake.f2.webp',
      '/home/offer/cv-intake.f3.webp',
      '/home/offer/cv-intake.f4.webp',
    ],
  },
  offerInterviewTaking: {
    id: 'offer-interview-taking',
    src: '/home/offer/interview-taking.svg',
    kind: 'svg',
    alt: 'Illustrated candidate taking an interview',
    sourceHref: 'https://undraw.co/',
  },
  offerLiveInterviewVideo: {
    id: 'offer-live-interview-video',
    src: '/home/offer/live-interview.mp4',
    kind: 'mp4',
    alt: 'Live interview preview',
    poster: '/home/offer/live-interview.poster.webp',
    frames: [
      '/home/offer/live-interview.f1.webp',
      '/home/offer/live-interview.f2.webp',
      '/home/offer/live-interview.f3.webp',
      '/home/offer/live-interview.f4.webp',
    ],
  },
  offerInformedDecision: {
    id: 'offer-informed-decision',
    src: '/home/offer/informed-decision.svg',
    kind: 'svg',
    alt: 'Illustrated hiring decision with evidence',
    sourceHref: 'https://undraw.co/',
  },
  offerHiringPackageVideo: {
    id: 'offer-hiring-package-video',
    src: '/home/offer/hiring-package.mp4',
    kind: 'mp4',
    alt: 'Hiring package preview',
    poster: '/home/offer/hiring-package.poster.webp',
    frames: [
      '/home/offer/hiring-package.f1.webp',
      '/home/offer/hiring-package.f2.webp',
      '/home/offer/hiring-package.f3.webp',
      '/home/offer/hiring-package.f4.webp',
    ],
  },
} as const satisfies Record<string, HomeAsset>

/** Outflow error illustrations — files in `front_end/public/errors/`. */
export const ERROR_ASSETS = {
  notFound: {
    id: 'error-404',
    src: '/errors/404.svg',
    kind: 'svg',
    alt: 'Decorative 404 with a plant in the zero',
  },
} as const satisfies Record<string, HomeAsset>
