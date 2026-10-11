import { forwardRef, useLayoutEffect, useMemo, useRef, type Ref } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { FontLoader, TextGeometry, type Font } from 'three-stdlib'
import { Plane, ShaderMaterial, Vector3, type Group, type Mesh, type PointLight } from 'three'
import { easeCarouselWheel, gsap, useGSAP } from '../../../gsap'
import { installDoubleSideMeshPick } from '../interaction/cameraPick'
import { applyCeramicScatter, syncCeramicScatter } from '../materials/ceramicScatter'
import {
  GRAS_CURSOR_LIGHT_LIFT,
  GRAS_EXPAND_DURATION,
  GRAS_EXPAND_STAGGER,
  GRAS_FRONT_YAW,
  GRAS_IDLE_LIGHT_PERIOD,
  GRAS_LETTER_DEPTH,
  GRAS_LETTER_SIZE,
  GRAS_OBJECT_COLOR,
  GRAS_SUFFIX_SIZE,
  GRAS_TYPEFACE_URL,
  grasCursorLightDistance,
  grasCursorLightIntensity,
  grasCursorLightLift,
  grasCursorLightWorldScale,
  grasIdleLightIntensity,
  grasIdleLightY,
  grasLightEase,
  grasPrefixSlideX,
  grasRowAlignX,
  grasRowHitSize,
  grasSuffixSlideX,
  grasWordmarkOriginY,
  type GrasWordmarkAnchor,
} from './grasLetterLayout'
import {
  PROJECTS_EXPAND,
  PROJECTS_STEM,
  projectsIdleCenters,
  projectsPackX,
  projectsRowLayout,
} from './projectsLetterLayout'
import type { AboutUsPackAlign, AboutUsRowLayout } from './aboutUsLetterLayout'

type PointerHandler = (event: ThreeEvent<PointerEvent>) => void

type ProjectsWordmarkProps = {
  color?: string
  intensity?: number
  /** `left` keeps the left of P on the origin (scene pin). Viewer stays `ground`. */
  anchor?: GrasWordmarkAnchor
  /** Override glyph-front yaw. Scene Projects Home looks from +Z. */
  frontYaw?: number
  hoverEnabled?: boolean
  onHoverChange?: (hovered: boolean) => void
  onPointerDown?: PointerHandler
  onPointerMove?: PointerHandler
  onPointerLeave?: PointerHandler
  onPointerUp?: PointerHandler
}

const clipPoint = new Vector3()
const clipNormal = new Vector3()
const cursorWorld = new Vector3()
const cursorScale = new Vector3()

function buildLetterGeometry(font: Font, letter: string, size: number): TextGeometry {
  const bevel = size / GRAS_LETTER_SIZE
  const geometry = new TextGeometry(letter, {
    font,
    size,
    height: GRAS_LETTER_DEPTH,
    curveSegments: 4,
    bevelEnabled: true,
    bevelThickness: 0.012 * bevel,
    bevelSize: 0.008 * bevel,
  })
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (box) {
    geometry.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -(box.min.z + box.max.z) / 2)
  }
  return geometry
}

function glyphWidth(geometry: TextGeometry, fallback: number): number {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  return box ? box.max.x - box.min.x : fallback
}

function setLocalClipPlane(row: Group, localX: number, sign: 1 | -1, plane: Plane) {
  const world = row.matrixWorld
  clipNormal.set(sign, 0, 0).transformDirection(world)
  clipPoint.set(localX, 0, 0).applyMatrix4(world)
  plane.setFromNormalAndCoplanarPoint(clipNormal, clipPoint)
}

function syncRowClipPlanes(
  row: Group,
  stemLeft: number,
  stemRight: number,
  clipLeft: number,
  clipRight: number,
  prefixMin: Plane,
  prefixMax: Plane,
  suffixMin: Plane,
  suffixMax: Plane,
) {
  row.updateWorldMatrix(true, false)
  setLocalClipPlane(row, clipLeft, 1, prefixMin)
  setLocalClipPlane(row, stemLeft, -1, prefixMax)
  setLocalClipPlane(row, stemRight, 1, suffixMin)
  setLocalClipPlane(row, clipRight, -1, suffixMax)
}

