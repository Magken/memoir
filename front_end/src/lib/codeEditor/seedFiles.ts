import { createFile, type CodeWorkspace } from './workspace'

export function createSeedWorkspace(): CodeWorkspace {
  const main = createFile(
    'src/main.js',
    `// Welcome to the code editor showcase
function greet(name) {
  return \`Hello, \${name}!\`
}

console.log(greet('world'))
`,
  )
  const styles = createFile(
    'src/styles.css',
    `:root {
  color-scheme: light dark;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
}
`,
  )
  const utils = createFile(
    'src/lib/utils.js',
    `export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}
`,
  )
  const readme = createFile(
    'README.md',
    `# Showcase workspace

Edit files in the explorer. Create folders from File → New folder.
The terminal is ready — use Run in Creator coding workspaces to execute tests.

## Markdown preview

Use the **Source / Preview** switcher in the toolbar when a \`.md\` or \`.pdf\` file is open.
`,
  )
  const sampleCsv = createFile(
    'data/sample.csv',
    `name,role,status
Ada Lovelace,Engineer,active
Grace Hopper,Scientist,active
Alan Turing,Researcher,archived
`,
  )
  const samplePdf = createFile(
    'docs/sample-brief.pdf',
    '# PDF preview — use Source / Preview in the toolbar\n# Served from /docs/sample-brief.pdf\n',
  )

  return {
    files: [main, styles, utils, readme, sampleCsv, samplePdf],
    folders: ['docs'],
    openIds: [main.id],
    activeId: main.id,
  }
}
