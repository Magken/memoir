import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../Button'
import { WebsitePlanner } from '../WebsitePlanner'

type WebsitePlannerShowcaseProps = {
  /** Leave fullscreen planner and restore Theme side nav. */
  onBack?: () => void
}

export function WebsitePlannerShowcase({ onBack }: WebsitePlannerShowcaseProps) {
  return (
    <div className="theme-website-planner-showcase space-y-4">
      <div className="theme-website-planner-showcase__chrome">
        {onBack ? (
          <Button size="xs" variant="ghost" onClick={onBack} aria-label="Back to Theme sections">
            <ArrowLeft size={14} strokeWidth={2} aria-hidden />
            Back
          </Button>
        ) : null}
        <div className="theme-website-planner-showcase__copy min-w-0">
          <p className="type-h4 mb-1">Website planning</p>
          <p className="type-body-sm type-muted prose-measure mb-0">
            Surface-level site plan on the Flow toolkit — pages, UI, routes,{' '}
            <Link className="underline" to="/theme?section=backend-systems">
              systems catalog
            </Link>
            , gaps, and steps. Local autosave · JSON import/export · Cursor-assisted edits.
          </p>
        </div>
      </div>
      <WebsitePlanner key="website-planner-home-scene-v18" initialStarter="home-scene" />
    </div>
  )
}
