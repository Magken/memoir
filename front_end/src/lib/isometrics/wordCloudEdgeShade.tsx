/**
 * Screen-space radial edge shade for the isometric word cloud.
 * Softens and fog-tints outward from V so peripheral words blend into the stage.
 */
import { forwardRef, useEffect, useMemo } from 'react'
import { Color, Uniform, Vector2 } from 'three'
import { Effect } from 'postprocessing'

const fragmentShader = /* glsl */ `
uniform float intensity;
uniform float softness;
uniform float blurScale;
uniform vec3 shadeColor;
uniform vec2 center;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float d = distance(uv, center);
  float falloff = smoothstep(softness * 0.2, softness, d);
  float amount = clamp(falloff * intensity, 0.0, 1.0);

  vec4 color = inputColor;
  if (amount > 0.001 && blurScale > 0.0) {
    vec2 px = blurScale * amount / resolution;
    color = (
      inputColor +
      texture2D(inputBuffer, uv + vec2(px.x, 0.0)) +
      texture2D(inputBuffer, uv - vec2(px.x, 0.0)) +
      texture2D(inputBuffer, uv + vec2(0.0, px.y)) +
      texture2D(inputBuffer, uv - vec2(0.0, px.y)) +
      texture2D(inputBuffer, uv + px) +
      texture2D(inputBuffer, uv - px) +
      texture2D(inputBuffer, uv + vec2(px.x, -px.y)) +
      texture2D(inputBuffer, uv + vec2(-px.x, px.y))
    ) * 0.111111;
  }

  outputColor = vec4(mix(color.rgb, shadeColor, amount), inputColor.a);
}
`

type WordCloudEdgeShadeEffectProps = {
  intensity?: number
  softness?: number
  blurScale?: number
  shadeColor?: string
  center?: Vector2
}

export class WordCloudEdgeShadeEffect extends Effect {
  readonly center: Vector2

  constructor({
    intensity = 0.55,
    softness = 0.9,
    blurScale = 3,
    shadeColor = '#ffffff',
    center = new Vector2(0.5, 0.5),
  }: WordCloudEdgeShadeEffectProps = {}) {
    super('WordCloudEdgeShade', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['intensity', new Uniform(intensity)],
        ['softness', new Uniform(softness)],
        ['blurScale', new Uniform(blurScale)],
        ['shadeColor', new Uniform(new Color(shadeColor))],
        ['center', new Uniform(center)],
      ]),
    })
    this.center = center
  }

  setIntensity(value: number) {
    this.uniforms.get('intensity')!.value = value
  }

  setSoftness(value: number) {
    this.uniforms.get('softness')!.value = value
  }

  setBlurScale(value: number) {
    this.uniforms.get('blurScale')!.value = value
  }

  setShadeColor(value: string) {
    ;(this.uniforms.get('shadeColor')!.value as Color).set(value)
  }
}

export type WordCloudEdgeShadeProps = {
  intensity?: number
  softness?: number
  blurScale?: number
  shadeColor?: string
  center?: Vector2
}

/** R3F effect primitive for EffectComposer. */
export const WordCloudEdgeShade = forwardRef<WordCloudEdgeShadeEffect, WordCloudEdgeShadeProps>(
  function WordCloudEdgeShade(
    {
      intensity = 0.55,
      softness = 0.9,
      blurScale = 3,
      shadeColor = '#ffffff',
      center,
    },
    ref,
  ) {
    const effect = useMemo(
      () =>
        new WordCloudEdgeShadeEffect({
          intensity,
          softness,
          blurScale,
          shadeColor,
          center: center ?? new Vector2(0.5, 0.5),
        }),
      // Recreate when structural knobs change; live center is mutated in-place by the scene.
      // eslint-disable-next-line react-hooks/exhaustive-deps -- center vector identity is intentional
      [intensity, softness, blurScale, shadeColor],
    )

    useEffect(() => {
      effect.setIntensity(intensity)
      effect.setSoftness(softness)
      effect.setBlurScale(blurScale)
      effect.setShadeColor(shadeColor)
    }, [blurScale, effect, intensity, shadeColor, softness])

    return <primitive ref={ref} object={effect} dispose={null} />
  },
)
