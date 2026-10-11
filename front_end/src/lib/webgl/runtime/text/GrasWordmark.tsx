import { forwardRef, useLayoutEffect, useMemo, useRef, type Ref } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { FontLoader, TextGeometry, type Font } from 'three-stdlib'
import { Plane, ShaderMaterial, Vector3, type Group, type Mesh, type PointLight } from 'three'
import { easeCarouselWheel, gsap, useGSAP } from '../../../gsap'
import { installDoubleSideMeshPick } from '../interaction/cameraPick'
import { applyCeramicScatter, syncCeramicScatter } from '../materials/ceramicScatter'
import {
  GRAS_EXPAND_DURATION,
  GRAS_EXPAND_PREFIX,
  GRAS_EXPAND_STAGGER,
  GRAS_EXPAND_SUFFIX,
  GRAS_LETTER_DEPTH,
  GRAS_LETTER_GAP,
  GRAS_FRONT_YAW,
  grasCursorLightDistance,
  grasCursorLightIntensity,
  grasCursorLightLift,
  grasCursorLightWorldScale,
  grasIdleLightIntensity,
  grasIdleLightY,
  grasLightEase,
  GRAS_CURSOR_LIGHT_LIFT,
  GRAS_IDLE_LIGHT_PERIOD,
  GRAS_LETTER_SIZE,
  grasWordmarkHeight,
  grasWordmarkOriginY,
  type GrasWordmarkAnchor,
  GRAS_LETTERS,
  GRAS_OBJECT_COLOR,
  GRAS_SUFFIX_SIZE,
  GRAS_TYPEFACE_URL,
  grasLetterCentersY,
  grasPrefixSlideX,
  grasRowAlignX,
  grasRowHitSize,
  grasRowLayout,
  grasSuffixSlideX,
  type GrasRowLayout,
} from './grasLetterLayout'

type PointerHandler = (event: ThreeEvent<PointerEvent>) => void

