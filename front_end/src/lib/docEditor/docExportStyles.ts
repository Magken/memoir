/** Critical CSS inlined into standalone HTML exports (offline-safe). */
export const DOC_EXPORT_INLINE_CSS = `
:root {
  color-scheme: light;
  --doc-export-text: #1a1a1a;
  --doc-export-muted: #5c5c5c;
  --doc-export-border: #d4d4d4;
  --doc-export-surface: #ffffff;
  --doc-export-code-bg: #f4f4f5;
  --doc-export-highlight: #fef08a;
  --doc-export-link: #2563eb;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: var(--doc-export-surface);
  color: var(--doc-export-text);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.55;
}
.doc-export-body {
  margin: 0 auto;
  padding: var(--doc-export-margin, 38px);
  max-width: var(--doc-export-page-width, 794px);
  min-height: var(--doc-export-page-min-height, 1123px);
}
.doc-export-body p { margin: 0 0 0.65em; }
.doc-export-body h1 { font-size: 1.75rem; margin: 0 0 0.5em; line-height: 1.2; }
.doc-export-body h2 { font-size: 1.35rem; margin: 1.1em 0 0.45em; line-height: 1.25; }
.doc-export-body h3 { font-size: 1.1rem; margin: 0.9em 0 0.35em; line-height: 1.3; }
.doc-export-body blockquote {
  margin: 0.75em 0;
  padding-left: 1em;
  border-left: 3px solid var(--doc-export-border);
  color: var(--doc-export-muted);
}
.doc-export-body ul, .doc-export-body ol { margin: 0 0 0.75em 1.25em; padding: 0; }
.doc-export-body li { margin: 0.2em 0; }
.doc-export-body a { color: var(--doc-export-link); }
.doc-export-body hr, .doc-export-hr {
  border: none;
  border-top: 1px solid var(--doc-export-border);
  margin: 1.25em 0;
}
.doc-export-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75em 0;
  break-inside: avoid;
}
.doc-export-body th, .doc-export-body td {
  border: 1px solid var(--doc-export-border);
  padding: 0.35em 0.55em;
  text-align: left;
  vertical-align: top;
}
.doc-export-body pre, .doc-export-body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
}
.doc-export-body pre {
  background: var(--doc-export-code-bg);
  padding: 0.75em 1em;
  border-radius: 6px;
  overflow-x: auto;
  break-inside: avoid;
}
.doc-export-body code {
  background: var(--doc-export-code-bg);
  padding: 0.1em 0.35em;
  border-radius: 4px;
}
.doc-export-page-break {
  break-after: page;
  page-break-after: always;
  height: 0;
  margin: 0;
  padding: 0;
  border: none;
  visibility: hidden;
}
.doc-export-diagram,
.doc-export-image,
.doc-export-equation,
.doc-export-poll,
.doc-export-sticky,
.doc-export-collapsible,
.doc-export-layout {
  break-inside: avoid;
  margin: 0.75em 0;
}
.doc-export-diagram img,
.doc-export-image img {
  display: block;
  max-width: 100%;
  height: auto;
}
.doc-export-video-link {
  display: inline-block;
  margin: 0.5em 0;
  padding: 0.35em 0.65em;
  border: 1px solid var(--doc-export-border);
  border-radius: 6px;
  text-decoration: none;
}
.doc-export-poll__question { font-weight: 600; margin-bottom: 0.35em; }
.doc-export-poll__options { margin: 0; padding-left: 1.25em; }
.doc-export-sticky {
  display: block;
  padding: 0.75em 1em;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
.doc-export-sticky--yellow { background: #fef9c3; }
.doc-export-sticky--pink { background: #fce7f3; }
.doc-export-collapsible { margin: 0.75em 0; }
.doc-export-collapsible-title { font-weight: 600; cursor: default; }
.doc-export-layout {
  display: grid;
  gap: 1rem;
  margin: 0.75em 0;
}
.doc-export-layout-item { min-width: 0; }
.doc-export-equation { overflow-x: auto; }
@media print {
  body { background: white; }
  .doc-export-body { max-width: none; }
}
`
