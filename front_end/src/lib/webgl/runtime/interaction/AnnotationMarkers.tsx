import { useEffect, useMemo, type ReactNode } from 'react'
import { Html, Line } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { BufferGeometry, DoubleSide, Quaternion, Raycaster, Vector3 } from 'three'
import type { AssetAnnotation } from '../../assets/assetAnnotations'
import { VIEW_HOME_ID, VIEW_HOME_MARK_ID } from '../../assets/viewPose'
import { findPickRoot, firstMeshHit, type MeshPickHit } from './cameraPick'
import {
  CURSOR_RADIUS,
  CURSOR_STEM,
  HIGHLIGHT_MIN,
  PIN_RADIUS,
  SURFACE_LIFT,
  clampHighlightRadius,
  openRing,
  regionFanIndices,
  ringCentroid,
  ringNewellNormal,
  stemTip,
  surfaceCirclePoints,
} from './markStem'

const _ray = new Raycaster()
const _from = new Vector3()
const _dir = new Vector3()

const KIND_COLOR: Record<AssetAnnotation['kind'], string> = {
  front: '#22c55e',
  back: '#3b82f6',
  midpoint: '#eab308',
  face: '#a855f7',
  point: '#f97316',
  named: '#f8fafc',
  viewpoint: '#38bdf8',
  highlight: '#f43f5e',
  region: '#e879f9',
  color: '#fbbf24',
}

export type DraftHighlight = {
  position: [number, number, number]
  normal?: [number, number, number] | null
  radius: number
}

export type CursorHit = {
  point: [number, number, number]
  normal?: [number, number, number] | null
}

type AnnotationMarkersProps = {
  annotations: readonly AssetAnnotation[]
  draftRing?: readonly [number, number, number][]
  draftHighlight?: DraftHighlight | null
  cursorHit?: CursorHit | null
  draftColor?: string
  showPoints?: boolean
  showLabels?: boolean
  selectedId?: string | null
  onSelect?: (id: string) => void
}

function markColor(mark: AssetAnnotation): string {
  return mark.color ?? KIND_COLOR[mark.kind]
}

function AlignToNormal({
  position,
  normal,
  children,
}: {
  position: [number, number, number]
  normal?: [number, number, number] | null
  children: ReactNode
}) {
  const quaternion = useMemo(() => {
    const quat = new Quaternion()
    if (!normal) return quat
    const dir = new Vector3(...normal)
    if (dir.lengthSq() < 1e-8) return quat
    quat.setFromUnitVectors(new Vector3(0, 0, 1), dir.normalize())
    return quat
  }, [normal])
  return (
    <group position={position} quaternion={quaternion}>
      {children}
    </group>
  )
}

function closedRing(points: readonly [number, number, number][]): [number, number, number][] {
  if (!points.length) return []
  return [...points, points[0]]
}

