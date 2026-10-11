/**
 * Scene camera look: depth of field + edge vignette + grain.
 * Composer mounts only when focus or grain is on.
 */
import { useEffect, useMemo, useRef, type ReactElement } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, DepthOfField, Vignette } from '@react-three/postprocessing'
import { Effect } from 'postprocessing'
import { Uniform, Vector3 } from 'three'
import type { DepthOfFieldEffect } from 'postprocessing'
import type { SceneCameraLook } from '../../assets/sceneDoc'
import { dofFromLook, lookNeedsComposer, noiseKindIndex } from './cameraLook'

const grainShader = /* glsl */ `
uniform float amount;
uniform float kind;
uniform float time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float n = 0.0;
  if (kind < 1.5) {
    n = hash(uv * resolution.xy + floor(time * 24.0)) - 0.5;
    float luma = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));
    n *= mix(1.0, luma, 0.55);
  } else if (kind < 2.5) {
    n = hash(uv * resolution.xy + time * 60.0) - 0.5;
  } else {
    n = valueNoise(uv * 220.0 + time * 0.18) * 0.7 + valueNoise(uv * 510.0 - time * 0.11) * 0.3 - 0.5;
  }
  outputColor = vec4(inputColor.rgb + n * amount, inputColor.a);
}
`

class CameraLookGrainEffect extends Effect {
  constructor(amount: number, kind: number) {
    super('CameraLookGrain', grainShader, {
      uniforms: new Map<string, Uniform>([
        ['amount', new Uniform(amount)],
        ['kind', new Uniform(kind)],
        ['time', new Uniform(0)],
      ]),
    })
  }

  setAmount(value: number) {
    this.uniforms.get('amount')!.value = value
  }

  setKind(value: number) {
    this.uniforms.get('kind')!.value = value
  }

  setTime(value: number) {
    this.uniforms.get('time')!.value = value
  }
}

function CameraLookGrain({ amount, kind }: { amount: number; kind: number }) {
  const effect = useMemo(() => new CameraLookGrainEffect(amount, kind), [amount, kind])
  useEffect(() => {
    effect.setAmount(amount)
    effect.setKind(kind)
  }, [amount, effect, kind])
  useFrame((state) => {
    effect.setTime(state.clock.elapsedTime)
  })
  return <primitive object={effect} dispose={null} />
}

type OrbitTarget = {
  target: { x: number; y: number; z: number }
}

type CameraLookRigProps = {
  look: SceneCameraLook
}

export function CameraLookRig({ look }: CameraLookRigProps) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)
  const dofRef = useRef<DepthOfFieldEffect>(null)
  const focusPoint = useRef(new Vector3())
  const knobs = dofFromLook(look)
  const grainOn = look.noise !== 'off' && look.grain > 0
  const dofOn = look.focus > 0

  useFrame(() => {
    const effect = dofRef.current
    if (!effect || !dofOn) return
    const orbit = controls && typeof controls === 'object' && 'target' in controls ? (controls as OrbitTarget) : null
    if (look.focalDistance > 0) {
      effect.target = null
      effect.cocMaterial.worldFocusDistance = look.focalDistance
      return
    }
    if (orbit?.target) {
      focusPoint.current.set(orbit.target.x, orbit.target.y, orbit.target.z)
      effect.target = focusPoint.current
      return
    }
    effect.cocMaterial.worldFocusDistance = camera.position.length()
  })

  if (!lookNeedsComposer(look)) return null

  const passes: ReactElement[] = []
  if (dofOn) {
    passes.push(
      <DepthOfField
        key="dof"
        ref={dofRef}
        bokehScale={knobs.bokehScale}
        focusRange={knobs.focusRange}
        worldFocusDistance={look.focalDistance > 0 ? look.focalDistance : undefined}
      />,
    )
  }
  if (dofOn && knobs.vignetteDarkness > 0.001) {
    passes.push(
      <Vignette key="vignette" offset={knobs.vignetteOffset} darkness={knobs.vignetteDarkness} />,
    )
  }
  if (grainOn) {
    passes.push(
      <CameraLookGrain key="grain" amount={look.grain * 0.28} kind={noiseKindIndex(look.noise)} />,
    )
  }

  return (
    <EffectComposer multisampling={0} enableNormalPass={false} depthBuffer>
      {passes}
    </EffectComposer>
  )
}
