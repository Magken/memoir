import type { VurifyViewerDoc } from './types'
import { normalizeCvViewerDoc } from '../../lib/cvApi/cvNormalize'

/** Fixed ids so presence / dnd keys stay stable across reloads. */
const IDS = {
  secSkills: 'a1000000-0000-4000-8000-000000000001',
  secExperience: 'a1000000-0000-4000-8000-000000000002',
  secEducation: 'a1000000-0000-4000-8000-000000000003',
  secProjects: 'a1000000-0000-4000-8000-000000000004',
  secPublications: 'a1000000-0000-4000-8000-000000000005',
  secReferences: 'a1000000-0000-4000-8000-000000000006',
  secAwards: 'a1000000-0000-4000-8000-000000000007',
  secCerts: 'a1000000-0000-4000-8000-000000000008',
  secVolunteer: 'a1000000-0000-4000-8000-000000000009',
  secCustom: 'a1000000-0000-4000-8000-00000000000a',
  itemSkillsTaxonomy: 'b1000000-0000-4000-8000-000000000001',
  itemExpIntellivey: 'b1000000-0000-4000-8000-000000000003',
  itemExpHarbor: 'b1000000-0000-4000-8000-000000000004',
  itemEdu: 'b1000000-0000-4000-8000-000000000005',
  itemProject: 'b1000000-0000-4000-8000-000000000006',
  itemPub: 'b1000000-0000-4000-8000-000000000007',
  itemRef1: 'b1000000-0000-4000-8000-000000000008',
  itemRef2: 'b1000000-0000-4000-8000-000000000009',
  itemAward: 'b1000000-0000-4000-8000-00000000000a',
  itemCert: 'b1000000-0000-4000-8000-00000000000b',
  itemVol: 'b1000000-0000-4000-8000-00000000000c',
  itemCustom: 'b1000000-0000-4000-8000-00000000000d',
} as const

/**
 * Comprehensive CvExtractV2 seed for Theme → Vurify Viewer.
 * Passed through normalize (canonical section order + one skills shape).
 */
