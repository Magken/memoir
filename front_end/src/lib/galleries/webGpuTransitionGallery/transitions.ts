import {
  WEBGPU_GALLERY_MAIN_COUNT,
  WEBGPU_GALLERY_SATELLITES_PER_IMAGE,
  webGpuMainIdx,
  webGpuSatIdx,
} from './constants'
import { webGpuGetInnerTargets, webGpuGetMainTargets } from './getTargets'
import type { WebGpuPageTransition, WebGpuTransitionContext } from './types'
import {
  WEBGPU_DUR_FADE,
  WEBGPU_EASE_FADE_OUT,
  webGpuTweenBounds,
  webGpuTweenOpacity,
} from './tween'

export class WebGpuMainToInnerTransition implements WebGpuPageTransition {
  async out(_from: HTMLElement | null, toEl: HTMLElement | null, ctx: WebGpuTransitionContext) {
    const { gpu, toImage } = ctx
    if (toImage === null || !toEl) return
    const innerRects = webGpuGetInnerTargets(toEl)
    const target = innerRects[0]
    if (!target) return
    const tweens = []
    for (let i = 0; i < WEBGPU_GALLERY_MAIN_COUNT; i += 1) {
      const plane = gpu.planes[webGpuMainIdx(i)]!
      if (i === toImage) {
        tweens.push(webGpuTweenBounds(plane, target))
        continue
      }
      tweens.push(webGpuTweenOpacity(plane, 0))
    }
    await Promise.all(tweens)
  }

  async in(_from: HTMLElement | null, toEl: HTMLElement | null, ctx: WebGpuTransitionContext) {
    const { gpu, toImage } = ctx
    if (toImage === null || !toEl) return
    const innerRects = webGpuGetInnerTargets(toEl)
    const fades = []
    for (let j = 0; j < WEBGPU_GALLERY_SATELLITES_PER_IMAGE; j += 1) {
      const sat = gpu.planes[webGpuSatIdx(toImage, j)]!
      const slot = innerRects[j + 1]
      if (!slot) continue
      sat.bounds = { ...slot }
      sat.opacity = 0
      fades.push(webGpuTweenOpacity(sat, 1, { delay: 0.25 + j * 0.08 }))
    }
    await Promise.all(fades)
  }
}

export class WebGpuInnerToMainTransition implements WebGpuPageTransition {
  async out(_from: HTMLElement | null, toEl: HTMLElement | null, ctx: WebGpuTransitionContext) {
    const { gpu, fromImage } = ctx
    if (fromImage === null || !toEl) return
    const mainRects = webGpuGetMainTargets(toEl)
    const target = mainRects[fromImage]
    if (!target) return
    const tweens = []
    tweens.push(webGpuTweenBounds(gpu.planes[webGpuMainIdx(fromImage)]!, target))
    for (let j = 0; j < WEBGPU_GALLERY_SATELLITES_PER_IMAGE; j += 1) {
      const sat = gpu.planes[webGpuSatIdx(fromImage, j)]!
      const reversedDelay = (WEBGPU_GALLERY_SATELLITES_PER_IMAGE - 1 - j) * 0.05
      tweens.push(
        webGpuTweenOpacity(sat, 0, {
          duration: WEBGPU_DUR_FADE * 0.7,
          ease: WEBGPU_EASE_FADE_OUT,
          delay: reversedDelay,
        }),
      )
    }
    await Promise.all(tweens)
  }

  async in(_from: HTMLElement | null, toEl: HTMLElement | null, ctx: WebGpuTransitionContext) {
    const { gpu, fromImage } = ctx
    if (fromImage === null || !toEl) return
    const mainRects = webGpuGetMainTargets(toEl)
    const fades = []
    for (let i = 0; i < WEBGPU_GALLERY_MAIN_COUNT; i += 1) {
      if (i === fromImage) continue
      const main = gpu.planes[webGpuMainIdx(i)]!
      const rect = mainRects[i]
      if (!rect) continue
      main.bounds = { ...rect }
      main.opacity = 0
      fades.push(webGpuTweenOpacity(main, 1, { delay: 0.25 }))
    }
    await Promise.all(fades)
  }
}

export class WebGpuMainToIndexTransition implements WebGpuPageTransition {
  async out(_from: HTMLElement | null, _to: HTMLElement | null, ctx: WebGpuTransitionContext) {
    const { gpu, indexFloat } = ctx
    if (!indexFloat) return
    const targets = indexFloat.getTargets()
    const tweens = []
    for (let i = 0; i < WEBGPU_GALLERY_MAIN_COUNT; i += 1) {
      const target = targets[webGpuMainIdx(i)]
      if (!target) continue
      tweens.push(webGpuTweenBounds(gpu.planes[webGpuMainIdx(i)]!, target))
    }
    await Promise.all(tweens)
  }

  async in() {
    // Mains morph in via out().
  }
}

