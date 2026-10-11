import { useState } from 'react'
import { CssShape3dGallery } from '../CssShape3dGallery'
import { CssShape3dHost } from '../CssShape3dHost'
import { CssShape3dMenuCube } from '../CssShape3dMenuCube'
import { R3fShape3dGallery } from '../R3fShape3dGallery'
import { R3fShape3dHost } from '../R3fShape3dHost'
import { Shape3dHost } from '../Shape3dHost'
import { Shape3dIllustration } from '../Shape3dIllustration'
import { Select } from '../Select'
import { CSS_SHAPE3D_KIND_OPTIONS, cssShape3dFaceNavKind, type CssShape3dKind } from '../../lib/shape3d/cssShape3dTypes'
import {
  CSS_SHAPE3D_MENU_CUBE_FACE_OPTIONS,
  type CssShape3dMenuCubeRefFaceId,
} from '../../lib/shape3d/cssShape3dMenuCube'
import { R3F_SHAPE3D_EDGE_OPTIONS, r3fShape3dEdgesEnabled } from '../../lib/shape3d/r3fShape3dOptions'
import { SHAPE3D_FRAME } from '../../lib/shape3d/shape3dFrame'
import { shape3dDefaultFace } from '../../lib/shape3d/shape3dFaces'
import {
  SHAPE3D_KIND_OPTIONS,
  SHAPE3D_ROLE_OPTIONS,
  type Shape3dFaceId,
  type Shape3dHostRole,
  type Shape3dKind,
} from '../../lib/shape3d/shape3dTypes'

function PlaygroundPanel() {
  const [kind, setKind] = useState<Shape3dKind>('cube')
  const [face, setFace] = useState<Shape3dFaceId>(() => shape3dDefaultFace('cube'))

  function handleKindChange(nextKind: string) {
    const resolved = nextKind as Shape3dKind
    setKind(resolved)
    setFace(shape3dDefaultFace(resolved))
  }

  return (
    <section className="theme-shape3d__panel p-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Solid"
          value={kind}
          onChange={handleKindChange}
          options={SHAPE3D_KIND_OPTIONS}
        />
      </div>
      <Shape3dHost
        kind={kind}
        face={face}
        onFaceChange={setFace}
        title="Face navigation"
        subtitle="Each kind exposes navigable faces mapped to Zdog rotateX/Y in the shared isometric frame."
        autoSpin={false}
      />
    </section>
  )
}

function CssPlaygroundPanel() {
  const [kind, setKind] = useState<CssShape3dKind>('cube')
  const [face, setFace] = useState<Shape3dFaceId>(() => shape3dDefaultFace('cube'))

  function handleKindChange(value: string) {
    const nextKind = value as CssShape3dKind
    setKind(nextKind)
    setFace(shape3dDefaultFace(cssShape3dFaceNavKind(nextKind)))
  }

  return (
    <section className="theme-shape3d__panel p-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="CSS solid"
          value={kind}
          onChange={handleKindChange}
          options={CSS_SHAPE3D_KIND_OPTIONS}
        />
      </div>
      <CssShape3dHost
        kind={kind}
        face={face}
        onFaceChange={setFace}
        title="CSS face navigation"
        subtitle="Custom DOM preserve-3d solids — drag to orbit · shared face registry."
        autoSpin={false}
      />
    </section>
  )
}

function CssMenuCubePanel() {
  const [face, setFace] = useState<CssShape3dMenuCubeRefFaceId>('home')

  return (
    <section className="theme-shape3d__panel p-4 space-y-4 max-w-md">
      <Select
        label="Active face"
        value={face}
        onChange={(value) => setFace(value as CssShape3dMenuCubeRefFaceId)}
        options={CSS_SHAPE3D_MENU_CUBE_FACE_OPTIONS}
      />
      <CssShape3dMenuCube activeFace={face} mode="drag" size="md">
        {(faceId) => (
          <p className="theme-css-shape3d__menu-cube-face-label type-label type-muted mb-0">{faceId}</p>
        )}
      </CssShape3dMenuCube>
    </section>
  )
}

function CssShape3dShowcaseSection() {
  return (
    <>
      <section className="space-y-4 theme-shell-divider pt-10">
        <h3 className="type-label mb-0">CSS 3D shapes — preserve-3d</h3>
        <p className="type-body-sm type-muted mb-0 prose-measure">
          Custom DOM solids with theme palette faces — same nine Zdog kinds plus Rubik&apos;s cube.{' '}
          <code className="type-code">CssShape3dMenuCube</code> is the ref.3d-menu cube used by{' '}
          <code className="type-code">CubeMenu3d</code>.
        </p>
      </section>

      <section className="space-y-4">
        <h4 className="type-overline type-muted mb-0">Gallery</h4>
        <div className="theme-shape3d__panel">
          <CssShape3dGallery />
        </div>
      </section>

      <section className="space-y-4">
        <h4 className="type-overline type-muted mb-0">Menu cube</h4>
        <p className="type-body-sm type-muted mb-0 prose-measure">
          Six-face cube with DOM panels on each side — ref.3d-menu rotation map. Drag empty areas to
          orbit · use the face select or compose with <code className="type-code">CubeMenu3d</code>.
        </p>
        <CssMenuCubePanel />
      </section>

      <section className="space-y-4">
        <h4 className="type-overline type-muted mb-0">CSS face navigation</h4>
        <CssPlaygroundPanel />
      </section>
    </>
  )
}

