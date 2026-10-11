import { VurifyIcon } from './VurifyIcon'
import { resolveWireframeFill } from '../lib/wireframes/wireframeFills'
import { WIREFRAME_ICON_MAP, type WireframeIconId } from '../lib/wireframes/wireframeIcons'
import type {
  WireframeBlockDef,
  WireframeBlockTone,
  WireframeLayout,
  WireframeMicroGrid,
} from '../lib/wireframes/wireframeTypes'

function parseAreaNames(areas: readonly string[]): string[] {
  return [...new Set(areas.join(' ').split(/\s+/).filter((name) => name && name !== '.'))]
}

function typeClassForTone(tone: WireframeBlockTone | undefined): string {
  switch (tone) {
    case 'hero':
      return 'type-h4'
    case 'badge':
      return 'type-overline'
    case 'cta':
      return 'type-label'
    case 'stat':
      return 'type-h5 type-tabular'
    case 'muted':
    case 'footer':
      return 'type-caption type-muted'
    case 'quote':
      return 'type-body-sm'
    default:
      return 'type-caption'
  }
}

type FilledCellProps = {
  copy?: string
  iconId?: WireframeIconId
  icons?: readonly WireframeIconId[]
  skeleton?: boolean
  tone?: WireframeBlockTone
  compact?: boolean
}

function SkeletonLines() {
  return (
    <span className="theme-wireframe__skeleton" aria-hidden>
      <span className="theme-wireframe__skeleton-line theme-wireframe__skeleton-line--wide" />
      <span className="theme-wireframe__skeleton-line theme-wireframe__skeleton-line--mid" />
      <span className="theme-wireframe__skeleton-line theme-wireframe__skeleton-line--short" />
    </span>
  )
}

function FilledCell({ copy, iconId, icons, skeleton = false, tone, compact = false }: FilledCellProps) {
  if (skeleton) {
    return <SkeletonLines />
  }

  if (icons && icons.length > 0) {
    return (
      <span className="theme-wireframe__fill theme-wireframe__fill--icons">
        {icons.map((id) => {
          const Icon = WIREFRAME_ICON_MAP[id]
          return <VurifyIcon key={id} icon={Icon} size="sm" tone="accent" variant="plain" />
        })}
      </span>
    )
  }

  const Icon = iconId ? WIREFRAME_ICON_MAP[iconId] : null
  if (!copy && !Icon) return null

  return (
    <span className={['theme-wireframe__fill', compact ? 'theme-wireframe__fill--compact' : ''].filter(Boolean).join(' ')}>
      {Icon ? <VurifyIcon icon={Icon} size="sm" tone="accent" variant="plain" /> : null}
      {copy ? (
        <span className={['theme-wireframe__fill-copy', typeClassForTone(tone)].filter(Boolean).join(' ')}>{copy}</span>
      ) : null}
    </span>
  )
}

type WireframeMicroBlockProps = {
  layoutId: string
  parentArea: string
  area: string
  label: string
  tone?: WireframeBlockTone
  filled?: boolean
}

function WireframeMicroBlock({
  layoutId,
  parentArea,
  area,
  label,
  tone = 'main',
  filled = false,
}: WireframeMicroBlockProps) {
  const fill = filled ? resolveWireframeFill(layoutId, parentArea, area) : undefined

  return (
    <div
      className={['theme-wireframe__micro-block', `theme-wireframe__micro-block--${tone}`]
        .filter(Boolean)
        .join(' ')}
      style={{ gridArea: area }}
    >
      {filled ? (
        <FilledCell
          copy={fill?.copy}
          iconId={fill?.icon}
          icons={fill?.icons}
          skeleton={fill?.skeleton}
          tone={tone}
          compact
        />
      ) : (
        <span className="theme-wireframe__micro-label type-caption">{label}</span>
      )}
    </div>
  )
}

