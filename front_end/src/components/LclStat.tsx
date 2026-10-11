/**
 * LCL stat: label plus a tabular-nums value for count-up.
 */
type LclStatProps = {
  label: string
  valueRef?: (node: HTMLElement | null) => void
  value?: string
}

export function LclStat({ label, valueRef, value = '0' }: LclStatProps) {
  return (
    <div className="theme-lcl-stat">
      <p className="type-caption mb-0">{label}</p>
      <p ref={valueRef} className="theme-lcl-stat__value type-h3 mb-0 tabular-nums">
        {value}
      </p>
    </div>
  )
}