function skipLetterRaycast() {}

function clipCeramicGlyph(mesh: Mesh, planes: Plane[]) {
  applyCeramicScatter(mesh)
  const mat = mesh.material as ShaderMaterial
  mat.clipping = true
  mat.clippingPlanes = planes
  mat.needsUpdate = true
}

type GlyphKind = 'stem' | 'small'

type ProjectsExpandWordProps = {
  layout: AboutUsRowLayout
  geometryOf: (ch: string, kind: GlyphKind) => TextGeometry | undefined
}

function ProjectsExpandWord({ layout, geometryOf }: ProjectsExpandWordProps) {
  const rowRef = useRef<Group>(null)
  const prefixRef = useRef<Group>(null)
  const suffixRef = useRef<Group>(null)
  const clipLeftRef = useRef(layout.stemLeft)
  const clipRightRef = useRef(layout.stemRight)
  const prefixMin = useMemo(() => new Plane(), [])
  const prefixMax = useMemo(() => new Plane(), [])
  const suffixMin = useMemo(() => new Plane(), [])
  const suffixMax = useMemo(() => new Plane(), [])
  const prefixPlanes = useMemo(() => [prefixMin, prefixMax], [prefixMin, prefixMax])
  const suffixPlanes = useMemo(() => [suffixMin, suffixMax], [suffixMin, suffixMax])
  const invalidate = useThree((state) => state.invalidate)
  const stemGeo = geometryOf(layout.letter, 'stem')
  const restX = grasRowAlignX(layout.stemCenterX, 0)
  const stemX = layout.centersX[layout.stemIndex] ?? 0
  const prefixChars = [...layout.prefix]
  const suffixChars = [...layout.suffix]

  useLayoutEffect(() => {
    const row = rowRef.current
    if (!row) return
    row.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh || !String(mesh.name).startsWith('projects-letter-')) return
      const name = String(mesh.name)
      if (name.includes('-prefix-')) clipCeramicGlyph(mesh, prefixPlanes)
      else if (name.includes('-suffix-')) clipCeramicGlyph(mesh, suffixPlanes)
      else applyCeramicScatter(mesh)
      mesh.raycast = skipLetterRaycast
    })
    syncCeramicScatter(row)
    syncRowClipPlanes(
      row,
      layout.stemLeft,
      layout.stemRight,
      layout.stemLeft,
      layout.stemRight,
      prefixMin,
      prefixMax,
      suffixMin,
      suffixMax,
    )
  }, [layout, prefixPlanes, suffixPlanes, prefixMin, prefixMax, suffixMin, suffixMax])

  useGSAP(
    () => {
      const row = rowRef.current
      const prefix = prefixRef.current
      const suffix = suffixRef.current
      if (!row || !prefix || !suffix) return
      const prefixMeshes = prefix.children.filter((child): child is Mesh => (child as Mesh).isMesh)
      const suffixMeshes = suffix.children.filter((child): child is Mesh => (child as Mesh).isMesh)
      gsap.set(row.position, { x: restX })
      for (let i = 0; i < prefixMeshes.length; i++) {
        const finalX = layout.centersX[i] ?? 0
        gsap.set(prefixMeshes[i]!.position, { x: grasPrefixSlideX(finalX, 0) })
      }
      for (let i = 0; i < suffixMeshes.length; i++) {
        const finalX = layout.centersX[layout.stemIndex + 1 + i] ?? 0
        gsap.set(suffixMeshes[i]!.position, { x: grasSuffixSlideX(finalX, 0) })
      }
      clipLeftRef.current = layout.stemLeft
      clipRightRef.current = layout.stemRight
      prefix.visible = false
      suffix.visible = false
      const clip = { left: layout.stemLeft, right: layout.stemRight }
      const tl = gsap.timeline({
        paused: true,
        defaults: { duration: GRAS_EXPAND_DURATION, ease: easeCarouselWheel },
        onStart: () => {
          prefix.visible = true
          suffix.visible = true
          invalidate()
        },
        onUpdate: () => invalidate(),
      })
      tl.to(row.position, { x: 0 }, 0)
      tl.to(
        clip,
        {
          left: layout.wordLeft,
          right: layout.wordRight,
          onUpdate: () => {
            clipLeftRef.current = clip.left
            clipRightRef.current = clip.right
          },
        },
        0,
      )
      for (let i = prefixMeshes.length - 1; i >= 0; i--) {
        const finalX = layout.centersX[i] ?? 0
        const delay = (prefixMeshes.length - 1 - i) * GRAS_EXPAND_STAGGER
        tl.to(prefixMeshes[i]!.position, { x: finalX }, delay)
      }
      for (let i = 0; i < suffixMeshes.length; i++) {
        const finalX = layout.centersX[layout.stemIndex + 1 + i] ?? 0
        tl.to(suffixMeshes[i]!.position, { x: finalX }, i * GRAS_EXPAND_STAGGER)
      }
      tl.play()
      return () => {
        tl.kill()
      }
    },
    { dependencies: [layout, restX, invalidate] },
  )

  useFrame(() => {
    const row = rowRef.current
    if (!row) return
    syncRowClipPlanes(
      row,
      layout.stemLeft,
      layout.stemRight,
      clipLeftRef.current,
      clipRightRef.current,
      prefixMin,
      prefixMax,
      suffixMin,
      suffixMax,
    )
  })

  return (
    <group>
      <group ref={rowRef} position={[restX, 0, 0]}>
        {stemGeo ? (
          <mesh
            name={`projects-letter-${layout.letter}`}
            geometry={stemGeo}
            position={[stemX, 0, 0]}
            raycast={skipLetterRaycast}
            castShadow={false}
            receiveShadow={false}
          />
        ) : null}
        <group ref={prefixRef} visible={false}>
          {prefixChars.map((ch, index) => {
            const geo = geometryOf(ch, 'small')
            if (!geo) return null
            const finalX = layout.centersX[index] ?? 0
            return (
              <mesh
                key={`${layout.letter}-prefix-${index}-${ch}`}
                name={`projects-letter-${layout.letter}-prefix-${index}`}
                geometry={geo}
                position={[grasPrefixSlideX(finalX, 0), 0, 0]}
                raycast={skipLetterRaycast}
                castShadow={false}
                receiveShadow={false}
              />
            )
          })}
        </group>
        <group ref={suffixRef} visible={false}>
          {suffixChars.map((ch, index) => {
            const geo = geometryOf(ch, 'small')
            if (!geo) return null
            const finalX = layout.centersX[layout.stemIndex + 1 + index] ?? 0
            return (
              <mesh
                key={`${layout.letter}-suffix-${index}-${ch}`}
                name={`projects-letter-${layout.letter}-suffix-${index}`}
                geometry={geo}
                position={[grasSuffixSlideX(finalX, 0), 0, 0]}
                raycast={skipLetterRaycast}
                castShadow={false}
                receiveShadow={false}
              />
            )
          })}
        </group>
      </group>
    </group>
  )
}