function R3fPlaygroundPanel({ edges }: { edges: boolean }) {
  const [kind, setKind] = useState<CssShape3dKind>('cube')
  const [face, setFace] = useState<Shape3dFaceId>(() => shape3dDefaultFace('cube'))

  function handleKindChange(value: string) {
    const nextKind = value as CssShape3dKind
    setKind(nextKind)
    setFace(shape3dDefaultFace(cssShape3dFaceNavKind(nextKind)))
  }

  return (
    <section className="theme-shape3d__panel p-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="R3F solid"
          value={kind}
          onChange={handleKindChange}
          options={CSS_SHAPE3D_KIND_OPTIONS}
        />
      </div>
      <R3fShape3dHost
        kind={kind}
        face={face}
        onFaceChange={setFace}
        title="R3F face navigation"
        subtitle="WebGL meshes via React Three Fiber — drag to orbit · shared face registry."
        autoSpin={false}
        edges={edges}
      />
    </section>
  )
}

function R3fShowcaseSection() {
  const [edgeMode, setEdgeMode] = useState('on')
  const edges = r3fShape3dEdgesEnabled(edgeMode)

  return (
    <>
      <section className="space-y-4 theme-shell-divider pt-10">
        <h3 className="type-label mb-0">R3F 3D shapes — WebGL</h3>
        <p className="type-body-sm type-muted mb-0 prose-measure">
          React Three Fiber + drei primitives — smooth meshes, drag orbit, face navigation, and
          DOM-ready follow-ups via <code className="type-code">Html</code> overlays. Same nine solids
          as the Zdog ref plus Rubik&apos;s cube.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 max-w-md">
          <Select
            label="Face edges"
            value={edgeMode}
            onChange={setEdgeMode}
            options={R3F_SHAPE3D_EDGE_OPTIONS}
            hint="Wireframe facet lines on each mesh (`edges` prop)."
          />
        </div>
      </section>

      <section className="space-y-4">
        <h4 className="type-overline type-muted mb-0">Gallery</h4>
        <div className="theme-shape3d__panel">
          <R3fShape3dGallery edges={edges} />
        </div>
      </section>

      <section className="space-y-4">
        <h4 className="type-overline type-muted mb-0">Rubik&apos;s cube</h4>
        <div className="theme-shape3d__panel p-4 max-w-lg">
          <R3fShape3dHost
            kind="rubiks"
            title="Rubik's cube (3×3×3)"
            subtitle="27 cubelets · exterior stickers · layer twist animation next."
            autoSpin
            edges={edges}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h4 className="type-overline type-muted mb-0">R3F face navigation</h4>
        <R3fPlaygroundPanel edges={edges} />
      </section>
    </>
  )
}

function RoleDemos() {
  const roles = SHAPE3D_ROLE_OPTIONS.filter((option) => option.value !== 'neutral')

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">
      {roles.map((roleOption) => {
        const role = roleOption.value as Exclude<Shape3dHostRole, 'neutral'>
        const kind: Shape3dKind =
          role === 'card' ? 'cube' : role === 'button' ? 'octahedron' : 'dodecahedron'
        const face = shape3dDefaultFace(kind)

        return (
          <li key={role}>
            <Shape3dHost
              role={role}
              kind={kind}
              face={face}
              title={roleOption.label}
              subtitle={
                role === 'card'
                  ? 'Card shell — cube front face'
                  : role === 'button'
                    ? 'Button tile — octahedron top'
                    : 'Data readout — dodecahedron cap'
              }
              metric={role === 'display' ? '12.4k' : undefined}
            />
          </li>
        )
      })}
    </ul>
  )
}

export function Shape3dShowcase() {
  return (
    <div className="space-y-10">
      <div className="space-y-3 prose-measure">
        <p className="type-body-sm type-muted mb-0">
          Zdog solids as a standalone visual system — usable in place of cards, button tiles, or
          metric displays. Drag to orbit · auto-spin in the gallery. Face navigation tweens each
          solid toward preset views aligned with{' '}
          <code className="type-code">{SHAPE3D_FRAME.viewerAxis}</code> viewer axis and{' '}
          <code className="type-code">{SHAPE3D_FRAME.screenPlane}</code> screen plane from the
          isometric coordinate context.
        </p>
      </div>

      <section className="space-y-4">
        <h3 className="type-label mb-0">Gallery — ref.3d-shapes-1</h3>
        <div className="theme-shape3d__panel theme-shape3d__gallery">
          <Shape3dIllustration kind="cube" mode="gallery" autoSpin drag size="lg" />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="type-label mb-0">Face navigation</h3>
        <PlaygroundPanel />
      </section>

      <section className="space-y-4">
        <h3 className="type-label mb-0">Host roles</h3>
        <p className="type-body-sm type-muted mb-0 prose-measure">
          <strong>Card</strong>, <strong>button</strong>, and <strong>display</strong> shells wrap
          the canvas with theme borders and typography slots — compose with real Card/Button later.
        </p>
        <RoleDemos />
      </section>

      <CssShape3dShowcaseSection />

      <R3fShowcaseSection />
    </div>
  )
}
