import { forwardRef, useLayoutEffect, useMemo, useRef, type Ref } from 'react'
import { Box3, ShaderMaterial, Vector2, type Group, type PerspectiveCamera } from 'three'
import type { Object3D } from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGltfAsset } from '../../lib/webgl/runtime/assets/useGltfAsset'
import { splatBounds } from '../../lib/webgl/runtime/assets/decodeSplat'
import { useSplatAsset } from '../../lib/webgl/runtime/assets/useSplatAsset'
import { createSplatMesh, disposeSplatMesh, sortSplatMesh } from '../../lib/webgl/runtime/assets/splatMesh'
import { normalizeModelTransform } from '../../lib/webgl/runtime/assets/normalizeModel'
import type { UpAxis } from '../../lib/webgl/runtime/assets/normalizeModel'
import { applyWireframe } from '../../lib/webgl/runtime/materials/applyWireframe'
import { installDoubleSideMeshPick } from '../../lib/webgl/runtime/interaction/cameraPick'
import { applyMeshPoly, type MeshPolyOriginals } from '../../lib/webgl/runtime/assets/meshPoly'
import { POLY_DEFAULT } from '../../lib/webgl/runtime/interaction/markStem'

type PointerHandler = (event: ThreeEvent<PointerEvent>) => void

type SubjectPointers = {
  onPointerDown?: PointerHandler
  onPointerMove?: PointerHandler
  onPointerLeave?: PointerHandler
  onPointerUp?: PointerHandler
}

type PrimitiveBoxProps = SubjectPointers

export const PRIMITIVE_BOX_SIZE = 1

export const PrimitiveBox = forwardRef<Group, PrimitiveBoxProps>(function PrimitiveBox(
  { onPointerDown, onPointerMove, onPointerLeave, onPointerUp },
  ref: Ref<Group>,
) {
  const rootRef = useRef<Group>(null)

  useLayoutEffect(() => {
    const node = rootRef.current
    if (!node) return
    applyWireframe(node, 'builtin-box')
  }, [])

  return (
    <group
      ref={(node) => {
        rootRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      userData={{ webglPickRoot: true }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerUp={onPointerUp}
    >
      <mesh castShadow receiveShadow position={[0, PRIMITIVE_BOX_SIZE / 2, 0]}>
        <boxGeometry args={[PRIMITIVE_BOX_SIZE, PRIMITIVE_BOX_SIZE, PRIMITIVE_BOX_SIZE]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.15} roughness={0.45} />
      </mesh>
    </group>
  )
})

type GltfSubjectProps = SubjectPointers & {
  url: string
  assetId: string
  upAxis?: UpAxis
  /** 1–8 rendered polygon count. 5 is the original mesh. */
  poly?: number
}

export const GltfSubject = forwardRef<Group, GltfSubjectProps>(function GltfSubject(
  { url, assetId, upAxis = 'y', poly = POLY_DEFAULT, onPointerDown, onPointerMove, onPointerLeave, onPointerUp },
  ref: Ref<Group>,
) {
  const { scene } = useGltfAsset(url)
  const clone = useMemo(() => scene.clone(true), [scene])
  const polyOriginals = useRef<MeshPolyOriginals>(new Map())
  const xform = useMemo(() => {
    const box = new Box3().setFromObject(clone)
    return normalizeModelTransform(
      {
        min: [box.min.x, box.min.y, box.min.z],
        max: [box.max.x, box.max.y, box.max.z],
      },
      { upAxis, targetSize: 1.4 },
    )
  }, [clone, upAxis])

  useLayoutEffect(() => {
    clone.traverse((obj) => {
      const mesh = obj as Object3D & { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean }
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
    installDoubleSideMeshPick(clone)
  }, [clone])

  useLayoutEffect(() => {
    polyOriginals.current = new Map()
  }, [clone])

  useLayoutEffect(() => {
    applyMeshPoly(clone, poly, polyOriginals.current)
  }, [clone, poly])

  useLayoutEffect(() => {
    applyWireframe(clone, assetId)
  }, [clone, assetId])

  return (
    <group
      ref={ref}
      userData={{ webglPickRoot: true }}
      position={xform.position}
      scale={xform.scale}
      rotation={xform.rotation}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerUp={onPointerUp}
    >
      <primitive object={clone} />
    </group>
  )
})

type SplatSubjectProps = SubjectPointers & {
  url: string
  upAxis?: UpAxis
}

export const SplatSubject = forwardRef<Group, SplatSubjectProps>(function SplatSubject(
  { url, upAxis = 'y', onPointerDown, onPointerMove, onPointerLeave, onPointerUp },
  ref: Ref<Group>,
) {
  const cloud = useSplatAsset(url)
  const rootRef = useRef<Group>(null)
  const bounds = useMemo(() => splatBounds(cloud), [cloud])
  const mesh = useMemo(() => createSplatMesh(cloud), [cloud])
  const drawSize = useRef(new Vector2())
  const clipFitted = useRef(false)
  const rotation: [number, number, number] = upAxis === 'z' ? [-Math.PI / 2, 0, 0] : [0, 0, 0]
  const pick = useMemo(() => {
    const size: [number, number, number] = [
      Math.max(bounds.max[0] - bounds.min[0], 0.001),
      Math.max(bounds.max[1] - bounds.min[1], 0.001),
      Math.max(bounds.max[2] - bounds.min[2], 0.001),
    ]
    const position: [number, number, number] = [
      (bounds.min[0] + bounds.max[0]) / 2,
      (bounds.min[1] + bounds.max[1]) / 2,
      (bounds.min[2] + bounds.max[2]) / 2,
    ]
    return { size, position }
  }, [bounds])

  useLayoutEffect(() => () => disposeSplatMesh(mesh), [mesh])

  useFrame(({ camera, gl }) => {
    const root = rootRef.current
    if (!root) return
    const perspective = camera as PerspectiveCamera
    if (!clipFitted.current && perspective.isPerspectiveCamera) {
      const span = Math.max(
        bounds.max[0] - bounds.min[0],
        bounds.max[1] - bounds.min[1],
        bounds.max[2] - bounds.min[2],
        1,
      )
      perspective.near = 0.05
      perspective.far = span * 4
      perspective.updateProjectionMatrix()
      clipFitted.current = true
    }
    const material = mesh.material
    if (material instanceof ShaderMaterial && material.uniforms.viewport) {
      gl.getDrawingBufferSize(drawSize.current)
      material.uniforms.viewport.value.copy(drawSize.current)
    }
    root.updateWorldMatrix(true, true)
    sortSplatMesh(mesh, camera)
  })

  return (
    <group
      ref={(node) => {
        rootRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      userData={{ webglPickRoot: true }}
      rotation={rotation}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerUp={onPointerUp}
    >
      <primitive object={mesh} />
      <mesh position={pick.position}>
        <boxGeometry args={pick.size} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  )
})
