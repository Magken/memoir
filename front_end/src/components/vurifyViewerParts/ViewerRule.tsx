/** Thin document hairline — theme border tokens; variants match CV section-break weight. */
export function ViewerRule({ className = '' }: { className?: string }) {
  return (
    <hr
      className={['theme-vurify-viewer__rule', className].filter(Boolean).join(' ')}
      aria-hidden
    />
  )
}
