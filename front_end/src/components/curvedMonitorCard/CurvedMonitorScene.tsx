import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, useTexture } from '@react-three/drei'
import {
  BackSide,
  ClampToEdgeWrapping,
  PlaneGeometry,
  SRGBColorSpace,
  Vector2,
  type Group,
  type MeshBasicMaterial,
  type Texture,
} from 'three'

type Shader = {
  vertexShader: string
  fragmentShader: string
  uniforms: Record<string, unknown>
}
import {
  bentCardZAt,
  CURVED_MONITOR_MEDIA_FADE_MS,
  curvedMonitorLayout,
  flexCurvature,
  flexToward,
  mediaCrossfadeOpacity,
  type CurvedMonitorTilt,
} from '../../lib/shape3d/curvedMonitor'

type CurvedMonitorSceneProps = {
  src: string
  incomingSrc?: string | null
  onFxComplete?: () => void
  tiltRef: RefObject<CurvedMonitorTilt>
  curvature: number
  curve: number
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function applyBend(
  geometry: PlaneGeometry,
  radius: number,
  curvature: number,
  sagitta: number,
  zShift: number,
) {
  const pos = geometry.attributes.position
  for (let i = 0; i < pos.count; i += 1) {
    pos.setZ(i, bentCardZAt(pos.getX(i), radius, curvature, sagitta) + zShift)
  }
  pos.needsUpdate = true
  geometry.computeVertexNormals()
}

function patchRoundedClip(shader: Shader, uHalf: { value: Vector2 }, uCorner: { value: number }) {
  shader.uniforms.uHalf = uHalf
  shader.uniforms.uCorner = uCorner
  shader.vertexShader = `varying vec2 vCardXY;\n${shader.vertexShader}`.replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
     vCardXY = position.xy;`,
  )
  shader.fragmentShader = `varying vec2 vCardXY;
uniform vec2 uHalf;
uniform float uCorner;
${shader.fragmentShader}`.replace(
    '#include <clipping_planes_fragment>',
    `#include <clipping_planes_fragment>
     vec2 q = abs(vCardXY) - (uHalf - vec2(uCorner));
     vec2 qn = max(q, 0.0);
     float d = pow(pow(qn.x, 4.0) + pow(qn.y, 4.0), 0.25) + min(max(q.x, q.y), 0.0) - uCorner;
     if (d > fwidth(d)) discard;`,
  )
}

function prepareTexture(texture: Texture) {
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.anisotropy = 8
}

function applyFaceFade(
  outgoing: MeshBasicMaterial | null,
  incoming: MeshBasicMaterial | null,
  progress: number,
) {
  const { outgoing: outOpacity, incoming: inOpacity } = mediaCrossfadeOpacity(progress)
  if (outgoing) outgoing.opacity = outOpacity
  if (incoming) incoming.opacity = inOpacity
}

export function CurvedMonitorScene({
  src,
  incomingSrc = null,
  onFxComplete,
  tiltRef,
  curvature,
  curve,
}: CurvedMonitorSceneProps) {
  const tiltGroupRef = useRef<Group>(null)
  const outgoingMatRef = useRef<MeshBasicMaterial>(null)
  const incomingMatRef = useRef<MeshBasicMaterial>(null)
  const fadeRef = useRef({ playing: false, startedAt: 0, done: false })
  const liveCurvature = useRef(curvature)
  const liveCurve = useRef(curve)
  const invalidate = useThree((state) => state.invalidate)
  const layout = useMemo(() => curvedMonitorLayout(), [])
  const outgoingTex = useTexture(src)
  const incomingTex = useTexture(incomingSrc ?? src)
  prepareTexture(outgoingTex)
  prepareTexture(incomingTex)

  const playing = Boolean(incomingSrc && incomingSrc !== src)

  useEffect(() => {
    invalidate()
  }, [invalidate, src, incomingSrc, outgoingTex, incomingTex])

  const clip = useMemo(
    () => ({
      uHalf: { value: new Vector2(layout.width / 2, layout.height / 2) },
      uCorner: { value: layout.corner },
    }),
    [layout],
  )

  const { face, back } = useMemo(() => {
    const faceGeo = new PlaneGeometry(layout.width, layout.height, layout.widthSegs, layout.heightSegs)
    const backGeo = new PlaneGeometry(layout.width, layout.height, layout.widthSegs, layout.heightSegs)
    return { face: faceGeo, back: backGeo }
  }, [layout])

  useEffect(() => {
    return () => {
      face.dispose()
      back.dispose()
    }
  }, [face, back])

  useLayoutEffect(() => {
    const outgoing = outgoingMatRef.current
    const incoming = incomingMatRef.current
    if (!playing) {
      fadeRef.current = { playing: false, startedAt: 0, done: false }
      applyFaceFade(outgoing, incoming, 0)
      return
    }
    if (prefersReducedMotion()) {
      applyFaceFade(outgoing, incoming, 1)
      onFxComplete?.()
      return
    }
    fadeRef.current = { playing: true, startedAt: performance.now(), done: false }
    applyFaceFade(outgoing, incoming, 0)
  }, [playing, onFxComplete, src, incomingSrc])

  useFrame((_, delta) => {
    const snap = prefersReducedMotion()
    liveCurvature.current = flexCurvature(liveCurvature.current, curvature, delta, undefined, snap)
    liveCurve.current = flexToward(liveCurve.current, curve, delta, undefined, snap)
    const bent = curvedMonitorLayout(layout.height, layout.aspect, liveCurve.current)
    applyBend(face, bent.radius, liveCurvature.current, bent.sagitta, 0)
    applyBend(back, bent.radius, liveCurvature.current, bent.sagitta, -layout.thickness)

    const fade = fadeRef.current
    if (fade.playing && !fade.done) {
      const progress = (performance.now() - fade.startedAt) / CURVED_MONITOR_MEDIA_FADE_MS
      applyFaceFade(outgoingMatRef.current, incomingMatRef.current, progress)
      if (progress >= 1) {
        fade.done = true
        fade.playing = false
        onFxComplete?.()
      }
    }

    const group = tiltGroupRef.current
    const tilt = tiltRef.current
    if (!group || !tilt) return
    const targetY = tilt.hover ? tilt.x * 0.22 : 0
    const targetX = tilt.hover ? tilt.y * -0.1 : 0
    const step = 1 - Math.exp(-8 * delta)
    group.rotation.y += (targetY - group.rotation.y) * step
    group.rotation.x += (targetX - group.rotation.x) * step
  })

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, layout.cameraZ]} fov={layout.fov} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[1.6, 2.2, 3.4]} intensity={1.15} />
      <directionalLight position={[-2.2, 0.6, 2.4]} intensity={0.32} color="#c8d4ff" />
      <group ref={tiltGroupRef}>
        <mesh geometry={back} renderOrder={0}>
          <meshStandardMaterial
            color="#121318"
            side={BackSide}
            roughness={0.62}
            metalness={0.08}
            onBeforeCompile={(shader) => patchRoundedClip(shader, clip.uHalf, clip.uCorner)}
            customProgramCacheKey={() => 'curved-card-back'}
          />
        </mesh>
        <mesh geometry={face} renderOrder={1}>
          <meshBasicMaterial
            ref={outgoingMatRef}
            map={outgoingTex}
            transparent
            opacity={1}
            depthWrite={false}
            toneMapped={false}
            onBeforeCompile={(shader) => patchRoundedClip(shader, clip.uHalf, clip.uCorner)}
            customProgramCacheKey={() => 'curved-card-face'}
          />
        </mesh>
        <mesh geometry={face} renderOrder={2} visible={playing}>
          <meshBasicMaterial
            ref={incomingMatRef}
            map={incomingTex}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
            onBeforeCompile={(shader) => patchRoundedClip(shader, clip.uHalf, clip.uCorner)}
            customProgramCacheKey={() => 'curved-card-face-in'}
          />
        </mesh>
      </group>
    </>
  )
}