function SurfacePin({
  position,
  color,
  radius = PIN_RADIUS,
  selected = false,
  onSelect,
}: {
  position: [number, number, number]
  color: string
  radius?: number
  selected?: boolean
  onSelect?: () => void
}) {
  const size = selected ? radius * 1.55 : radius
  return (
    <mesh
      position={position}
      raycast={onSelect ? undefined : () => null}
      onPointerDown={
        onSelect
          ? (event) => {
              event.stopPropagation()
            }
          : undefined
      }
      onClick={
        onSelect
          ? (event) => {
              event.stopPropagation()
              onSelect()
            }
          : undefined
      }
    >
      <sphereGeometry args={[size, 8, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

function MarkLabel({
  position,
  children,
  onSelect,
}: {
  position: [number, number, number]
  children: string
  onSelect?: () => void
}) {
  return (
    <Html
      position={position}
      pointerEvents={onSelect ? 'auto' : 'none'}
      occlude={false}
      wrapperClass="theme-webgl-toolkit__mark-label-wrap"
      className={
        onSelect ? 'theme-webgl-toolkit__mark-label theme-webgl-toolkit__mark-label--pick' : 'theme-webgl-toolkit__mark-label'
      }
    >
      <span
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        onPointerDown={
          onSelect
            ? (event) => {
                event.stopPropagation()
              }
            : undefined
        }
        onClick={
          onSelect
            ? (event) => {
                event.stopPropagation()
                onSelect()
              }
            : undefined
        }
      >
        {children}
      </span>
    </Html>
  )
}

function MarkPoint({
  position,
  color,
  label,
  showPoint = true,
  showLabel = true,
  selected = false,
  onSelect,
}: {
  position: [number, number, number]
  color: string
  label?: string
  showPoint?: boolean
  showLabel?: boolean
  selected?: boolean
  onSelect?: () => void
}) {
  return (
    <group>
      {showPoint ? (
        <SurfacePin position={position} color={color} selected={selected} onSelect={onSelect} />
      ) : onSelect ? (
        <SurfacePin position={position} color={color} radius={PIN_RADIUS * 1.8} selected={selected} onSelect={onSelect} />
      ) : null}
      {showLabel && label ? (
        <MarkLabel position={position} onSelect={onSelect}>
          {label}
        </MarkLabel>
      ) : null}
    </group>
  )
}

function HighlightPatch({
  position,
  normal,
  radius,
  color,
  label,
  showLabel = true,
}: {
  position: [number, number, number]
  normal?: [number, number, number] | null
  radius: number
  color: string
  label?: string
  showLabel?: boolean
}) {
  const scene = useThree((state) => state.scene)
  const lifted = stemTip(position, normal, SURFACE_LIFT)
  const size = clampHighlightRadius(radius)
  const inner = Math.max(size * 0.9, size - 0.0012)
  const ring = useMemo(() => {
    const root = findPickRoot(scene)
    if (!root) return null
    return surfaceCirclePoints(position, normal, size, 48, (from, dir) => {
      _from.set(from[0], from[1], from[2])
      _dir.set(dir[0], dir[1], dir[2])
      _ray.set(_from, _dir)
      const hit = firstMeshHit(_ray.intersectObject(root, true) as MeshPickHit[])
      if (!hit) return null
      return [hit.point.x, hit.point.y, hit.point.z]
    })
  }, [normal, position, scene, size])
  const fan = useMemo(() => {
    if (!ring || ring.length < 3) return null
    const geom = new BufferGeometry()
    geom.setFromPoints([new Vector3(...lifted), ...ring.map((point) => new Vector3(...point))])
    const idx: number[] = []
    for (let i = 1; i < ring.length; i++) idx.push(0, i, i + 1)
    idx.push(0, ring.length, 1)
    geom.setIndex(idx)
    geom.computeVertexNormals()
    return geom
  }, [lifted, ring])
  useEffect(() => () => fan?.dispose(), [fan])
  const fill = (
    <meshBasicMaterial
      color={color}
      transparent
      opacity={0.32}
      depthWrite={false}
      side={DoubleSide}
      polygonOffset
      polygonOffsetFactor={-4}
      polygonOffsetUnits={-4}
    />
  )
  return (
    <group>
      {fan ? (
        <mesh geometry={fan} raycast={() => null} renderOrder={8}>
          {fill}
        </mesh>
      ) : (
        <AlignToNormal position={lifted} normal={normal}>
          <mesh raycast={() => null} renderOrder={8}>
            <circleGeometry args={[size, 48]} />
            {fill}
          </mesh>
          <mesh raycast={() => null} renderOrder={9}>
            <ringGeometry args={[inner, size, 48]} />
            <meshBasicMaterial
              color={color}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-4}
              polygonOffsetUnits={-4}
            />
          </mesh>
        </AlignToNormal>
      )}
      {ring ? (
        <Line
          points={closedRing(ring)}
          color={color}
          lineWidth={1}
          worldUnits={false}
          raycast={() => null}
        />
      ) : null}
      {showLabel && label ? <MarkLabel position={lifted}>{label}</MarkLabel> : null}
    </group>
  )
}

function RegionPatch({
  ring,
  color,
  position,
  normal,
  label,
  showLabel = true,
}: {
  ring: readonly [number, number, number][]
  color: string
  position?: [number, number, number]
  normal?: [number, number, number] | null
  label?: string
  showLabel?: boolean
}) {
  const scene = useThree((state) => state.scene)
  const loop = useMemo(() => openRing(ring), [ring])
  const fan = useMemo(() => {
    if (loop.length < 3) return null
    const n = normal && Math.hypot(...normal) > 1e-8 ? normal : ringNewellNormal(loop)
    const c = ringCentroid(loop)
    if (!c) return null
    const root = findPickRoot(scene)
    let center = stemTip(c, n, SURFACE_LIFT)
    if (root) {
      const from = stemTip(c, n, 0.06)
      _from.set(from[0], from[1], from[2])
      _dir.set(-n[0], -n[1], -n[2])
      _ray.set(_from, _dir)
      const hit = firstMeshHit(_ray.intersectObject(root, true) as MeshPickHit[])
      if (hit) center = stemTip([hit.point.x, hit.point.y, hit.point.z], n, SURFACE_LIFT)
    }
    const geom = new BufferGeometry()
    geom.setFromPoints([new Vector3(...center), ...loop.map((point) => new Vector3(...point))])
    geom.setIndex(regionFanIndices(loop.length))
    geom.computeVertexNormals()
    return geom
  }, [loop, normal, scene])
  useEffect(() => () => fan?.dispose(), [fan])
  if (loop.length < 2) return null
  const labelAt = position ?? ringCentroid(loop) ?? loop[0]
  const labelN = normal ?? ringNewellNormal(loop)
  return (
    <group>
      {fan ? (
        <mesh geometry={fan} raycast={() => null} renderOrder={7}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.28}
            depthWrite={false}
            side={DoubleSide}
            polygonOffset
            polygonOffsetFactor={-4}
            polygonOffsetUnits={-4}
          />
        </mesh>
      ) : null}
      <Line
        points={closedRing(loop)}
        color={color}
        lineWidth={1}
        worldUnits={false}
        raycast={() => null}
      />
      {showLabel && label ? <MarkLabel position={stemTip(labelAt, labelN, SURFACE_LIFT)}>{label}</MarkLabel> : null}
    </group>
  )
}

function SurfaceCursor({ hit, color }: { hit: CursorHit; color: string }) {
  const pin = stemTip(hit.point, hit.normal, SURFACE_LIFT)
  const tip = stemTip(hit.point, hit.normal, CURSOR_STEM)
  return (
    <group>
      <mesh position={pin} raycast={() => null} renderOrder={20}>
        <sphereGeometry args={[CURSOR_RADIUS, 10, 10]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>
      <Line points={[pin, tip]} color={color} lineWidth={1} depthTest={false} raycast={() => null} />
    </group>
  )
}

export function AnnotationMarkers({
  annotations,
  draftRing = [],
  draftHighlight = null,
  cursorHit = null,
  draftColor = '#e879f9',
  showPoints = true,
  showLabels = true,
  selectedId = null,
  onSelect,
}: AnnotationMarkersProps) {
  return (
    <group>
      {annotations.map((mark) => {
        const color = markColor(mark)
        const select = onSelect ? () => onSelect(mark.id) : undefined
        const selected = selectedId === mark.id || (selectedId === VIEW_HOME_ID && mark.id === VIEW_HOME_MARK_ID)
        return (
          <group key={mark.id}>
            {mark.kind === 'highlight' ? (
              <HighlightPatch
                position={mark.position}
                normal={mark.normal}
                radius={mark.radius ?? HIGHLIGHT_MIN}
                color={color}
                label={mark.label}
                showLabel={showLabels}
              />
            ) : mark.kind === 'region' && mark.ring?.length ? (
              <RegionPatch
                ring={mark.ring}
                color={color}
                position={mark.position}
                normal={mark.normal}
                label={mark.label}
                showLabel={showLabels}
              />
            ) : (
              <MarkPoint
                position={mark.position}
                color={color}
                label={mark.label}
                showPoint={showPoints}
                showLabel={showLabels}
                selected={selected}
                onSelect={select}
              />
            )}
            {select && (mark.kind === 'highlight' || mark.kind === 'region') ? (
              <SurfacePin
                position={mark.position}
                color={color}
                selected={selected}
                onSelect={select}
              />
            ) : null}
          </group>
        )
      })}
      {draftHighlight ? (
        <HighlightPatch
          position={draftHighlight.position}
          normal={draftHighlight.normal}
          radius={draftHighlight.radius}
          color={draftColor}
          showLabel={false}
        />
      ) : null}
      {draftRing.length > 1 ? (
        <Line points={[...draftRing]} color={draftColor} lineWidth={1} worldUnits={false} raycast={() => null} />
      ) : null}
      {cursorHit ? <SurfaceCursor hit={cursorHit} color={draftColor} /> : null}
    </group>
  )
}
