/**
 * Curtain loading R3F scene — same stage/fog/lights/camera as IsometricWordCloud,
 * with V + % only (no cloud reveal). Stays on the front loading camera through 100%,
 * then reports ready for CurtainTransition (no front→oblique).
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import {
  Mesh,
  MeshLambertMaterial,
  MeshPhysicalMaterial,
  Object3D,
  PlaneGeometry,
  SpotLight,
  type PerspectiveCamera,
} from 'three'
import { FontLoader, TextGeometry, type Font } from 'three-stdlib'
import gsap from '../lib/gsap'
import {
  ISOMETRIC_WORD_CLOUD_SCENE,
  isometricWordCloudLoadingLabel,
  isometricWordCloudRestZ,
} from '../lib/isometrics/isometricWordCloud'

export type CurtainLoadingSceneProps = {
  typefaceUrl: string
  wordColor: string
  emissiveColor: string
  accentEmissiveColor: string
  coolLightColor: string
  warmLightColor: string
  fogColor: string
  reducedMotion?: boolean
  /** External 0–100 App Stage bootstrap feed (ceiling — display eases toward it). */
  progress: number
  loadingKey?: number
  onComplete?: () => void
}

/** Front loading camera — same as Home, nudged a little forward (smaller Z). */
export const CURTAIN_LOADING_CAMERA = {
  fov: ISOMETRIC_WORD_CLOUD_SCENE.camera.frontFov,
  zoom: ISOMETRIC_WORD_CLOUD_SCENE.camera.zoom,
  near: ISOMETRIC_WORD_CLOUD_SCENE.camera.near,
  position: [
    ISOMETRIC_WORD_CLOUD_SCENE.camera.frontPosition[0],
    ISOMETRIC_WORD_CLOUD_SCENE.camera.frontPosition[1],
    ISOMETRIC_WORD_CLOUD_SCENE.camera.frontPosition[2] * 0.86,
  ] as [number, number, number],
  lookAt: ISOMETRIC_WORD_CLOUD_SCENE.camera.lookAt,
} as const

/** V reads larger than the % counter (Home hero scale + counter secondary). */
const V_SIZE = ISOMETRIC_WORD_CLOUD_SCENE.heroSize * 1.35
const PCT_SIZE = ISOMETRIC_WORD_CLOUD_SCENE.heroSize * 0.72
const V_GAP = V_SIZE * 0.55 + PCT_SIZE * 0.55
const MIN_COUNT_DURATION = 2.8
const HOLD_CAP = 94