const VURIFY_VIEWER_FIXTURE_RAW: VurifyViewerDoc = {
  schema_version: 2,
  basics: {
    display_name: 'Alex Rivera',
    headline: 'Software developer · **proof-first** systems',
    summary:
      'Builds hiring and talent tools with clear evidence trails. Comfortable from _schema design_ through polished product UI — OpenAI, LangChain, and structured CV v2.',
    emails: ['alex.rivera@example.com'],
    phones: [{ value: '+1 555 010 2244', label: 'mobile' }],
    locations: [
      {
        city: 'Saint Louis',
        region: 'MO',
        country: 'USA',
        raw: 'Saint Louis, MO',
      },
    ],
    links: [
      { url: 'https://github.com/alexrivera', kind: 'github', label: 'GitHub' },
      { url: 'https://linkedin.com/in/alexrivera', kind: 'linkedin', label: 'LinkedIn' },
      { url: 'https://alexrivera.dev', kind: 'portfolio', label: 'Portfolio' },
    ],
    languages: [
      { name: 'English', level: 'Native' },
      { name: 'Spanish', level: 'Conversational' },
    ],
  },
  sections: [
    {
      id: IDS.secSkills,
      kind: 'skills',
      title: 'Skills',
      sort_order: 0,
      items: [
        {
          id: IDS.itemSkillsTaxonomy,
          bullets: [
            '**Languages:** Python, TypeScript, JavaScript, Node.js, SQL, Bash, SPARQL, OWL 2',
            '**AI & LLM:** RAG pipelines, embeddings, vector search, OpenAI API, LangChain, prompt engineering',
            '**AI Coding Tools:** Cursor, Claude, GitHub Copilot, MCP servers and agents',
            '**Backend & APIs:** FastAPI, Flask, REST APIs, serverless integrations, Supabase, Firebase, GCP',
            '**Platform:** Docker, Kubernetes, Git, CI/CD, PostgreSQL, pgvector, Linux, Hugging Face',
            '**Frontend:** React, TypeScript, Flutter, Electron, Tailwind CSS, Vite, Chart.js, D3.js',
          ],
        },
      ],
    },
    {
      id: IDS.secExperience,
      kind: 'experience',
      title: 'Work Experience',
      sort_order: 1,
      items: [
        {
          id: IDS.itemExpIntellivey,
          org: 'Intellivey',
          title: 'Software Developer',
          start: 'Jan 2026',
          end: null,
          current: true,
          location: 'Saint Louis, MO',
          employment_type: 'Full-time',
          url: 'https://intellivey.netlify.app',
          bullets: [
            '**Demo:** intellivey.netlify.app',
            'Shipped verifiable profile surfaces with structured **CV v2** extract and Drive jsonb persistence.',
            'Built evidence-first editors used by talent and recruiting workflows.',
          ],
          technologies: ['TypeScript', 'React', 'Supabase', 'LangChain'],
        },
        {
          id: IDS.itemExpHarbor,
          org: 'Harbor Soft',
          title: 'Software Engineer',
          start: '2019',
          end: '2022',
          current: false,
          location: 'Remote',
          employment_type: 'Full-time',
          bullets: [
            'Integrated Total Variation Minimization to improve gestures from event images by 30%.',
            'MediaPipe Hands Landmark embedding for robust landmark detection.',
            'Automated the acquisition and annotation pipeline for training and evaluation.',
          ],
          // Italic horizontal footer (not bullets) — Theme /VurifyViewer showcase
          technologies: ['PyTorch', 'OpenCV', 'MediaPipe'],
        },
      ],
    },
    {
      id: IDS.secEducation,
      kind: 'education',
      title: 'Education',
      sort_order: 2,
      items: [
        {
          id: IDS.itemEdu,
          institution: 'Saint Louis University',
          degree: 'B.S.',
          field: 'Computer Science',
          start: '2015',
          end: '2019',
          location: 'Saint Louis, MO',
          honors: ["Dean's list"],
        },
      ],
    },
    {
      id: IDS.secProjects,
      kind: 'projects',
      title: 'Projects',
      sort_order: 3,
      items: [
        {
          id: IDS.itemProject,
          name: 'Proof trail',
          role: 'Lead',
          url: 'https://example.com/proof',
          bullets: [
            'Open prototype for verifiable work-history snippets.',
            'Realtime evidence feeds for candidate proof trails.',
          ],
          stack: ['React', 'Supabase', 'pgvector'],
        },
      ],
    },
    {
      id: IDS.secPublications,
      kind: 'publications',
      title: 'Publications',
      sort_order: 4,
      items: [
        {
          id: IDS.itemPub,
          title: 'Evidence in hiring UIs',
          venue: 'Industry talk',
          year: '2024',
          url: 'https://example.com/talk',
          body: 'Talk on showing _proof_ without burying candidates in forms.',
        },
      ],
    },
    {
      id: IDS.secReferences,
      kind: 'references',
      title: 'References',
      sort_order: 5,
      items: [
        {
          id: IDS.itemRef1,
          name: 'Falak Saffaf, Ph.D.',
          relationship: 'Faculty advisor',
          org: 'SLU School for Professional Studies',
          email: 'falak.saffaf.1@slu.edu',
        },
        {
          id: IDS.itemRef2,
          name: 'Kenrick Takang',
          relationship: 'Colleague',
          org: 'RWD Consulting',
          email: 'tangangkenrickakere@yahoo.com',
          note: 'Senior Data Analyst',
        },
      ],
    },
    {
      id: IDS.secAwards,
      kind: 'awards',
      title: 'Awards',
      sort_order: 6,
      items: [
        {
          id: IDS.itemAward,
          name: 'Hackathon — Best evidence UX',
          issuer: 'Regional builders meetup',
          date: '2023',
          body: 'Recognized for **proof-first** candidate flows.',
        },
      ],
    },
    {
      id: IDS.secCerts,
      kind: 'certifications',
      title: 'Certifications',
      sort_order: 7,
      items: [
        {
          id: IDS.itemCert,
          name: 'AWS Cloud Practitioner',
          issuer: 'Amazon Web Services',
          date: '2022',
          credential_id: 'AWS-CP-DEMO',
          url: 'https://aws.amazon.com/verification',
        },
      ],
    },
    {
      id: IDS.secVolunteer,
      kind: 'volunteer',
      title: 'Volunteer',
      sort_order: 8,
      items: [
        {
          id: IDS.itemVol,
          org: 'Code for STL',
          title: 'Mentor',
          start: '2021',
          end: null,
          current: true,
          location: 'Saint Louis, MO',
          bullets: ['Mentored juniors on React and accessible forms.'],
        },
      ],
    },
    {
      id: IDS.secCustom,
      kind: 'custom',
      title: 'Speaking',
      sort_order: 9,
      items: [
        {
          id: IDS.itemCustom,
          title: 'Workshop — CV as structured evidence',
          date_raw: '2025',
          body: 'Hands-on session on **labeled bullets** vs structured skill groups for extract quality.',
          url: 'https://example.com/workshop',
        },
      ],
    },
  ],
  coverage: {
    found_kinds: [
      'skills',
      'experience',
      'education',
      'projects',
      'publications',
      'references',
      'awards',
      'certifications',
      'volunteer',
      'custom',
    ],
    missing_common: [],
    warnings: [],
  },
  missed: [],
  meta_extract: {
    source_chars: 8200,
    used_vision: false,
  },
}

export const VURIFY_VIEWER_FIXTURE: VurifyViewerDoc = normalizeCvViewerDoc(
  VURIFY_VIEWER_FIXTURE_RAW,
)

export function cloneViewerFixture(): VurifyViewerDoc {
  return structuredClone(VURIFY_VIEWER_FIXTURE)
}