export class WebGpuIndexToMainTransition implements WebGpuPageTransition {
  async out(_from: HTMLElement | null, toEl: HTMLElement | null, ctx: WebGpuTransitionContext) {
    const { gpu } = ctx
    if (!toEl) return
    const mainRects = webGpuGetMainTargets(toEl)
    const tweens = []
    for (let i = 0; i < WEBGPU_GALLERY_MAIN_COUNT; i += 1) {
      const rect = mainRects[i]
      if (!rect) continue
      tweens.push(webGpuTweenBounds(gpu.planes[webGpuMainIdx(i)]!, rect))
    }
    await Promise.all(tweens)
  }

  async in() {
    // Planes morph via out().
  }
}

export class WebGpuIndexToInnerTransition implements WebGpuPageTransition {
  async out(_from: HTMLElement | null, toEl: HTMLElement | null, ctx: WebGpuTransitionContext) {
    const { gpu, toImage } = ctx
    if (toImage === null || !toEl) return
    const innerRects = webGpuGetInnerTargets(toEl)
    const hero = innerRects[0]
    if (!hero) return
    const tweens = []
    tweens.push(webGpuTweenBounds(gpu.planes[webGpuMainIdx(toImage)]!, hero))
    for (let i = 0; i < WEBGPU_GALLERY_MAIN_COUNT; i += 1) {
      if (i === toImage) continue
      tweens.push(
        webGpuTweenOpacity(gpu.planes[webGpuMainIdx(i)]!, 0, {
          duration: WEBGPU_DUR_FADE * 0.7,
          ease: WEBGPU_EASE_FADE_OUT,
        }),
      )
    }
    await Promise.all(tweens)
  }

  async in(_from: HTMLElement | null, toEl: HTMLElement | null, ctx: WebGpuTransitionContext) {
    const { gpu, toImage } = ctx
    if (toImage === null || !toEl) return
    const innerRects = webGpuGetInnerTargets(toEl)
    const fades = []
    for (let j = 0; j < WEBGPU_GALLERY_SATELLITES_PER_IMAGE; j += 1) {
      const sat = gpu.planes[webGpuSatIdx(toImage, j)]!
      const slot = innerRects[j + 1]
      if (!slot) continue
      sat.bounds = { ...slot }
      sat.opacity = 0
      fades.push(webGpuTweenOpacity(sat, 1, { delay: 0.25 + j * 0.08 }))
    }
    await Promise.all(fades)
  }
}

export class WebGpuInnerToIndexTransition implements WebGpuPageTransition {
  async out(_from: HTMLElement | null, _to: HTMLElement | null, ctx: WebGpuTransitionContext) {
    const { gpu, fromImage, indexFloat } = ctx
    if (fromImage === null || !indexFloat) return
    const targets = indexFloat.getTargets()
    const target = targets[webGpuMainIdx(fromImage)]
    if (!target) return
    const tweens = []
    tweens.push(webGpuTweenBounds(gpu.planes[webGpuMainIdx(fromImage)]!, target))
    for (let j = 0; j < WEBGPU_GALLERY_SATELLITES_PER_IMAGE; j += 1) {
      const sat = gpu.planes[webGpuSatIdx(fromImage, j)]!
      tweens.push(
        webGpuTweenOpacity(sat, 0, {
          duration: WEBGPU_DUR_FADE * 0.7,
          ease: WEBGPU_EASE_FADE_OUT,
          delay: (WEBGPU_GALLERY_SATELLITES_PER_IMAGE - 1 - j) * 0.05,
        }),
      )
    }
    await Promise.all(tweens)
  }

  async in(_from: HTMLElement | null, _to: HTMLElement | null, ctx: WebGpuTransitionContext) {
    const { gpu, fromImage, indexFloat } = ctx
    if (fromImage === null || !indexFloat) return
    const targets = indexFloat.getTargets()
    const fades = []
    for (let i = 0; i < WEBGPU_GALLERY_MAIN_COUNT; i += 1) {
      if (i === fromImage) continue
      const main = gpu.planes[webGpuMainIdx(i)]!
      const target = targets[webGpuMainIdx(i)]
      if (!target) continue
      main.bounds = { ...target }
      main.opacity = 0
      fades.push(webGpuTweenOpacity(main, 1, { delay: 0.2 + i * 0.04 }))
    }
    await Promise.all(fades)
  }
}

export function createWebGpuTransitionRegistry(): Record<string, WebGpuPageTransition> {
  return {
    'main->inner': new WebGpuMainToInnerTransition(),
    'inner->main': new WebGpuInnerToMainTransition(),
    'main->index': new WebGpuMainToIndexTransition(),
    'index->main': new WebGpuIndexToMainTransition(),
    'index->inner': new WebGpuIndexToInnerTransition(),
    'inner->index': new WebGpuInnerToIndexTransition(),
  }
}

export function webGpuTransitionKey(from: string, to: string) {
  return `${from}->${to}`
}
