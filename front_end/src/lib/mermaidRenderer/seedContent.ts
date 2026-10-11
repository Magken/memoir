export const SEED_MERMAID = `flowchart TD
    A[Source text] --> B{Parse}
    B -->|valid| C[Render SVG]
    B -->|invalid| D[Show error]
    C --> E[Preview pane]
`
