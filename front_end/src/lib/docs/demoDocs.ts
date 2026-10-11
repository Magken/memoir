export type DemoDoc = {
  id: string
  title: string
  subtitle: string
  src: string
}

/** Theme docs showcase — local PDFs under `public/docs/`. */
export const demoDocs: readonly DemoDoc[] = [
  {
    id: 'research-report',
    title: 'Research report',
    subtitle: 'Technical brief · sample PDF',
    src: '/docs/research-report.pdf',
  },
  {
    id: 'sample-brief',
    title: 'Product brief',
    subtitle: 'One-pager · sample PDF',
    src: '/docs/sample-brief.pdf',
  },
] as const
