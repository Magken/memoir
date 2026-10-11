/** Soft gradient overlays at scroll edges — pair with `theme-scroll--clouds` + edge state attrs. */
export function ScrollCloudEdges() {
  return (
    <>
      <div className="theme-scroll__cloud theme-scroll__cloud--start" aria-hidden />
      <div className="theme-scroll__cloud theme-scroll__cloud--end" aria-hidden />
    </>
  )
}
