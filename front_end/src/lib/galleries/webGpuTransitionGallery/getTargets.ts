export function webGpuGetMainTargets(rootEl: HTMLElement) {
  const slots = rootEl.querySelectorAll<HTMLElement>('.theme-webgpu-transition-gallery__slot')
  const rects = []
  for (let i = 0; i < slots.length; i += 1) {
    const rect = slots[i]!.getBoundingClientRect()
    rects.push({ x: rect.left, y: rect.top, w: rect.width, h: rect.height })
  }
  return rects
}

export function webGpuGetInnerTargets(rootEl: HTMLElement) {
  const slots = rootEl.querySelectorAll<HTMLElement>('.theme-webgpu-transition-gallery__stack .theme-webgpu-transition-gallery__slot')
  const rects = []
  for (let i = 0; i < slots.length; i += 1) {
    const rect = slots[i]!.getBoundingClientRect()
    rects.push({ x: rect.left, y: rect.top, w: rect.width, h: rect.height })
  }
  return rects
}
