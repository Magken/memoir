import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import {
  Mesh,
  MeshLambertMaterial,
  MeshPhysicalMaterial,
  Object3D,
  PlaneGeometry,
  SpotLight,
  Vector2,
  Vector3,
  type PerspectiveCamera,
} from 'three'
import { FontLoader, TextGeometry, type Font } from 'three-stdlib'
import gsap from '../lib/gsap'
import {
  ISOMETRIC_WORD_CLOUD_SCENE,
  isometricWordCloudCameraPose,
  isometricWordCloudCells,
  isometricWordCloudDistance,
  isometricWordCloudDuration,
  isometricWordCloudEntriesForFraming,
  isometricWordCloudEntryMatchesFocus,
  isometricWordCloudLiftZ,
  isometricWordCloudLoadingLabel,
  isometricWordCloudPackPaddingForFraming,
  isometricWordCloudResolvedCamera,
  isometricWordCloudRestZ,
  isometricWordCloudSize,
  parkWordCloudBehindFog,
  wordCloudEntranceSteps,
  type IsometricWordCloudAudience,
  type IsometricWordCloudCameraView,
  type IsometricWordCloudFocus,
  type IsometricWordCloudFraming,
  type IsometricWordCloudMode,
} from '../lib/isometrics/isometricWordCloud'
import { WordCloudEdgeShade } from '../lib/isometrics/wordCloudEdgeShade'

/** True when the topmost hit-test target is the word-cloud host (or its canvas). */
function isPointerOverWordCloud(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const hit = document.elementFromPoint(clientX, clientY)
  if (!hit) return false
  const host = canvas.closest('.theme-isometric-word-cloud')
  if (!host) return hit === canvas || canvas.contains(hit)
  return hit === host || host.contains(hit)
}

/** True when the floor pointer is close enough to lift this word off rest. */
function isPointerOnWord(pointX: number, pointY: number, coverX: number, coverY: number) {
  const { pointerInfluenceRadius, pointerInfluenceFade } = ISOMETRIC_WORD_CLOUD_SCENE.depth
  return (
    isometricWordCloudDistance(pointX, pointY, coverX, coverY) <
    pointerInfluenceRadius + pointerInfluenceFade
  )
}

type IsometricWordCloudSceneProps = {
  typefaceUrl: string
  wordColor: string
  emissiveColor: string
  accentEmissiveColor: string
  coolLightColor: string
  warmLightColor: string
  fogColor: string
  mouseFollow: boolean
  reducedMotion?: boolean
  cameraView?: IsometricWordCloudCameraView
  framing?: IsometricWordCloudFraming
  waveEnabled?: boolean
  waveTriggerKey?: number
  focus?: IsometricWordCloudFocus
  /** 0–1 radial edge shade/blur strength; omit to use scene default. */
  edgeShade?: number
  mode?: IsometricWordCloudMode
  loadingKey?: number
  /** External 0–100 feed — when set, drives the counter instead of the auto tween. */
  progress?: number
  onLoadingComplete?: () => void
  /** False parks glyphs behind fog; rising true in cloud mode plays the land stagger. */
  active?: boolean
  onEntranceStart?: () => void
}

type BuiltWord = {
  id: string
  word: string
  size: number
  geometry: TextGeometry
  localX: number
  localY: number
  coverX: number
  coverY: number
  rotateDeg: number
  audience: IsometricWordCloudAudience
  isHero: boolean
}

/** Exclusive interaction owner for the cloud. */
type ScenePhase = 'idle' | 'loading'

/** TextGeometry at layout size, centered on origin for spiral rotation. */
function buildWordGeometry(font: Font, word: string, size: number): TextGeometry {
  const {
    extrudeDepth,
    curveSegments,
    bevelThickness,
    bevelSize,
    bevelOffset,
    bevelFullSize,
  } = ISOMETRIC_WORD_CLOUD_SCENE
  // Fixed bevel on tiny glyphs self-intersects and blows out the fill.
  const bevelScale = Math.min(1, size / bevelFullSize)

  const geometry = new TextGeometry(word, {
    font,
    size,
    height: extrudeDepth,
    curveSegments,
    bevelEnabled: true,
    bevelThickness: bevelThickness * bevelScale,
    bevelSize: bevelSize * bevelScale,
    bevelOffset: bevelOffset * bevelScale,
  })

  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (box) {
    const cx = (box.min.x + box.max.x) / 2
    const cy = (box.min.y + box.max.y) / 2
    geometry.translate(-cx, -cy, 0)
  }

  return geometry
}

function killMeshTweens(meshes: Array<Mesh | null>) {
  meshes.forEach((mesh) => {
    if (mesh) gsap.killTweensOf(mesh.position)
  })
}

function restoreIdleCloud(
  built: BuiltWord[],
  meshes: Array<Mesh | null>,
  options?: { animate?: boolean },
) {
  built.forEach((word, index) => {
    const mesh = meshes[index]
    if (!mesh) return
    mesh.visible = true
    if (word.isHero) {
      const current = mesh.geometry as TextGeometry
      if (current !== word.geometry) {
        current.dispose()
        mesh.geometry = word.geometry
      }
    }
    mesh.position.x = word.localX
    mesh.position.y = word.localY
    const restZ = isometricWordCloudRestZ(word.coverX, word.coverY)
    if (options?.animate) {
      gsap.to(mesh.position, {
        z: restZ,
        duration: ISOMETRIC_WORD_CLOUD_SCENE.depth.returnDuration,
        overwrite: 'auto',
        ease: 'power2.out',
      })
    } else {
      mesh.position.z = restZ
    }
  })
}

