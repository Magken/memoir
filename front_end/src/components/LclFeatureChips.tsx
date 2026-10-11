/**
 * Feature chips for the current LCL layout. Hairline pills so list in/out can drive them.
 */
import { LCL_ELEMENT_BY_ID, type LclElementId } from '../lib/lcl/lclElements'

type LclFeatureChipsProps = {
  features: readonly LclElementId[]
  listRef?: (node: HTMLUListElement | null) => void
}

export function LclFeatureChips({ features, listRef }: LclFeatureChipsProps) {
  return (
    <ul ref={listRef} className="theme-lcl-chips" aria-label="Layout features">
      {features.map((id) => (
        <li key={id}>
          <span className="theme-lcl-chips__item theme-hairline-fx theme-hairline-fx--eirene type-caption">
            {LCL_ELEMENT_BY_ID[id]?.label ?? id}
            <span className="theme-hairline-fx__wipe" aria-hidden>
              <span className="theme-hairline-fx__pill" />
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
