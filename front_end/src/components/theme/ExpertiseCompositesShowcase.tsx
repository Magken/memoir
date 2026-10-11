import type { ReactNode } from 'react'
import { GlowTimeline } from '../GlowTimeline'
import {
  THEME_DEMO_DEGREES,
  THEME_GLOW_TIMELINE_EDUCATION_SCROLL,
  THEME_GLOW_TIMELINE_HORIZONTAL_SCROLL,
} from '../../lib/theme/glowTimelineFixtures'

function TimelineRow({
  name,
  purpose,
  stack,
  preview,
}: {
  name: string
  purpose: string
  stack: string
  preview: ReactNode
}) {
  return (
    <li className="theme-shell-divider grid gap-5 py-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-12">
      <aside className="min-w-0 space-y-2 lg:sticky lg:top-24">
        <p className="type-label mb-0">{name}</p>
        <p className="type-body-sm type-muted mb-0">{purpose}</p>
        <p className="type-code mb-0 break-words">{stack}</p>
      </aside>
      <div className="theme-page__scroll-runway min-w-0">{preview}</div>
    </li>
  )
}

export function ExpertiseCompositesShowcase() {
  return (
    <div className="space-y-10">
      <div className="space-y-3 prose-measure">
        <p className="type-body-sm type-muted mb-0">
          <strong>Glow timeline</strong> — scroll the page to scrub the rail glow and dot activation
          (vertical or horizontal). Uses global <code className="type-code">GsapPageProvider</code>{' '}
          + Lenis; palette from the sidebar <code className="type-code">ThemeProvider</code>.
        </p>
      </div>

      <ul className="mb-0 list-none p-0">
        <TimelineRow
          name="Carded"
          purpose="Timeline inside a raised Card — education panel pattern."
          stack="GlowTimeline shell='carded' · Card raised · GraduationCap header"
          preview={
            <GlowTimeline
              shell="carded"
              degrees={THEME_DEMO_DEGREES}
              scroll={THEME_GLOW_TIMELINE_EDUCATION_SCROLL}
            />
          }
        />
        <TimelineRow
          name="Cardless"
          purpose="Bare timeline shell — no card chrome."
          stack="GlowTimeline shell='cardless'"
          preview={
            <GlowTimeline
              shell="cardless"
              degrees={THEME_DEMO_DEGREES}
              scroll={THEME_GLOW_TIMELINE_EDUCATION_SCROLL}
            />
          }
        />
        <TimelineRow
          name="Horizontal carded"
          purpose="Left-to-right glow rail — milestones in a row inside a raised Card."
          stack="GlowTimeline orientation='horizontal' shell='carded'"
          preview={
            <GlowTimeline
              shell="carded"
              orientation="horizontal"
              degrees={THEME_DEMO_DEGREES}
              scroll={THEME_GLOW_TIMELINE_HORIZONTAL_SCROLL}
            />
          }
        />
        <TimelineRow
          name="Horizontal cardless"
          purpose="Wide horizontal rail without card chrome."
          stack="GlowTimeline orientation='horizontal' shell='cardless'"
          preview={
            <GlowTimeline
              shell="cardless"
              orientation="horizontal"
              degrees={THEME_DEMO_DEGREES}
              scroll={THEME_GLOW_TIMELINE_HORIZONTAL_SCROLL}
            />
          }
        />
      </ul>
    </div>
  )
}
