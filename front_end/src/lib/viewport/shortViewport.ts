/** Viewport height below this scales the LCL, not the scene. */
export const SHORT_VPH = 800

/** Scale applied to the LCL when the viewport is shorter than `SHORT_VPH`. */
export const SHORT_VPH_SCALE = 0.75

/** 1 at 800px and above. 0.75 below that. Width and orientation are not inputs. */
export function viewportScale(height: number): number {
  return height < SHORT_VPH ? SHORT_VPH_SCALE : 1
}

/**
 * Mark the page so the LCL host lays out at 1/scale, then scales back to the
 * viewport. The WebGL scene stays outside that host.
 */
export function applyViewportScale(root: HTMLElement, height: number): void {
  root.style.removeProperty('zoom')
  const scale = viewportScale(height)
  if (scale === 1) {
    root.removeAttribute('data-lcl-scale')
    root.style.removeProperty('--lcl-scale')
    return
  }
  root.setAttribute('data-lcl-scale', String(scale))
  root.style.setProperty('--lcl-scale', String(scale))
}