function WireframeMicroGridView({
  layoutId,
  parentArea,
  micro,
  filled,
}: {
  layoutId: string
  parentArea: string
  micro: WireframeMicroGrid
  filled?: boolean
}) {
  const areaNames = parseAreaNames(micro.areas)

  return (
    <div
      className="theme-wireframe__micro"
      style={{
        gridTemplateColumns: micro.columns,
        gridTemplateRows: micro.rows,
        gridTemplateAreas: micro.areas.map((line) => `"${line}"`).join(' '),
      }}
    >
      {areaNames.map((area) => {
        const block = micro.blocks[area]
        if (!block) return null
        return (
          <WireframeMicroBlock
            key={area}
            layoutId={layoutId}
            parentArea={parentArea}
            area={area}
            filled={filled}
            {...block}
          />
        )
      })}
    </div>
  )
}

type WireframeBlockProps = WireframeBlockDef & {
  layoutId: string
  area: string
  showLabel?: boolean
  filled?: boolean
}

function WireframeBlock({
  layoutId,
  area,
  label,
  hint,
  tone = 'main',
  micro,
  showLabel = true,
  filled = false,
}: WireframeBlockProps) {
  const fill = filled && !micro ? resolveWireframeFill(layoutId, area) : undefined

  return (
    <div
      className={['theme-wireframe__block', `theme-wireframe__block--${tone}`, micro ? 'theme-wireframe__block--has-micro' : '']
        .filter(Boolean)
        .join(' ')}
      style={{ gridArea: area }}
    >
      {micro ? (
        <WireframeMicroGridView layoutId={layoutId} parentArea={area} micro={micro} filled={filled} />
      ) : filled ? (
        <FilledCell
          copy={fill?.copy}
          iconId={fill?.icon}
          icons={fill?.icons}
          skeleton={fill?.skeleton}
          tone={tone}
        />
      ) : (
        <>
          {showLabel ? <span className="theme-wireframe__label type-caption">{label}</span> : null}
          {hint ? <span className="theme-wireframe__hint type-caption type-faint">{hint}</span> : null}
        </>
      )}
    </div>
  )
}

type WireframePreviewProps = {
  layout: WireframeLayout
  compact?: boolean
  /** Dense thumb for catalog cards (template panel, etc.). */
  thumb?: boolean
  /** Populate boxes with copy + icons — Theme Mockups. */
  filled?: boolean
}

export function WireframePreview({
  layout,
  compact = false,
  thumb = false,
  filled = false,
}: WireframePreviewProps) {
  const areaNames = parseAreaNames(layout.areas)
  const frame = layout.frame ?? (layout.tier === 'section' ? 'section' : 'default')
  const showFilled = filled && !thumb

  return (
    <div className="theme-wireframe-wrap">
      {layout.sectionTag && !thumb && !showFilled ? (
        <span className="theme-wireframe__tag type-overline">{layout.sectionTag}</span>
      ) : null}
      <div
        className={[
          'theme-wireframe',
          `theme-wireframe--${frame}`,
          layout.tier === 'section' ? 'theme-wireframe--tier-section' : 'theme-wireframe--tier-page',
          compact ? 'theme-wireframe--compact' : '',
          thumb ? 'theme-wireframe--thumb' : '',
          showFilled ? 'theme-wireframe--filled' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          gridTemplateColumns: layout.columns,
          gridTemplateRows: layout.rows,
          gridTemplateAreas: layout.areas.map((line) => `"${line}"`).join(' '),
        }}
        aria-label={`${layout.name} ${showFilled ? 'mockup' : 'wireframe'}`}
        role="img"
      >
        {areaNames.map((area) => {
          const block = layout.blocks[area]
          if (!block) return null
          return (
            <WireframeBlock
              key={area}
              layoutId={layout.id}
              area={area}
              filled={showFilled}
              {...block}
              showLabel={!thumb || !block.micro}
            />
          )
        })}
      </div>
    </div>
  )
}
