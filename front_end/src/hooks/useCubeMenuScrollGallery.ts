import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CUBE_MENU_SCROLL_GALLERY_SECTIONS,
  cubeMenuScrollGalleryProgress,
} from '../lib/menus/cubeMenuScrollGallery'
import type { CssShape3dMenuCubeRefFaceId } from '../lib/shape3d/cssShape3dMenuCube'

/** ref.image-carousel-12 `buildStops` — rx/ry per scroll scene (top · front · right · back · left · bottom). */
const STOPS: ReadonlyArray<{ rx: number; ry: number }> = [
  { rx: 90, ry: 0 },
  { rx: 0, ry: 0 },
  { rx: 0, ry: -90 },
  { rx: 0, ry: -180 },
  { rx: 0, ry: -270 },
  { rx: -90, ry: -360 },
]

/** ref.image-carousel-12 segment ease. */
const easeIO = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)

/** ref.image-carousel-12 `setCubeTransform` — interpolate between stops. */
function rotationAt(progress: number, n: number): { rx: number; ry: number } {
  if (n < 2 || STOPS.length < 2) return STOPS[0] ?? { rx: 0, ry: 0 }
  const count = Math.min(n, STOPS.length)
  const t = Math.max(0, Math.min(1, progress)) * (count - 1)
  const i = Math.min(Math.floor(t), count - 2)
  const f = easeIO(t - i)
  const a = STOPS[i]
  const b = STOPS[i + 1]
  return { rx: a.rx + (b.rx - a.rx) * f, ry: a.ry + (b.ry - a.ry) * f }
}

export function useCubeMenuScrollGallery() {
  const galleryRef = useRef<HTMLDivElement>(null)
  const cubeRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const tgtRef = useRef(0)
  const smoothRef = useRef(0)
  const [activeIndex, setActiveIndex] = useState(0)

  const sectionCount = CUBE_MENU_SCROLL_GALLERY_SECTIONS.length

  const measure = useCallback(() => {
    const root = galleryRef.current
    if (!root) return
    const total = Math.max(1, root.offsetHeight - window.innerHeight)
    const scrolled = Math.max(0, -root.getBoundingClientRect().top)
    const progress = Math.max(0, Math.min(1, scrolled / total))
    tgtRef.current = progress
    setActiveIndex(Math.round(progress * (sectionCount - 1)))
  }, [sectionCount])

  useEffect(() => {
    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure, { passive: true })

    const root = galleryRef.current
    const ro =
      root && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => measure())
        : null
    if (root && ro) ro.observe(root)

    let frameId = 0
    let lastNow = performance.now()

    const frame = (now: number) => {
      frameId = requestAnimationFrame(frame)
      if (document.hidden) {
        lastNow = now
        return
      }
      const dt = Math.min((now - lastNow) / 1000, 0.05)
      lastNow = now

      // exponential approach — ref.image-carousel-12 scroll smoothing
      smoothRef.current += (tgtRef.current - smoothRef.current) * (1 - Math.exp(-dt * 8))

      const cube = cubeRef.current
      if (cube) {
        const { rx, ry } = rotationAt(smoothRef.current, sectionCount)
        cube.style.setProperty('--cube-rx', `${rx.toFixed(3)}deg`)
        cube.style.setProperty('--cube-ry', `${ry.toFixed(3)}deg`)
      }
    }
    frameId = requestAnimationFrame(frame)

    return () => {
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      ro?.disconnect()
      cancelAnimationFrame(frameId)
    }
  }, [measure, sectionCount])

  const scrollToIndex = useCallback(
    (index: number) => {
      const section = sectionRefs.current[index]
      if (!section) return
      setActiveIndex(index)
      const top = section.getBoundingClientRect().top + window.scrollY
      window.scrollTo({ top, behavior: 'smooth' })
    },
    [],
  )

  const registerSection = useCallback(
    (index: number) => (node: HTMLElement | null) => {
      sectionRefs.current[index] = node
    },
    [],
  )

  const activeFace =
    CUBE_MENU_SCROLL_GALLERY_SECTIONS[activeIndex]?.id ?? 'home'

  return {
    galleryRef,
    cubeRef,
    registerSection,
    activeIndex,
    activeFace,
    sectionCount,
    scrollToIndex,
    scrollToFace: (faceId: CssShape3dMenuCubeRefFaceId) => {
      const idx = CUBE_MENU_SCROLL_GALLERY_SECTIONS.findIndex((s) => s.id === faceId)
      if (idx >= 0) scrollToIndex(idx)
    },
    progressForIndex: (index: number) =>
      cubeMenuScrollGalleryProgress(index, sectionCount),
  }
}