/**
 * One-row Megrim Projects — Adam ceramic SSS on the glyphs. Play-in clip-slides
 * a smaller remainder from the right (P→rojects). There is no leave reverse.
 * At rest one PointLight walks P→s; hover fades that out and fades in a cursor lamp.
 */
export const ProjectsWordmark = forwardRef<Group, ProjectsWordmarkProps>(function ProjectsWordmark(
  {
    color = GRAS_OBJECT_COLOR,
    anchor = 'ground',
    frontYaw = GRAS_FRONT_YAW,
    hoverEnabled = true,
    onHoverChange,
    onPointerDown,
    onPointerMove,
    onPointerLeave,
    onPointerUp,
  },
  ref: Ref<Group>,
) {
  const rootRef = useRef<Group>(null)
  const wordGroupRef = useRef<Group>(null)
  const hitRef = useRef<Mesh>(null)
  const cursorLightRef = useRef<PointLight>(null)
  const idleLightRef = useRef<PointLight>(null)
  const hovering = useRef(false)
  const expandT = useRef(0)
  const idleAge = useRef(0)
  const invalidate = useThree((state) => state.invalidate)
  const font = useLoader(FontLoader, GRAS_TYPEFACE_URL) as unknown as Font
  const glyphs = useMemo(() => {
    const smallChars = new Set<string>([...PROJECTS_EXPAND.prefix, ...PROJECTS_EXPAND.suffix])
    const stem = new Map<string, TextGeometry>()
    const small = new Map<string, TextGeometry>()
    const stemWidth = new Map<string, number>()
    const smallWidth = new Map<string, number>()
    const geo = buildLetterGeometry(font, PROJECTS_STEM, GRAS_LETTER_SIZE)
    stem.set(PROJECTS_STEM, geo)
    stemWidth.set(PROJECTS_STEM, glyphWidth(geo, GRAS_LETTER_SIZE))
    for (const ch of smallChars) {
      const smallGeo = buildLetterGeometry(font, ch, GRAS_SUFFIX_SIZE)
      small.set(ch, smallGeo)
      smallWidth.set(ch, glyphWidth(smallGeo, GRAS_SUFFIX_SIZE))
    }
    return { stem, small, stemWidth, smallWidth }
  }, [font])
  const widthOf = (ch: string) =>
    ch === PROJECTS_STEM
      ? (glyphs.stemWidth.get(ch) ?? GRAS_LETTER_SIZE)
      : (glyphs.smallWidth.get(ch) ?? GRAS_SUFFIX_SIZE)
  const layout = useMemo(() => projectsRowLayout(widthOf), [glyphs])
  const height = useMemo(() => {
    const geometry = glyphs.stem.get(PROJECTS_STEM)
    geometry?.computeBoundingBox()
    const box = geometry?.boundingBox
    return box ? box.max.y - box.min.y : GRAS_LETTER_SIZE
  }, [glyphs])
  const originY = grasWordmarkOriginY(anchor, height)
  const packAlign: AboutUsPackAlign = anchor === 'left' ? 'left' : 'center'
  const restPack = projectsPackX(layout, 0, packAlign, height)
  const openPack = projectsPackX(layout, 1, packAlign, height)
  const hitSize = grasRowHitSize(openPack.totalWidth, openPack.totalHeight)
  const hitX = packAlign === 'left' ? openPack.totalWidth / 2 : 0

  useLayoutEffect(() => {
    const node = rootRef.current
    const hit = hitRef.current
    if (!node) return
    syncCeramicScatter(node)
    node.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      if (String(mesh.name).startsWith('projects-letter-')) mesh.raycast = skipLetterRaycast
      else if (String(mesh.name) === 'projects-phrase-hit') installDoubleSideMeshPick(mesh)
    })
    if (hit) installDoubleSideMeshPick(hit)
  }, [glyphs])

  useLayoutEffect(() => {
    if (hoverEnabled) return
    if (!hovering.current) return
    hovering.current = false
    onHoverChange?.(false)
    invalidate()
  }, [hoverEnabled, onHoverChange, invalidate])

  useLayoutEffect(
    () => () => {
      for (const geometry of glyphs.stem.values()) geometry.dispose()
      for (const geometry of glyphs.small.values()) geometry.dispose()
    },
    [glyphs],
  )

  useGSAP(
    () => {
      const word = wordGroupRef.current
      if (!word) return
      gsap.set(word.position, { x: restPack.x, y: restPack.y })
      expandT.current = 0
      const pack = { t: 0 }
      const tl = gsap.timeline({
        paused: true,
        defaults: { duration: GRAS_EXPAND_DURATION, ease: easeCarouselWheel },
        onUpdate: () => invalidate(),
      })
      tl.to(
        pack,
        {
          t: 1,
          onUpdate: () => {
            expandT.current = pack.t
            const posed = projectsPackX(layout, pack.t, packAlign, height)
            word.position.x = posed.x
            word.position.y = posed.y
          },
        },
        0,
      )
      tl.play()
      return () => {
        tl.kill()
      }
    },
    { dependencies: [layout, packAlign, height, restPack.x, restPack.y, invalidate] },
  )

  const followCursor = (event: ThreeEvent<PointerEvent>) => {
    const root = rootRef.current
    const light = cursorLightRef.current
    if (!root || !light) return
    root.getWorldScale(cursorScale)
    const worldScale = grasCursorLightWorldScale(cursorScale.x, cursorScale.y, cursorScale.z)
    cursorWorld.copy(event.point)
    if (event.normal) cursorWorld.addScaledVector(event.normal, grasCursorLightLift(worldScale))
    root.worldToLocal(cursorWorld)
    light.position.copy(cursorWorld)
    invalidate()
  }

  useFrame((_, dt) => {
    const root = rootRef.current
    const cursor = cursorLightRef.current
    const idle = idleLightRef.current
    if (!root) return
    root.getWorldScale(cursorScale)
    const worldScale = grasCursorLightWorldScale(cursorScale.x, cursorScale.y, cursorScale.z)
    const hovered = hovering.current
    idleAge.current += dt
    const phase = idleAge.current / GRAS_IDLE_LIGHT_PERIOD
    const centers = projectsIdleCenters(layout, expandT.current, packAlign, height)
    if (idle) {
      idle.position.set(
        grasIdleLightY(phase, centers.x),
        grasIdleLightY(phase, centers.y),
        GRAS_CURSOR_LIGHT_LIFT,
      )
      idle.distance = grasCursorLightDistance(worldScale)
      idle.intensity = grasLightEase(idle.intensity, grasIdleLightIntensity(hovered, worldScale), dt)
    }
    if (cursor) {
      cursor.distance = grasCursorLightDistance(worldScale)
      cursor.intensity = grasLightEase(cursor.intensity, grasCursorLightIntensity(hovered, worldScale), dt)
    }
    invalidate()
  })

  return (
    <group
      ref={(node) => {
        rootRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      userData={{ webglPickRoot: true }}
      onPointerOver={(event) => {
        if (!hoverEnabled) return
        hovering.current = true
        followCursor(event)
        onHoverChange?.(true)
      }}
      onPointerDown={onPointerDown}
      onPointerMove={(event) => {
        if (hoverEnabled && hovering.current) followCursor(event)
        onPointerMove?.(event)
      }}
      onPointerLeave={(event) => {
        hovering.current = false
        onHoverChange?.(false)
        onPointerLeave?.(event)
        invalidate()
      }}
      onPointerUp={onPointerUp}
    >
      <pointLight
        ref={cursorLightRef}
        name="projects-cursor-light"
        color={color}
        intensity={0}
        distance={0}
        decay={2}
      />
      <group position={[0, originY, 0]} rotation={[0, frontYaw, 0]}>
        <mesh ref={hitRef} name="projects-phrase-hit" position={[hitX, 0, 0]}>
          <boxGeometry args={hitSize} />
          <meshStandardMaterial visible={false} />
        </mesh>
        <pointLight
          ref={idleLightRef}
          name="projects-idle-light"
          color={color}
          intensity={0}
          distance={0}
          decay={2}
          position={[restPack.x, restPack.y, GRAS_CURSOR_LIGHT_LIFT]}
        />
        <group ref={wordGroupRef} position={[restPack.x, restPack.y, 0]}>
          <ProjectsExpandWord
            layout={layout}
            geometryOf={(ch, kind) => (kind === 'stem' ? glyphs.stem : glyphs.small).get(ch)}
          />
        </group>
      </group>
    </group>
  )
})
