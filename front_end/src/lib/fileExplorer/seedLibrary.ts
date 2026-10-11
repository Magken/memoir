import { newId } from './path'
import type { DriveEntry, DriveLibrary, DriveMimeGroup } from './types'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function folder(
  name: string,
  parentId: string | null,
  opts?: Partial<DriveEntry>,
): DriveEntry {
  return {
    id: newId('folder'),
    parentId,
    name,
    kind: 'folder',
    mimeGroup: 'folder',
    modifiedAt: daysAgo(2),
    ...opts,
  }
}

function file(
  name: string,
  parentId: string | null,
  mimeGroup: DriveMimeGroup,
  opts?: Partial<DriveEntry>,
): DriveEntry {
  const content = opts?.content
  return {
    id: newId('file'),
    parentId,
    name,
    kind: 'file',
    mimeGroup,
    sizeBytes: content ? new TextEncoder().encode(content).length : opts?.sizeBytes ?? 2048,
    modifiedAt: daysAgo(1),
    ...opts,
  }
}

const MERMAID_SAMPLE = `flowchart LR
  A[Brief] --> B[Design]
  B --> C[Build]
  C --> D[Ship]
`

const FORCE_SAMPLE = `{
  "nodes": [
    { "id": "a", "label": "Core", "group": 0 },
    { "id": "b", "label": "API", "group": 1 },
    { "id": "c", "label": "UI", "group": 2 }
  ],
  "links": [
    { "source": "a", "target": "b", "value": 2 },
    { "source": "a", "target": "c", "value": 1 },
    { "source": "b", "target": "c", "value": 1 }
  ]
}
`

const DRAW_SAMPLE = `{
  "type": "excalidraw",
  "version": 2,
  "source": "file-explorer-seed",
  "elements": [
    {
      "id": "rect1",
      "type": "rectangle",
      "x": 40,
      "y": 40,
      "width": 160,
      "height": 80,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#a5d8ff",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "roundness": { "type": 3 },
      "seed": 1,
      "versionNonce": 1,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1,
      "link": null,
      "locked": false
    }
  ],
  "appState": { "viewBackgroundColor": "#ffffff" },
  "files": {}
}
`

/** Fresh fixture library for Theme / local testing. */
export function createSeedLibrary(): DriveLibrary {
  const projects = folder('Projects', null, { tags: ['work'] })
  const documents = folder('Documents', null, { tags: ['docs'] })
  const media = folder('Media', null)
  const photos = folder('Photos', media.id)
  const videos = folder('Videos', media.id)
  const diagrams = folder('Diagrams', null, { starred: true, tags: ['design'], shareCount: 2 })
  const spreadsheets = folder('Spreadsheets', null)
  const archives = folder('Archives', null, { tags: ['archive'] })
  const client = folder('Northwind', projects.id, { tags: ['client'] })

  const entries: DriveEntry[] = [
    projects,
    documents,
    media,
    photos,
    videos,
    diagrams,
    spreadsheets,
    archives,
    client,
    file(
      'README.md',
      null,
      'markdown',
      {
        content: `# Fixture drive

Use this library to try search, starred, recent, upload, and previews.

- Open **Diagrams** for Mermaid / Force / Draw
- Open **Media/Photos** for images
- Open **Documents** for PDF + notes
`,
        starred: true,
        tags: ['design'],
        modifiedAt: daysAgo(0),
      },
    ),
    file('brand-notes.md', documents.id, 'markdown', {
      content: `## Brand notes\n\nKeep accents on product chrome only.\n`,
      tags: ['design'],
      modifiedAt: daysAgo(3),
    }),
    file('sample-brief.pdf', documents.id, 'pdf', {
      objectUrl: '/docs/sample-brief.pdf',
      mime: 'application/pdf',
      sizeBytes: 120_000,
      tags: ['client'],
      modifiedAt: daysAgo(4),
    }),
    file('research-report.pdf', documents.id, 'pdf', {
      objectUrl: '/docs/research-report.pdf',
      mime: 'application/pdf',
      sizeBytes: 240_000,
      modifiedAt: daysAgo(8),
    }),
    file('demo-thumb.jpg', photos.id, 'image', {
      objectUrl: '/demo-thumb.jpg',
      mime: 'image/jpeg',
      sizeBytes: 48_000,
      starred: true,
      tags: ['design'],
      modifiedAt: daysAgo(1),
    }),
    file('favicon.svg', photos.id, 'image', {
      objectUrl: '/favicon.svg',
      mime: 'image/svg+xml',
      sizeBytes: 2_400,
      modifiedAt: daysAgo(12),
    }),
    file('launch-plan.mmd', diagrams.id, 'mermaid', {
      content: MERMAID_SAMPLE,
      tags: ['design'],
      starred: true,
      modifiedAt: daysAgo(0),
    }),
    file('service-map.force.json', diagrams.id, 'force', {
      content: FORCE_SAMPLE,
      mime: 'application/json',
      tags: ['design'],
      modifiedAt: daysAgo(2),
    }),
    file('whiteboard.excalidraw', diagrams.id, 'draw', {
      content: DRAW_SAMPLE,
      mime: 'application/json',
      modifiedAt: daysAgo(5),
    }),
    file('team.csv', spreadsheets.id, 'csv', {
      content: `name,role,status
Ada Lovelace,Engineer,active
Grace Hopper,Scientist,active
Alan Turing,Researcher,archived
`,
      tags: ['work'],
      modifiedAt: daysAgo(6),
    }),
    file('app.tsx', client.id, 'code', {
      content: `export function App() {\n  return <main>Northwind</main>\n}\n`,
      mime: 'text/tsx',
      tags: ['client'],
      modifiedAt: daysAgo(1),
    }),
    file('theme.css', client.id, 'code', {
      content: `:root {\n  --accent: #0ea5e9;\n}\n`,
      tags: ['client'],
      modifiedAt: daysAgo(1),
    }),
    file('config.json', projects.id, 'json', {
      content: `{\n  "env": "fixture",\n  "offline": true\n}\n`,
      modifiedAt: daysAgo(9),
    }),
    file('todo.txt', archives.id, 'text', {
      content: `Archive checklist\n- Export\n- Tag\n`,
      tags: ['archive'],
      modifiedAt: daysAgo(20),
    }),
    file('clip-placeholder.mp4', videos.id, 'unknown', {
      content: '',
      sizeBytes: 0,
      mime: 'video/mp4',
      modifiedAt: daysAgo(15),
    }),
  ]

  return { entries }
}