type GrasWordmarkProps = {
  color?: string
  intensity?: number
  /** `top` hangs G from the origin (scene pin). Viewer stays `ground` (S on y = 0). */
  anchor?: GrasWordmarkAnchor
  /** Off during a boom-arc crane so expand / cursor lamp / Adam dim wait until the shot ends. */
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

type GrasExpandRowProps = {
  layout: GrasRowLayout
  y: number
  height: number
  geometryOf: (ch: string, kind: GlyphKind) => TextGeometry | undefined
  hoverEnabled: boolean
}

function GrasExpandRow({ layout, y, height, geometryOf, hoverEnabled }: GrasExpandRowProps) {
  const hitRef = useRef<Mesh>(null)
  const rowRef = useRef<Group>(null)
  const prefixRef = useRef<Group>(null)
  const suffixRef = useRef<Group>(null)
  const tlRef = useRef<ReturnType<typeof gsap.timeline> | null>(null)
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
  const hitSize = grasRowHitSize(layout.totalWidth, height)
  const stemX = layout.centersX[layout.stemIndex] ?? 0
  const prefixChars = [...layout.prefix]
  const suffixChars = [...layout.suffix]

  useLayoutEffect(() => {
    const row = rowRef.current
    const hit = hitRef.current
    if (!row) return
    row.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh || !String(mesh.name).startsWith('gras-letter-')) return
      const name = String(mesh.name)
      if (name.includes('-prefix-')) clipCeramicGlyph(mesh, prefixPlanes)
      else if (name.includes('-suffix-')) clipCeramicGlyph(mesh, suffixPlanes)
      else applyCeramicScatter(mesh)
      mesh.raycast = skipLetterRaycast
    })
    syncCeramicScatter(row)
    if (hit) installDoubleSideMeshPick(hit)
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

  const { contextSafe } = useGSAP(
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
        onUpdate: () => invalidate(),
        onReverseComplete: () => {
          prefix.visible = false
          suffix.visible = false
          invalidate()
        },
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
      tlRef.current = tl
      return () => {
        tl.kill()
        tlRef.current = null
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

  const onOver = contextSafe(() => {
    if (!hoverEnabled) return
    if (prefixRef.current) prefixRef.current.visible = true
    if (suffixRef.current) suffixRef.current.visible = true
    tlRef.current?.play()
  })

  const onOut = contextSafe(() => {
    tlRef.current?.reverse()
  })

  useLayoutEffect(() => {
    if (hoverEnabled) return
    tlRef.current?.pause()
    tlRef.current?.reverse()
  }, [hoverEnabled])

  return (
    <group position={[0, y, 0]}>
      <mesh
        ref={hitRef}
        name={`gras-row-hit-${layout.letter}`}
        onPointerOver={onOver}
        onPointerOut={onOut}
      >
        <boxGeometry args={hitSize} />
        <meshStandardMaterial visible={false} />
      </mesh>
      <group ref={rowRef} position={[restX, 0, 0]}>
        {stemGeo ? (
          <mesh
            name={`gras-letter-${layout.letter}`}
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
                name={`gras-letter-${layout.letter}-prefix-${index}`}
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
                name={`gras-letter-${layout.letter}-suffix-${index}`}
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
 * Vertical Megrim GRAS — Adam ceramic SSS on the glyphs. At rest one PointLight
 * walks the letters; hover fades that out and fades in a cursor lamp over the glyphs.
 * Hover clip-slides a smaller remainder from the right (and a tiny “of” from the
 * left of A) and recenters the row.
 */
export const GrasWordmark = forwardRef<Group, GrasWordmarkProps>(function GrasWordmark(
  {
    color = GRAS_OBJECT_COLOR,
    anchor = 'ground',
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
  const cursorLightRef = useRef<PointLight>(null)
  const idleLightRef = useRef<PointLight>(null)
  const hovering = useRef(false)
  const idleAge = useRef(0)
  const invalidate = useThree((state) => state.invalidate)
  const font = useLoader(FontLoader, GRAS_TYPEFACE_URL) as unknown as Font
  const glyphs = useMemo(() => {
    const smallChars = new Set<string>()
    for (const letter of GRAS_LETTERS) {
      for (const ch of GRAS_EXPAND_PREFIX[letter]) smallChars.add(ch)
      for (const ch of GRAS_EXPAND_SUFFIX[letter]) smallChars.add(ch)
    }
    const stem = new Map<string, TextGeometry>()
    const small = new Map<string, TextGeometry>()
    const stemWidth = new Map<string, number>()
    const smallWidth = new Map<string, number>()
    for (const letter of GRAS_LETTERS) {
      const geo = buildLetterGeometry(font, letter, GRAS_LETTER_SIZE)
      stem.set(letter, geo)
      stemWidth.set(letter, glyphWidth(geo, GRAS_LETTER_SIZE))
    }
    for (const ch of smallChars) {
      const geo = buildLetterGeometry(font, ch, GRAS_SUFFIX_SIZE)
      small.set(ch, geo)
      smallWidth.set(ch, glyphWidth(geo, GRAS_SUFFIX_SIZE))
    }
    return { stem, small, stemWidth, smallWidth }
  }, [font])
  const heights = useMemo(
    () =>
      GRAS_LETTERS.map((letter) => {
        const geometry = glyphs.stem.get(letter)
        geometry?.computeBoundingBox()
        const box = geometry?.boundingBox
        return box ? box.max.y - box.min.y : GRAS_LETTER_SIZE
      }),
    [glyphs],
  )
  const centersY = useMemo(() => grasLetterCentersY(heights, GRAS_LETTER_GAP), [heights])
  const stackHeight = useMemo(() => grasWordmarkHeight(heights, GRAS_LETTER_GAP), [heights])
  const originY = grasWordmarkOriginY(anchor, stackHeight)
  const rows = useMemo(
    () =>
      GRAS_LETTERS.map((letter) =>
        grasRowLayout(letter, (ch) =>
          ch === letter
            ? (glyphs.stemWidth.get(ch) ?? GRAS_LETTER_SIZE)
            : (glyphs.smallWidth.get(ch) ?? GRAS_SUFFIX_SIZE),
        ),
      ),
    [glyphs],
  )

  useLayoutEffect(() => {
    if (hoverEnabled) return
    if (!hovering.current) return
    hovering.current = false
    onHoverChange?.(false)
    invalidate()
  }, [hoverEnabled, onHoverChange, invalidate])

  useLayoutEffect(() => {
    const node = rootRef.current
    if (!node) return
    syncCeramicScatter(node)
    node.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      if (String(mesh.name).startsWith('gras-letter-')) mesh.raycast = skipLetterRaycast
      else if (String(mesh.name).startsWith('gras-row-hit-')) installDoubleSideMeshPick(mesh)
    })
  }, [glyphs])

  useLayoutEffect(
    () => () => {
      for (const geometry of glyphs.stem.values()) geometry.dispose()
      for (const geometry of glyphs.small.values()) geometry.dispose()
    },
    [glyphs],
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
    if (idle) {
      idle.position.set(0, grasIdleLightY(phase, centersY), GRAS_CURSOR_LIGHT_LIFT)
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
        name="gras-cursor-light"
        color={color}
        intensity={0}
        distance={0}
        decay={2}
      />
      <group position={[0, originY, 0]} rotation={[0, GRAS_FRONT_YAW, 0]}>
        <pointLight
          ref={idleLightRef}
          name="gras-idle-light"
          color={color}
          intensity={0}
          distance={0}
          decay={2}
          position={[0, centersY[0] ?? 0, GRAS_CURSOR_LIGHT_LIFT]}
        />
        {rows.map((layout, index) => (
          <GrasExpandRow
            key={layout.letter}
            layout={layout}
            y={centersY[index] ?? 0}
            height={heights[index] ?? GRAS_LETTER_SIZE}
            geometryOf={(ch, kind) => (kind === 'stem' ? glyphs.stem : glyphs.small).get(ch)}
            hoverEnabled={hoverEnabled}
          />
        ))}
      </group>
    </group>
  )
})
