import { Tag } from './Tag'
import { TypeAnimText } from './TypeAnimText'
import { VurifyIcon } from './VurifyIcon'
import { useMockupMotionLoop, type MockupMotionId } from '../lib/mockups/motions'
import type { MockupBox, MockupItem, MockupScene, MockupSceneLayout } from '../lib/mockups/scenes'
import { WIREFRAME_ICON_MAP } from '../lib/wireframes/wireframeIcons'

type MockupPreviewProps = {
  scene: MockupScene
  motion?: MockupMotionId | null
}

const GRID: Record<MockupSceneLayout, string> = {
  stack: 'theme-mockup-scene__grid--stack',
  split: 'theme-mockup-scene__grid--split',
  trio: 'theme-mockup-scene__grid--trio',
  beats: 'theme-mockup-scene__grid--beats',
  band: 'theme-mockup-scene__grid--band',
}

function SkeletonLines({ lines = 3 }: { lines?: 2 | 3 }) {
  const widths = lines === 2 ? (['wide', 'mid'] as const) : (['wide', 'mid', 'short'] as const)
  return (
    <span className="theme-wireframe__skeleton" aria-hidden>
      {widths.map((width) => (
        <span
          key={width}
          className={`theme-wireframe__skeleton-line theme-wireframe__skeleton-line--${width}`}
        />
      ))}
    </span>
  )
}

function AnimatedLine({
  text,
  motion,
  cycle,
  className,
}: {
  text: string
  motion?: MockupMotionId | null
  cycle: number
  className: string
}) {
  if (motion === 'type') {
    return (
      <TypeAnimText
        key={`type-${cycle}-${text}`}
        anim="fade"
        trigger="enter"
        split="line"
        className={className}
      >
        {text}
      </TypeAnimText>
    )
  }

  if (motion === 'rise') {
    return (
      <TypeAnimText
        key={`rise-${cycle}-${text}`}
        anim="reveal-up"
        trigger="enter"
        split="line"
        className={className}
      >
        {text}
      </TypeAnimText>
    )
  }

  return <span className={className}>{text}</span>
}

function MockupItemView({
  item,
  motion,
  cycle,
}: {
  item: MockupItem
  motion?: MockupMotionId | null
  cycle: number
}) {
  if (item.kind === 'divider') {
    return <span className="theme-mockup-scene__divider" aria-hidden />
  }

  if (item.kind === 'skeleton') {
    return <SkeletonLines lines={item.lines} />
  }

  if (item.kind === 'tags') {
    return (
      <span className="theme-mockup-scene__tags">
        {item.tags.map((tag) => (
          <Tag key={tag} size="xs">
            {tag}
          </Tag>
        ))}
      </span>
    )
  }

  if (item.kind === 'copy') {
    return (
      <AnimatedLine
        text={item.text}
        motion={motion}
        cycle={cycle}
        className="theme-mockup-scene__copy type-caption type-muted"
      />
    )
  }

  if (item.kind === 'heading') {
    return (
      <span className="theme-mockup-scene__heading">
        {item.kicker ? <span className="type-overline">{item.kicker}</span> : null}
        <AnimatedLine text={item.title} motion={motion} cycle={cycle} className="type-label" />
      </span>
    )
  }

  return (
    <span className="theme-mockup-scene__row">
      <VurifyIcon icon={WIREFRAME_ICON_MAP[item.icon]} size="sm" tone="accent" variant="plain" />
      <AnimatedLine
        text={item.copy}
        motion={motion}
        cycle={cycle}
        className="theme-mockup-scene__row-copy type-caption"
      />
      {item.tag ? <Tag size="xs">{item.tag}</Tag> : null}
    </span>
  )
}

function MockupBoxView({
  box,
  state,
  gleam,
  motion,
  cycle,
}: {
  box: MockupBox
  state: 'on' | 'off' | 'idle'
  gleam: boolean
  motion?: MockupMotionId | null
  cycle: number
}) {
  const tone = box.tone ?? 'main'
  return (
    <div
      className={[
        'theme-wireframe__block',
        `theme-wireframe__block--${tone}`,
        'theme-mockup-scene__slot',
        gleam ? 'theme-mockup--gleam' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-state={state}
    >
      <div className="theme-mockup-scene__slot-fold">
        <div className="theme-mockup-scene__box theme-mockup-scene__slot-inner">
          {box.items.map((item, index) => (
            <MockupItemView key={`${item.kind}-${index}`} item={item} motion={motion} cycle={cycle} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function MockupPreview({ scene, motion = null }: MockupPreviewProps) {
  const align = scene.masthead?.align ?? 'start'
  const { active, cycle } = useMockupMotionLoop(motion, scene.boxes.length)
  const frameKey = motion === 'stagger' ? `${scene.id}-${cycle}` : scene.id

  return (
    <div
      className={['theme-mockup-scene', motion ? `theme-mockup-scene--motion-${motion}` : '']
        .filter(Boolean)
        .join(' ')}
    >
      {scene.masthead ? (
        <header
          className={[
            'theme-mockup-scene__masthead',
            align === 'center' ? 'theme-mockup-scene__masthead--center' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {scene.masthead.kicker ? (
            <p className="type-overline mb-0">{scene.masthead.kicker}</p>
          ) : null}
          <p
            className={[
              'theme-mockup-scene__title mb-0',
              scene.masthead.display ? 'type-display-md' : 'type-h3',
            ].join(' ')}
          >
            {scene.masthead.title}
          </p>
        </header>
      ) : null}
      <div
        key={frameKey}
        className={[
          'theme-wireframe',
          'theme-wireframe--filled',
          'theme-wireframe--compact',
          'theme-wireframe--tier-section',
          GRID[scene.layout],
          motion ? `theme-mockup-scene__grid--motion-${motion}` : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="img"
        aria-label={`${scene.name} ${motion ? 'animated' : ''} mockup`.trim()}
      >
        {scene.boxes.map((box, index) => {
          const state = motion ? (index === active ? 'on' : 'off') : 'idle'
          return (
            <MockupBoxView
              key={`${scene.id}-${index}`}
              box={box}
              state={state}
              gleam={motion === 'gleam' && state === 'on'}
              motion={motion}
              cycle={cycle}
            />
          )
        })}
      </div>
    </div>
  )
}