function buildGlyphGeometry(font: Font, text: string, size: number): TextGeometry {
  const {
    extrudeDepth,
    curveSegments,
    bevelThickness,
    bevelSize,
    bevelOffset,
    bevelFullSize,
  } = ISOMETRIC_WORD_CLOUD_SCENE
  const bevelScale = Math.min(1, size / bevelFullSize)

  const geometry = new TextGeometry(text, {
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

function pinFrontCamera(camera: PerspectiveCamera) {
  const { zoom, lookAt } = ISOMETRIC_WORD_CLOUD_SCENE.camera
  const [lx, ly, lz] = lookAt
  const [px, py, pz] = CURTAIN_LOADING_CAMERA.position
  gsap.killTweensOf(camera.position)
  gsap.killTweensOf(camera)
  camera.position.set(px, py, pz)
  camera.fov = CURTAIN_LOADING_CAMERA.fov
  camera.zoom = zoom
  camera.lookAt(lx, ly, lz)
  camera.updateProjectionMatrix()
}

export function CurtainLoadingScene({
  typefaceUrl,
  wordColor,
  emissiveColor,
  accentEmissiveColor,
  coolLightColor,
  warmLightColor,
  fogColor,
  reducedMotion = false,
  progress,
  loadingKey = 0,
  onComplete,
}: CurtainLoadingSceneProps) {
  const font = useLoader(FontLoader, typefaceUrl) as unknown as Font
  const { camera, scene, pointer, size } = useThree()
  const vRef = useRef<Mesh>(null)
  const pctRef = useRef<Mesh>(null)
  const floorRef = useRef<Mesh>(null)
  const blueLightRef = useRef<SpotLight>(null)
  const rotatingLightRef = useRef<SpotLight>(null)
  const lastLabelRef = useRef('')
  const readyStartedRef = useRef(false)
  const progressRef = useRef(progress)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  progressRef.current = progress

  const { lights, material: matCfg, loading, group, fog: fogCfg, camera: camCfg } =
    ISOMETRIC_WORD_CLOUD_SCENE
  const [lookAtX, lookAtY] = camCfg.lookAt
  const [groupX, groupY] = group
  // Same local origin as Home `prepareLoadingPose` (camera lookAt compensated by cloud group).
  const localX = lookAtX - groupX
  const localY = lookAtY - groupY
  // Home hero V rest Z uses pack-center cover (group), not the loading XY —
  // that clamps V forward. Using lookAt XY recessed the curtain into fog.
  const heroRestZ = isometricWordCloudRestZ(groupX, groupY)

  const lightTarget = useMemo(() => {
    const target = new Object3D()
    const [x, y, z] = lights.target
    target.position.set(x, y, z)
    return target
  }, [lights.target])

  useEffect(() => {
    scene.add(lightTarget)
    return () => {
      scene.remove(lightTarget)
    }
  }, [scene, lightTarget])

  useEffect(() => {
    const blue = blueLightRef.current
    const rotating = rotatingLightRef.current
    if (blue) blue.target = lightTarget
    if (rotating) rotating.target = lightTarget
  }, [lightTarget])

  const accentMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: wordColor,
        metalness: matCfg.metalness,
        emissive: accentEmissiveColor,
        emissiveIntensity: matCfg.emissiveIntensity,
        roughness: matCfg.roughness,
        fog: true,
      }),
    [accentEmissiveColor, matCfg, wordColor],
  )

  const pctMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: wordColor,
        metalness: matCfg.metalness,
        emissive: emissiveColor,
        emissiveIntensity: matCfg.emissiveIntensity,
        roughness: matCfg.roughness,
        fog: true,
      }),
    [emissiveColor, matCfg, wordColor],
  )

  useEffect(() => {
    accentMaterial.color.set(wordColor)
    accentMaterial.emissive.set(accentEmissiveColor)
    pctMaterial.color.set(wordColor)
    pctMaterial.emissive.set(emissiveColor)
  }, [accentMaterial, pctMaterial, wordColor, emissiveColor, accentEmissiveColor])

  const vGeometry = useMemo(() => buildGlyphGeometry(font, 'V', V_SIZE), [font])
  const initialPctGeometry = useMemo(
    () => buildGlyphGeometry(font, isometricWordCloudLoadingLabel(0), PCT_SIZE),
    [font],
  )

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

  // Aspect — same as IsometricWordCloudScene.
  useEffect(() => {
    const perspective = camera as PerspectiveCamera
    if (size.width <= 0 || size.height <= 0) return
    perspective.aspect = size.width / size.height
    perspective.updateProjectionMatrix()
  }, [camera, size.width, size.height])

  useEffect(() => {
    return () => {
      vGeometry.dispose()
      initialPctGeometry.dispose()
      accentMaterial.dispose()
      pctMaterial.dispose()
      floorMaterial.dispose()
      floorGeometry.dispose()
      ;[blueLightRef.current, rotatingLightRef.current].forEach((light) => {
        if (light) gsap.killTweensOf(light.position)
      })
      gsap.killTweensOf(camera.position)
      gsap.killTweensOf(camera)
    }
  }, [accentMaterial, camera, floorGeometry, floorMaterial, initialPctGeometry, pctMaterial, vGeometry])

  // Soft light drift — same as word cloud ambiance (pointer-linked).
  useFrame(() => {
    const blueLight = blueLightRef.current
    const rotatingLight = rotatingLightRef.current
    const floor = floorRef.current
    const { lightTweenDuration } = ISOMETRIC_WORD_CLOUD_SCENE

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
    if (floor && blueLight) {
      floor.position.set(0, 0, 0)
    }
  })

  // One session: front loading camera + smooth count → report ready at 100% (stay front).
  useEffect(() => {
    let cancelled = false
    let countTween: ReturnType<typeof gsap.to> | null = null
    let holdCall: ReturnType<typeof gsap.delayedCall> | null = null
    let poll = 0
    let finishing = false
    readyStartedRef.current = false
    lastLabelRef.current = ''

    pinFrontCamera(camera as PerspectiveCamera)

    const vMesh = vRef.current
    const pctMesh = pctRef.current
    if (!vMesh || !pctMesh) return

    const startedAt = performance.now()
    const proxy = { value: 0 }

    const setPctLabel = (value: number) => {
      if (!pctMesh) return
      const label = isometricWordCloudLoadingLabel(value)
      if (label === lastLabelRef.current) return
      lastLabelRef.current = label
      const previous = pctMesh.geometry as TextGeometry
      const next = buildGlyphGeometry(font, label, PCT_SIZE)
      pctMesh.geometry = next
      if (previous !== initialPctGeometry && previous !== next) previous.dispose()
    }

    const reportReady = () => {
      if (cancelled || readyStartedRef.current) return
      readyStartedRef.current = true
      countTween?.kill()
      holdCall?.kill()
      onCompleteRef.current?.()
    }

    const beginHandoff = () => {
      if (cancelled || readyStartedRef.current) return
      holdCall?.kill()
      holdCall = gsap.delayedCall(loading.holdAtHundred, () => {
        if (cancelled) return
        reportReady()
      })
    }

    const chase = (target: number, duration: number, onDone?: () => void) => {
      countTween?.kill()
      const from = proxy.value
      const to = Math.max(from, Math.min(100, target))
      if (to <= from + 0.01) {
        setPctLabel(Math.round(to))
        onDone?.()
        return
      }
      const dur = reducedMotion ? 0 : Math.max(0.2, duration)
      countTween = gsap.to(proxy, {
        value: to,
        duration: dur,
        ease: 'none',
        onUpdate: () => {
          if (cancelled) return
          setPctLabel(Math.round(proxy.value))
        },
        onComplete: () => {
          if (cancelled) return
          setPctLabel(Math.round(proxy.value))
          onDone?.()
        },
      })
    }

    const syncToProgress = () => {
      if (cancelled || readyStartedRef.current) return
      const real = progressRef.current
      const elapsed = (performance.now() - startedAt) / 1000
      const remainMin = Math.max(0, MIN_COUNT_DURATION - elapsed)

      if (reducedMotion) {
        if (real >= 100) {
          finishing = true
          proxy.value = 100
          setPctLabel(100)
          beginHandoff()
        } else {
          proxy.value = real
          setPctLabel(real)
        }
        return
      }

      if (real >= 100) {
        if (finishing || readyStartedRef.current) return
        finishing = true
        chase(100, Math.max(0.45, remainMin), beginHandoff)
        return
      }

      const capped = Math.min(real, HOLD_CAP)
      if (capped <= proxy.value) {
        const crawlTarget = Math.min(
          HOLD_CAP,
          Math.max(proxy.value + 1, elapsed * (HOLD_CAP / MIN_COUNT_DURATION)),
        )
        if (crawlTarget > proxy.value + 0.5) chase(crawlTarget, 0.35)
        return
      }

      const step = capped - proxy.value
      chase(capped, Math.max(0.35, Math.min(1.1, step / 45)))
    }

    vMesh.visible = true
    pctMesh.visible = true
    vMesh.position.set(localX, localY + V_GAP / 2, heroRestZ)
    pctMesh.position.set(localX, localY - V_GAP / 2, heroRestZ)
    setPctLabel(0)

    if (reducedMotion) {
      setPctLabel(progressRef.current)
    } else {
      chase(HOLD_CAP, MIN_COUNT_DURATION)
    }
    syncToProgress()
    poll = window.setInterval(syncToProgress, 120)

    return () => {
      cancelled = true
      window.clearInterval(poll)
      countTween?.kill()
      holdCall?.kill()
    }
  }, [
    camera,
    font,
    initialPctGeometry,
    loading.holdAtHundred,
    loadingKey,
    localX,
    localY,
    reducedMotion,
    heroRestZ,
  ])

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  return (
    <>
      <color attach="background" args={[fogColor]} />
      <fog attach="fog" args={[fogColor, fogCfg.near, fogCfg.far]} />

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

      <group position={[groupX, groupY, 0]}>
        <mesh
          ref={vRef}
          geometry={vGeometry}
          material={accentMaterial}
          position={[localX, localY + V_GAP / 2, heroRestZ]}
        />
        <mesh
          ref={pctRef}
          geometry={initialPctGeometry}
          material={pctMaterial}
          position={[localX, localY - V_GAP / 2, heroRestZ]}
        />
      </group>
    </>
  )
}