export function IsometricWordCloudScene({
  typefaceUrl,
  wordColor,
  emissiveColor,
  accentEmissiveColor,
  coolLightColor,
  warmLightColor,
  fogColor,
  mouseFollow,
  reducedMotion = false,
  cameraView = 'front',
  framing = 'default',
  waveEnabled = false,
  waveTriggerKey = 0,
  focus = 'all',
  edgeShade,
  mode = 'cloud',
  loadingKey = 0,
  progress,
  onLoadingComplete,
  active = true,
  onEntranceStart,
}: IsometricWordCloudSceneProps) {
  const font = useLoader(FontLoader, typefaceUrl) as unknown as Font
  const { camera, gl, raycaster, pointer, size, scene } = useThree()
  const meshRefs = useRef<(Mesh | null)[]>([])
  const floorRef = useRef<Mesh>(null)
  const blueLightRef = useRef<SpotLight>(null)
  const rotatingLightRef = useRef<SpotLight>(null)
  const mouseFollowRef = useRef(mouseFollow)
  const focusRef = useRef(focus)
  const introDoneRef = useRef(false)
  /** True only while the pointer is close enough to lift a glyph — not the whole header canvas. */
  const hoveredRef = useRef(false)
  const waveActiveRef = useRef(false)
  /** Wave registers interrupt/resume so glyph hover can stop it without treating the stage as hovered. */
  const interruptWaveRef = useRef<(() => void) | null>(null)
  const resumeWaveRef = useRef<(() => void) | null>(null)
  const phaseRef = useRef<ScenePhase>(mode === 'loading' ? 'loading' : 'idle')
  const lastLoadingLabelRef = useRef('')
  const revealStartedRef = useRef(false)
  const interactionUnlockedRef = useRef(false)
  const lastPointerClientRef = useRef({ x: 0, y: 0, has: false })
  const cameraInitializedRef = useRef(false)
  const depthInitializedRef = useRef(false)
  const onLoadingCompleteRef = useRef(onLoadingComplete)
  const onEntranceStartRef = useRef(onEntranceStart)
  const activeRef = useRef(active)
  const wasActiveRef = useRef(active)
  const entranceLockRef = useRef(!active)
  const beginRevealRef = useRef<(() => void) | null>(null)
  const progressRef = useRef(typeof progress === 'number' ? progress : 0)
  const shadeCenterRef = useRef(new Vector2(0.5, 0.5))
  const shadeProjectRef = useRef(new Vector3())
  const [phase, setPhase] = useState<ScenePhase>(mode === 'loading' ? 'loading' : 'idle')
  /** Hide cloud until loading pose is applied — avoids idle-word flash before `%`. */
  const [loadingPoseReady, setLoadingPoseReady] = useState(mode !== 'loading')
  /** True only while the `%` counter is up — false once the exit→V reveal starts. */
  const [loadingCountActive, setLoadingCountActive] = useState(mode === 'loading')

  const edgeShadeIntensity =
    edgeShade ?? ISOMETRIC_WORD_CLOUD_SCENE.edgeShade.intensity
  const edgeShadeActive = edgeShadeIntensity > 0.001

  mouseFollowRef.current = mouseFollow
  focusRef.current = focus
  onLoadingCompleteRef.current = onLoadingComplete
  onEntranceStartRef.current = onEntranceStart
  activeRef.current = active
  progressRef.current = typeof progress === 'number' ? progress : progressRef.current
  phaseRef.current = phase

  const lightTarget = useMemo(() => {
    const target = new Object3D()
    const [x, y, z] = ISOMETRIC_WORD_CLOUD_SCENE.lights.target
    target.position.set(x, y, z)
    return target
  }, [])

  useEffect(() => {
    scene.add(lightTarget)
    return () => {
      scene.remove(lightTarget)
    }
  }, [scene, lightTarget])

  const lexiconKey = framing === 'default' ? 'full' : 'mobile'
  const layout = useMemo(() => {
    const lexiconFraming = lexiconKey === 'full' ? 'default' : 'mobileLanding'
    const entries = isometricWordCloudEntriesForFraming(lexiconFraming)
    const measured = new Map<string, { width: number; height: number }>()
    entries.forEach((entry) => {
      const geometry = buildWordGeometry(font, entry.word, isometricWordCloudSize(entry.weight))
      geometry.computeBoundingBox()
      const box = geometry.boundingBox
      if (box) {
        measured.set(entry.word, {
          width: box.max.x - box.min.x,
          height: box.max.y - box.min.y,
        })
      }
      geometry.dispose()
    })
    return isometricWordCloudCells(
      entries,
      measured,
      isometricWordCloudPackPaddingForFraming(lexiconFraming),
    )
  }, [font, lexiconKey])

  const built = useMemo<BuiltWord[]>(
    () =>
      layout.cells.map((cell) => ({
        id: cell.id,
        word: cell.word,
        size: cell.size,
        geometry: buildWordGeometry(font, cell.word, cell.size),
        localX: cell.localX,
        localY: cell.localY,
        coverX: cell.coverX,
        coverY: cell.coverY,
        rotateDeg: cell.rotateDeg,
        audience: cell.audience,
        isHero: cell.word === 'V',
      })),
    [font, layout.cells],
  )

  // Track pointer globally and keep hover in sync — pointerenter misses when the cursor
  // is already over the stage at unlock (loading / scroll-lock / mouseFollow flip).
  useEffect(() => {
    const canvas = gl.domElement

    const restoreDepth = () => {
      if (
        phaseRef.current !== 'idle' ||
        waveActiveRef.current ||
        entranceLockRef.current ||
        !activeRef.current
      ) {
        return
      }
      meshRefs.current.forEach((mesh, index) => {
        const word = built[index]
        if (!mesh || !word) return
        if (!isometricWordCloudEntryMatchesFocus(word.audience, focusRef.current)) return
        gsap.to(mesh.position, {
          z: isometricWordCloudRestZ(word.coverX, word.coverY),
          duration: ISOMETRIC_WORD_CLOUD_SCENE.wave.settleDuration,
          overwrite: 'auto',
          ease: 'power2.out',
        })
      })
    }

    const syncHoverFromClient = (clientX: number, clientY: number) => {
      lastPointerClientRef.current = { x: clientX, y: clientY, has: true }
      if (!mouseFollowRef.current || phaseRef.current !== 'idle' || entranceLockRef.current) {
        return
      }

      // Header / empty canvas must not count as a word hover — useFrame decides
      // when the pointer is on a glyph. Leaving the host still clears lift.
      if (isPointerOverWordCloud(canvas, clientX, clientY)) return
      if (!hoveredRef.current) return
      hoveredRef.current = false
      restoreDepth()
      resumeWaveRef.current?.()
    }

    const onMove = (event: PointerEvent) => {
      syncHoverFromClient(event.clientX, event.clientY)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    const last = lastPointerClientRef.current
    if (last.has) syncHoverFromClient(last.x, last.y)

    return () => window.removeEventListener('pointermove', onMove)
  }, [built, gl])

  const heroIndex = useMemo(() => built.findIndex((word) => word.isHero), [built])

  useEffect(() => {
    const blue = blueLightRef.current
    const rotating = rotatingLightRef.current
    if (blue) blue.target = lightTarget
    if (rotating) rotating.target = lightTarget
  }, [lightTarget, built])

  const material = useMemo(() => {
    const { metalness, roughness, emissiveIntensity } = ISOMETRIC_WORD_CLOUD_SCENE.material
    return new MeshPhysicalMaterial({
      color: wordColor,
      metalness,
      emissive: emissiveColor,
      emissiveIntensity,
      roughness,
      fog: true,
    })
  }, [wordColor, emissiveColor])

  const accentMaterial = useMemo(() => {
    const { metalness, roughness, emissiveIntensity } = ISOMETRIC_WORD_CLOUD_SCENE.material
    return new MeshPhysicalMaterial({
      color: wordColor,
      metalness,
      emissive: accentEmissiveColor,
      emissiveIntensity,
      roughness,
      fog: true,
    })
  }, [wordColor, accentEmissiveColor])

  useEffect(() => {
    material.color.set(wordColor)
    material.emissive.set(emissiveColor)
    accentMaterial.color.set(wordColor)
    accentMaterial.emissive.set(accentEmissiveColor)
  }, [material, accentMaterial, wordColor, emissiveColor, accentEmissiveColor])

  const floorGeometry = useMemo(
    () => new PlaneGeometry(ISOMETRIC_WORD_CLOUD_SCENE.floorSize, ISOMETRIC_WORD_CLOUD_SCENE.floorSize),
    [],
  )

  const floorMaterial = useMemo(
    () =>
      new MeshLambertMaterial({
        opacity: 0,
        transparent: true,
      }),
    [],
  )

  useEffect(() => {
    const perspective = camera as PerspectiveCamera
    if (size.width <= 0 || size.height <= 0) return
    perspective.aspect = size.width / size.height
    perspective.updateProjectionMatrix()
  }, [camera, size.width, size.height])

  useEffect(() => {
    const perspective = camera as PerspectiveCamera
    const resolved = isometricWordCloudResolvedCamera(framing)
    const { zoom, lookAt } = resolved
    const pose = isometricWordCloudCameraPose(cameraView, framing)
    const targetPosition = pose.position
    const targetFov = pose.fov
    const duration = pose.duration
    const [lx, ly, lz] = lookAt

    const aim = () => {
      perspective.lookAt(lx, ly, lz)
    }

    const applyFov = () => {
      perspective.updateProjectionMatrix()
      aim()
    }

    gsap.killTweensOf(perspective.position)
    gsap.killTweensOf(perspective)
    introDoneRef.current = false

    if (reducedMotion || !cameraInitializedRef.current) {
      perspective.position.set(targetPosition[0], targetPosition[1], targetPosition[2])
      perspective.fov = targetFov
      perspective.zoom = zoom
      applyFov()
      introDoneRef.current = true
      cameraInitializedRef.current = true
      return
    }

    // Position + FOV share one duration so framing never teleports (FOV jumps read as size changes).
    const positionTween = gsap.to(perspective.position, {
      duration,
      x: targetPosition[0],
      y: targetPosition[1],
      z: targetPosition[2],
      ease: 'power2.inOut',
      onUpdate: aim,
      onComplete: () => {
        introDoneRef.current = true
      },
    })
    const projectionTween = gsap.to(perspective, {
      duration,
      fov: targetFov,
      zoom,
      ease: 'power2.inOut',
      onUpdate: applyFov,
    })

    return () => {
      positionTween.kill()
      projectionTween.kill()
    }
  }, [camera, reducedMotion, cameraView, framing])

  // Park while Home is not live; replay fog stagger when cloud mode becomes active.
  useEffect(() => {
    const becameActive = active && !wasActiveRef.current
    wasActiveRef.current = active

    if (!active) {
      entranceLockRef.current = true
      killMeshTweens(meshRefs.current)
      parkWordCloudBehindFog(built, meshRefs.current)
      return
    }

    if (mode === 'loading') {
      entranceLockRef.current = false
      return
    }

    if (!becameActive) return

    entranceLockRef.current = true
    killMeshTweens(meshRefs.current)
    parkWordCloudBehindFog(built, meshRefs.current)

    let cancelled = false
    let revealTimeline: ReturnType<typeof gsap.timeline> | null = null
    let outer = 0
    let inner = 0

    const finish = () => {
      if (cancelled) return
      entranceLockRef.current = false
      resumeWaveRef.current?.()
    }

    const startReveal = () => {
      if (cancelled) return
      onEntranceStartRef.current?.()
      if (reducedMotion) {
        restoreIdleCloud(built, meshRefs.current)
        finish()
        return
      }
      const { revealDuration } = ISOMETRIC_WORD_CLOUD_SCENE.loading
      const steps = wordCloudEntranceSteps(built)
      revealTimeline = gsap.timeline({ onComplete: finish })
      steps.forEach((step) => {
        const mesh = meshRefs.current[step.index]
        if (!mesh) return
        revealTimeline!.add(() => {
          mesh.visible = true
          mesh.position.z = step.fromZ
        }, step.at)
        revealTimeline!.to(
          mesh.position,
          {
            z: step.toZ,
            duration: revealDuration,
            ease: 'power2.out',
          },
          step.at,
        )
      })
    }

    outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(startReveal)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
      revealTimeline?.kill()
    }
  }, [active, built, mode, reducedMotion])

  // Baseline idle depth after mesh build — never fights an active loading session.
  useEffect(() => {
    if (!active || entranceLockRef.current) return
    if (mode === 'loading' || phaseRef.current === 'loading') return
    meshRefs.current.forEach((mesh, index) => {
      const word = built[index]
      if (!mesh || !word) return
      mesh.visible = true
      const restZ = isometricWordCloudRestZ(word.coverX, word.coverY)
      if (!depthInitializedRef.current || reducedMotion) {
        mesh.position.z = restZ
        return
      }
      gsap.to(mesh.position, {
        z: restZ,
        duration: ISOMETRIC_WORD_CLOUD_SCENE.camera.introDuration,
        overwrite: 'auto',
        ease: 'power2.inOut',
      })
    })
    depthInitializedRef.current = true
  }, [active, built, mode, reducedMotion])

  // ── Audience focus (idle only) ───────────────────────────────────────────
  useEffect(() => {
    // Gate on `mode` too — unlock sets phase idle while mode is still loading,
    // and a focus pass would flash the full cloud over the reveal.
    if (!active || entranceLockRef.current) return
    if (mode === 'loading' || phaseRef.current === 'loading') return

    const { hiddenZ, duration, stagger } = ISOMETRIC_WORD_CLOUD_SCENE.focus
    const ordered = built
      .map((word, index) => ({ word, mesh: meshRefs.current[index] }))
      .filter((item): item is { word: BuiltWord; mesh: Mesh } => item.mesh !== null)
      .sort((a, b) => a.word.coverX - b.word.coverX)
    const tweens: ReturnType<typeof gsap.to>[] = []

    // Pause depth while lanes move; CTA leave can race ahead of this effect and
    // set hover true, then this wipe would stick it false with no second pointerenter.
    hoveredRef.current = false
    waveActiveRef.current = false

    ordered.forEach(({ word, mesh }, index) => {
      const visible = isometricWordCloudEntryMatchesFocus(word.audience, focus)
      const restZ = isometricWordCloudRestZ(word.coverX, word.coverY)
      gsap.killTweensOf(mesh.position)

      if (reducedMotion) {
        mesh.visible = visible
        mesh.position.z = visible ? restZ : hiddenZ
        return
      }

      if (visible) mesh.visible = true
      tweens.push(
        gsap.to(mesh.position, {
          z: visible ? restZ : hiddenZ,
          duration,
          delay: index * stagger,
          overwrite: 'auto',
          ease: visible ? 'power2.out' : 'power2.in',
          onComplete: () => {
            if (
              !visible &&
              !isometricWordCloudEntryMatchesFocus(word.audience, focusRef.current)
            ) {
              mesh.visible = false
            }
          },
        }),
      )
    })

    return () => {
      tweens.forEach((tween) => tween.kill())
    }
  }, [active, built, focus, mode, phase, reducedMotion])

  // ── Loading session (exclusive owner while phase === 'loading') ──────────
  useEffect(() => {
    if (mode !== 'loading') {
      beginRevealRef.current = null
      // Already unlocked mid-reveal — leave satellite tweens alone.
      if (phaseRef.current === 'loading') {
        phaseRef.current = 'idle'
        setPhase('idle')
        restoreIdleCloud(built, meshRefs.current)
      }
      revealStartedRef.current = false
      interactionUnlockedRef.current = false
      lastLoadingLabelRef.current = ''
      setLoadingPoseReady(true)
      setLoadingCountActive(false)
      return
    }

    setLoadingPoseReady(false)
    setLoadingCountActive(true)

    let cancelled = false
    let countTween: ReturnType<typeof gsap.to> | null = null
    let holdCall: ReturnType<typeof gsap.delayedCall> | null = null
    let revealTimeline: ReturnType<typeof gsap.timeline> | null = null
    let raf = 0
    let poll = 0
    let finishing = false
    const external = typeof progress === 'number'
    const { countDuration, holdAtHundred } = ISOMETRIC_WORD_CLOUD_SCENE.loading
    /** Match CurtainLoading — don't flash past 94% until real progress hits 100. */
    const HOLD_CAP = 94

    // Sync ref immediately so useFrame / wave cannot race the setState paint.
    phaseRef.current = 'loading'
    setPhase('loading')
    hoveredRef.current = false
    waveActiveRef.current = false
    revealStartedRef.current = false
    interactionUnlockedRef.current = false
    lastLoadingLabelRef.current = ''
    killMeshTweens(meshRefs.current)

    /** Unlock pointer as soon as V has arrived — don't wait for satellite stagger. */
    const unlockInteraction = () => {
      if (cancelled || interactionUnlockedRef.current) return
      interactionUnlockedRef.current = true
      beginRevealRef.current = null
      phaseRef.current = 'idle'
      setPhase('idle')
      onLoadingCompleteRef.current?.()
    }

    const swapHeroText = (heroMesh: Mesh, heroWord: BuiltWord, text: string) => {
      if (text === lastLoadingLabelRef.current) return
      lastLoadingLabelRef.current = text
      const previous = heroMesh.geometry as TextGeometry
      const next =
        text === heroWord.word ? heroWord.geometry : buildWordGeometry(font, text, heroWord.size)
      heroMesh.geometry = next
      heroMesh.material = text === heroWord.word ? accentMaterial : material
      if (previous !== heroWord.geometry && previous !== next) previous.dispose()
    }

    const runReveal = (heroMesh: Mesh, heroWord: BuiltWord) => {
      if (cancelled || revealStartedRef.current) return
      revealStartedRef.current = true
      beginRevealRef.current = null

      if (reducedMotion) {
        setLoadingCountActive(false)
        restoreIdleCloud(built, meshRefs.current)
        setLoadingPoseReady(true)
        unlockInteraction()
        return
      }

      const { exitDuration, revealDuration, revealStagger, farZ, enterZ, exitZ } =
        ISOMETRIC_WORD_CLOUD_SCENE.loading

      revealTimeline = gsap.timeline()

      // Counter flies out while still screen-centered — do not unpin XY until V swap,
      // or React snaps `%` to the cloud V slot (reads as a camera jerk).
      revealTimeline.to(heroMesh.position, {
        z: exitZ,
        duration: exitDuration,
        ease: 'power2.in',
      })

      revealTimeline.add(() => {
        setLoadingCountActive(false)
        swapHeroText(heroMesh, heroWord, heroWord.word)
        heroMesh.position.x = heroWord.localX
        heroMesh.position.y = heroWord.localY
        heroMesh.position.z = enterZ
      })

      const heroRestZ = isometricWordCloudRestZ(heroWord.coverX, heroWord.coverY)
      revealTimeline.to(heroMesh.position, {
        z: heroRestZ,
        duration: revealDuration,
        ease: 'power2.out',
        onComplete: unlockInteraction,
      })

      const satellites = built
        .map((word, index) => ({ word, mesh: meshRefs.current[index] }))
        .filter((item) => !item.word.isHero && item.mesh)
        .sort((a, b) => a.word.coverX - b.word.coverX)

      const revealAt = exitDuration
      satellites.forEach(({ word, mesh }, index) => {
        if (!mesh) return
        const at = revealAt + index * revealStagger
        revealTimeline!.add(() => {
          mesh.visible = true
        }, at)
        revealTimeline!.fromTo(
          mesh.position,
          { z: farZ },
          {
            z: isometricWordCloudRestZ(word.coverX, word.coverY),
            duration: revealDuration,
            ease: 'power2.out',
          },
          at,
        )
      })
    }

    const prepareLoadingPose = (heroMesh: Mesh, heroWord: BuiltWord, label: string) => {
      const { farZ } = ISOMETRIC_WORD_CLOUD_SCENE.loading
      const [lookAtX, lookAtY] = isometricWordCloudResolvedCamera(framing).lookAt
      const [groupX, groupY] = ISOMETRIC_WORD_CLOUD_SCENE.group
      built.forEach((word, index) => {
        const mesh = meshRefs.current[index]
        if (!mesh) return
        gsap.killTweensOf(mesh.position)
        if (word.isHero) {
          mesh.visible = true
          // Center loading text on the camera target, not the right-shifted cloud group.
          mesh.position.x = lookAtX - groupX
          mesh.position.y = lookAtY - groupY
          mesh.position.z = isometricWordCloudRestZ(word.coverX, word.coverY)
        } else {
          mesh.visible = false
          mesh.position.z = farZ
        }
      })
      swapHeroText(heroMesh, heroWord, label)
      // Reveal only after satellites are parked — prevents idle-cloud first paint.
      setLoadingPoseReady(true)
    }

    const run = () => {
      const heroWord = built[heroIndex]
      const heroMesh = meshRefs.current[heroIndex]
      if (!heroWord || !heroMesh || heroIndex < 0) {
        raf = requestAnimationFrame(run)
        return
      }
      if (cancelled) return

      beginRevealRef.current = () => {
        if (cancelled || revealStartedRef.current) return
        holdCall?.kill()
        holdCall = gsap.delayedCall(holdAtHundred, () => {
          runReveal(heroMesh, heroWord)
        })
      }

      if (reducedMotion) {
        restoreIdleCloud(built, meshRefs.current)
        setLoadingPoseReady(true)
        unlockInteraction()
        return
      }

      // External feed (App Stage): chase like CurtainLoading — min count duration so
      // fast chunk loads cannot skip the readable 0→100 beat.
      if (external) {
        const startedAt = performance.now()
        const proxy = { value: 0 }

        const chase = (target: number, duration: number, onDone?: () => void) => {
          countTween?.kill()
          const from = proxy.value
          const to = Math.max(from, Math.min(100, target))
          if (to <= from + 0.01) {
            swapHeroText(heroMesh, heroWord, isometricWordCloudLoadingLabel(to))
            onDone?.()
            return
          }
          countTween = gsap.to(proxy, {
            value: to,
            duration: Math.max(0.2, duration),
            ease: 'none',
            onUpdate: () => {
              if (cancelled || revealStartedRef.current) return
              swapHeroText(
                heroMesh,
                heroWord,
                isometricWordCloudLoadingLabel(Math.round(proxy.value)),
              )
            },
            onComplete: () => {
              if (cancelled || revealStartedRef.current) return
              swapHeroText(
                heroMesh,
                heroWord,
                isometricWordCloudLoadingLabel(Math.round(proxy.value)),
              )
              onDone?.()
            },
          })
        }

        const syncToProgress = () => {
          if (cancelled || revealStartedRef.current) return
          const real = progressRef.current
          const elapsed = (performance.now() - startedAt) / 1000
          const remainMin = Math.max(0, countDuration - elapsed)

          if (real >= 100) {
            if (finishing) return
            finishing = true
            chase(100, Math.max(0.45, remainMin), () => beginRevealRef.current?.())
            return
          }

          const capped = Math.min(real, HOLD_CAP)
          if (capped <= proxy.value) {
            const crawlTarget = Math.min(
              HOLD_CAP,
              Math.max(proxy.value + 1, elapsed * (HOLD_CAP / countDuration)),
            )
            if (crawlTarget > proxy.value + 0.5) chase(crawlTarget, 0.35)
            return
          }

          const step = capped - proxy.value
          chase(capped, Math.max(0.35, Math.min(1.1, step / 45)))
        }

        prepareLoadingPose(heroMesh, heroWord, isometricWordCloudLoadingLabel(0))
        chase(HOLD_CAP, countDuration)
        syncToProgress()
        poll = window.setInterval(syncToProgress, 120)
        return
      }

      prepareLoadingPose(heroMesh, heroWord, isometricWordCloudLoadingLabel(1))

      const proxy = { value: 1 }
      let lastShown = 1
      countTween = gsap.to(proxy, {
        value: 100,
        duration: countDuration,
        ease: 'none',
        onUpdate: () => {
          if (cancelled || revealStartedRef.current) return
          const next = Math.max(1, Math.round(proxy.value))
          if (next === lastShown) return
          lastShown = next
          swapHeroText(heroMesh, heroWord, isometricWordCloudLoadingLabel(next))
        },
        onComplete: () => {
          if (cancelled) return
          beginRevealRef.current?.()
        },
      })
    }

    run()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      if (poll) window.clearInterval(poll)
      countTween?.kill()
      holdCall?.kill()
      // Early unlock flips mode→cloud while satellites may still be rising — keep that timeline.
      if (!interactionUnlockedRef.current) {
        revealTimeline?.kill()
      }
      beginRevealRef.current = null
    }
    // progress value is synced by progressRef; only its presence gates auto vs external.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [
    accentMaterial,
    built,
    font,
    framing,
    heroIndex,
    loadingKey,
    material,
    mode,
    reducedMotion,
    progress === undefined,
  ])

  // ── Pointer follow gate (idle only) ──────────────────────────────────────
  useEffect(() => {
    if (!mouseFollow) {
      hoveredRef.current = false
      if (
        phaseRef.current !== 'idle' ||
        waveActiveRef.current ||
        entranceLockRef.current ||
        !activeRef.current
      ) {
        return
      }
      meshRefs.current.forEach((mesh, index) => {
        const word = built[index]
        if (!mesh || !word) return
        if (!isometricWordCloudEntryMatchesFocus(word.audience, focusRef.current)) return
        gsap.to(mesh.position, {
          z: isometricWordCloudRestZ(word.coverX, word.coverY),
          duration: ISOMETRIC_WORD_CLOUD_SCENE.depth.returnDuration,
          overwrite: 'auto',
          ease: 'power2.out',
        })
      })
      return
    }

    // Hover is glyph-proximity only — useFrame decides. Do not treat the stage as hovered.
    hoveredRef.current = false
  }, [built, mouseFollow])

  // ── Wave (idle only; never runs during loading) ──────────────────────────
  useEffect(() => {
    if (!waveEnabled || reducedMotion || phase !== 'idle' || !active) {
      waveActiveRef.current = false
      return
    }

    const { frontZ, strength, riseDuration, returnDuration, stagger, repeatDelay } =
      ISOMETRIC_WORD_CLOUD_SCENE.wave
    const ordered = built
      .map((word, index) => ({ word, mesh: meshRefs.current[index] }))
      .filter(
        (item): item is { word: BuiltWord; mesh: Mesh } =>
          item.mesh !== null && isometricWordCloudEntryMatchesFocus(item.word.audience, focus),
      )
      .sort((a, b) => a.word.coverX - b.word.coverX)

    let timelines: ReturnType<typeof gsap.timeline>[] = []
    let delayedRestart: ReturnType<typeof gsap.delayedCall> | null = null

    const createWave = () => {
      if (phaseRef.current !== 'idle' || hoveredRef.current || entranceLockRef.current) return
      ordered.forEach(({ mesh }) => gsap.killTweensOf(mesh.position))
      waveActiveRef.current = true
      timelines = ordered.map(({ word, mesh }, index) => {
        const restZ = isometricWordCloudRestZ(word.coverX, word.coverY)
        const crestZ = restZ + (frontZ - restZ) * strength
        return gsap
          .timeline({ repeat: -1, repeatDelay, delay: index * stagger })
          .to(mesh.position, { z: crestZ, duration: riseDuration, ease: 'sine.inOut' })
          .to(mesh.position, { z: restZ, duration: returnDuration, ease: 'sine.inOut' })
      })
    }

    const interruptWave = () => {
      delayedRestart?.kill()
      delayedRestart = null
      timelines.forEach((timeline) => timeline.kill())
      timelines = []
      waveActiveRef.current = false
    }

    const resumeWave = () => {
      if (phaseRef.current !== 'idle' || hoveredRef.current || entranceLockRef.current) return
      interruptWave()
      delayedRestart = gsap.delayedCall(
        ISOMETRIC_WORD_CLOUD_SCENE.wave.resumeDelay,
        createWave,
      )
    }

    interruptWaveRef.current = interruptWave
    resumeWaveRef.current = resumeWave
    if (hoveredRef.current) interruptWave()
    else createWave()

    return () => {
      interruptWaveRef.current = null
      resumeWaveRef.current = null
      interruptWave()
      // Leaving idle (e.g. loading starts) — do not animate depths back; loading owns them.
      if (
        phaseRef.current === 'idle' &&
        !entranceLockRef.current &&
        activeRef.current
      ) {
        ordered.forEach(({ word, mesh }) => {
          if (!isometricWordCloudEntryMatchesFocus(word.audience, focusRef.current)) return
          gsap.to(mesh.position, {
            z: isometricWordCloudRestZ(word.coverX, word.coverY),
            duration: ISOMETRIC_WORD_CLOUD_SCENE.depth.returnDuration,
            overwrite: 'auto',
            ease: 'power2.out',
          })
        })
      }
    }
  }, [active, built, focus, phase, reducedMotion, waveEnabled, waveTriggerKey])

  useEffect(() => {
    return () => {
      killMeshTweens(meshRefs.current)
      ;[blueLightRef.current, rotatingLightRef.current].forEach((light) => {
        if (light) gsap.killTweensOf(light.position)
      })
      gsap.killTweensOf(camera.position)
      built.forEach((word) => word.geometry.dispose())
      material.dispose()
      accentMaterial.dispose()
      floorMaterial.dispose()
      floorGeometry.dispose()
    }
  }, [built, material, accentMaterial, floorMaterial, floorGeometry, camera])

  useFrame(() => {
    if (edgeShadeActive) {
      const [groupX, groupY] = ISOMETRIC_WORD_CLOUD_SCENE.group
      const projected = shadeProjectRef.current
      projected.set(groupX, groupY, 0)
      projected.project(camera)
      shadeCenterRef.current.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5)
    }

    const blueLight = blueLightRef.current
    const rotatingLight = rotatingLightRef.current
    const floor = floorRef.current
    const { lightTweenDuration, lights } = ISOMETRIC_WORD_CLOUD_SCENE

    if (rotatingLight) {
      rotatingLight.position.x = lights.white.x
      gsap.to(rotatingLight.position, {
        duration: lightTweenDuration,
        y: pointer.y * lights.white.yMul,
        overwrite: 'auto',
        ease: 'power1.out',
      })
    }
    if (blueLight) {
      blueLight.position.x = lights.blue.x
      gsap.to(blueLight.position, {
        duration: lightTweenDuration,
        y: pointer.y * lights.blue.yMul,
        overwrite: 'auto',
        ease: 'power1.out',
      })
    }

    if (
      phaseRef.current !== 'idle' ||
      !mouseFollowRef.current ||
      !introDoneRef.current ||
      !floor ||
      entranceLockRef.current ||
      !activeRef.current
    ) {
      return
    }

    const lastPointer = lastPointerClientRef.current
    const overStage =
      lastPointer.has && isPointerOverWordCloud(gl.domElement, lastPointer.x, lastPointer.y)

    const restoreWordsToRest = () => {
      meshRefs.current.forEach((mesh, index) => {
        const word = built[index]
        if (!mesh || !word) return
        if (!isometricWordCloudEntryMatchesFocus(word.audience, focusRef.current)) return
        gsap.to(mesh.position, {
          z: isometricWordCloudRestZ(word.coverX, word.coverY),
          duration: ISOMETRIC_WORD_CLOUD_SCENE.wave.settleDuration,
          overwrite: 'auto',
          ease: 'power2.out',
        })
      })
    }

    const leaveWord = () => {
      if (!hoveredRef.current) return
      hoveredRef.current = false
      restoreWordsToRest()
      resumeWaveRef.current?.()
    }

    if (!overStage) {
      leaveWord()
      return
    }

    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObject(floor)
    if (!hits.length) {
      leaveWord()
      return
    }

    const { x, y } = hits[0]!.point
    let onWord = false
    for (let index = 0; index < built.length; index += 1) {
      const cell = built[index]
      if (!cell) continue
      if (!isometricWordCloudEntryMatchesFocus(cell.audience, focusRef.current)) continue
      if (isPointerOnWord(x, y, cell.coverX, cell.coverY)) {
        onWord = true
        break
      }
    }

    if (!onWord) {
      leaveWord()
      return
    }

    if (!hoveredRef.current || waveActiveRef.current) {
      interruptWaveRef.current?.()
      hoveredRef.current = true
    }

    const {
      pointerInfluenceRadius,
      pointerInfluenceFade,
      pointerMaxLift,
      edgeLiftRadius,
      edgeLiftMin,
      leftLiftBoost,
      leftLiftSpan,
    } =
      ISOMETRIC_WORD_CLOUD_SCENE.depth
    const [groupX, groupY] = ISOMETRIC_WORD_CLOUD_SCENE.group
    for (let index = 0; index < built.length; index += 1) {
      const mesh = meshRefs.current[index]
      const cell = built[index]
      if (!mesh || !cell) continue
      if (!isometricWordCloudEntryMatchesFocus(cell.audience, focusRef.current)) continue

      const mouseDistance = isometricWordCloudDistance(x, y, cell.coverX, cell.coverY)
      const fadeProgress = Math.min(
        1,
        Math.max(0, (mouseDistance - pointerInfluenceRadius) / pointerInfluenceFade),
      )
      const restBlend = fadeProgress * fadeProgress * (3 - 2 * fadeProgress)
      const restZ = isometricWordCloudRestZ(cell.coverX, cell.coverY)
      const rawPointerZ = isometricWordCloudLiftZ(mouseDistance)
      const fromCenter = isometricWordCloudDistance(
        cell.coverX,
        cell.coverY,
        groupX,
        groupY,
      )
      const edgeProgress = Math.min(1, fromCenter / edgeLiftRadius)
      const edgeGain = 1 - edgeProgress * (1 - edgeLiftMin)
      const leftProgress = Math.min(1, Math.max(0, (groupX - cell.coverX) / leftLiftSpan))
      const leftGain = 1 + leftLiftBoost * leftProgress
      const liftTravel = Math.min(pointerMaxLift, Math.max(0, rawPointerZ - restZ))
      const hoverZ = restZ + liftTravel * edgeGain * leftGain
      gsap.to(mesh.position, {
        duration: isometricWordCloudDuration(mouseDistance),
        z: hoverZ + (restZ - hoverZ) * restBlend,
        overwrite: 'auto',
        ease: 'power1.out',
      })
    }
  })

  const { lights } = ISOMETRIC_WORD_CLOUD_SCENE
  const { softness: edgeShadeSoftness, blurScale: edgeShadeBlur } =
    ISOMETRIC_WORD_CLOUD_SCENE.edgeShade

  return (
    <>
      <color attach="background" args={[fogColor]} />
      <fog
        attach="fog"
        args={[fogColor, ISOMETRIC_WORD_CLOUD_SCENE.fog.near, ISOMETRIC_WORD_CLOUD_SCENE.fog.far]}
      />

      <spotLight
        ref={blueLightRef}
        color={coolLightColor}
        intensity={lights.intensity}
        distance={lights.distance}
        angle={lights.angle}
        penumbra={lights.penumbra}
        decay={lights.decay}
        position={lights.blue.start}
      />
      <spotLight
        ref={rotatingLightRef}
        color={warmLightColor}
        intensity={lights.intensity}
        distance={lights.distance}
        angle={lights.angle}
        penumbra={lights.penumbra}
        decay={lights.decay}
        position={lights.white.start}
      />

      <mesh ref={floorRef} geometry={floorGeometry} material={floorMaterial} />

      <group
        position={[layout.groupX, layout.groupY, 0]}
        visible={loadingPoseReady}
      >
        {built.map((word, index) => {
          const loadingHero = loadingCountActive && word.isHero
          const [lookAtX, lookAtY] = isometricWordCloudResolvedCamera(framing).lookAt
          const [groupX, groupY] = ISOMETRIC_WORD_CLOUD_SCENE.group
          return (
            <mesh
              key={word.id}
              ref={(node) => {
                meshRefs.current[index] = node
                if (node && !node.userData.isoCloudInit) {
                  // Park loading pose immediately so a paint before the session
                  // effect cannot show the idle cloud.
                  if (mode === 'loading') {
                    if (word.isHero) {
                      node.visible = true
                      node.position.x = lookAtX - groupX
                      node.position.y = lookAtY - groupY
                      node.position.z = isometricWordCloudRestZ(word.coverX, word.coverY)
                    } else {
                      node.visible = false
                      node.position.z = ISOMETRIC_WORD_CLOUD_SCENE.loading.farZ
                    }
                  } else if (!active) {
                    node.visible = false
                    node.position.x = word.localX
                    node.position.y = word.localY
                    node.position.z = ISOMETRIC_WORD_CLOUD_SCENE.loading.farZ
                  } else {
                    node.position.z = isometricWordCloudRestZ(word.coverX, word.coverY)
                  }
                  node.userData.isoCloudInit = true
                }
              }}
              geometry={word.geometry}
              material={word.isHero || word.word === 'VURIFY' ? accentMaterial : material}
              position-x={loadingHero ? lookAtX - groupX : word.localX}
              position-y={loadingHero ? lookAtY - groupY : word.localY}
              rotation-z={(word.rotateDeg * Math.PI) / 180}
            />
          )
        })}
      </group>

      {edgeShadeActive ? (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <WordCloudEdgeShade
            intensity={edgeShadeIntensity}
            softness={edgeShadeSoftness}
            blurScale={edgeShadeBlur}
            shadeColor={fogColor}
            center={shadeCenterRef.current}
          />
        </EffectComposer>
      ) : null}
    </>
  )
}
