import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Copy,
  Grid3x3,
  Group,
  Link2,
  PaintBucket,
  Square,
  Trash2,
  Type,
  Ungroup,
} from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowheadArrowIcon,
  ArrowheadNoneIcon,
  ArrowTypeCurvedIcon,
  ArrowTypeElbowIcon,
  ArrowTypeStraightIcon,
  LayerBringForwardIcon,
  LayerBringToFrontIcon,
  LayerSendBackwardIcon,
  LayerSendToBackIcon,
  SloppinessArchitectIcon,
  SloppinessArtistIcon,
  SloppinessCartoonistIcon,
  StrokeStyleDashedIcon,
  StrokeStyleDottedIcon,
  StrokeStyleSolidIcon,
  StrokeWidthBoldIcon,
  StrokeWidthExtraBoldIcon,
  StrokeWidthThinIcon,
} from '../../lib/drawCanvas/drawIcons'
import { ColorSelector, cssColorToHex } from '../ColorSelector'
import { resolveThemePortalMount } from '../../lib/theme/themePortal'
import { Counter } from '../Counter'
import { IconButton } from '../IconButton'
import { MenuButton, type MenuItem } from '../MenuButton'
import { ThemeScroll } from '../ThemeScroll'
import { ToolbarControlTray } from '../ToolbarControlTray'
import { ToolbarModeGroup } from '../ToolbarModeGroup'
import { Tooltip } from '../Tooltip'

export type DrawArrowType = 'sharp' | 'round' | 'elbow'
export type DrawArrowhead = 'none' | 'arrow'

export type DrawPropsSnapshot = {
  strokeColor: string
  backgroundColor: string
  fillStyle: string
  strokeWidth: number
  strokeStyle: string
  roughness: number
  opacity: number
  fontSize: number
  textAlign: string
  arrowType: DrawArrowType
  endArrowhead: DrawArrowhead
  activeTool: string
  selectedCount: number
  hasText: boolean
  hasArrow: boolean
  hasFreedraw: boolean
  hasImage: boolean
  hasLinear: boolean
}

export type DrawCanvasFormatRibbonProps = {
  open: boolean
  snapshot: DrawPropsSnapshot
  onStrokeColor: (hex: string) => void
  onBackgroundColor: (hex: string) => void
  onFillStyle: (style: string) => void
  onStrokeWidth: (width: number) => void
  onStrokeStyle: (style: string) => void
  onRoughness: (value: number) => void
  onOpacity: (value: number) => void
  onFontSize: (size: number) => void
  onTextAlign: (align: string) => void
  onArrowType: (type: DrawArrowType) => void
  onArrowhead: (head: DrawArrowhead) => void
  onDuplicate: () => void
  onDelete: () => void
  onGroup: () => void
  onUngroup: () => void
  onBringForward: () => void
  onSendBackward: () => void
  onBringToFront: () => void
  onSendToBack: () => void
  onHyperlink: () => void
  onAlign: (align: 'left' | 'center' | 'right') => void
}

const STROKE_WIDTH_ITEMS: MenuItem[] = [
  { id: '1', label: 'Thin', icon: StrokeWidthThinIcon },
  { id: '2', label: 'Bold', icon: StrokeWidthBoldIcon },
  { id: '4', label: 'Extra', icon: StrokeWidthExtraBoldIcon },
]

const STROKE_STYLE_ITEMS: MenuItem[] = [
  { id: 'solid', label: 'Solid', icon: StrokeStyleSolidIcon },
  { id: 'dashed', label: 'Dashed', icon: StrokeStyleDashedIcon },
  { id: 'dotted', label: 'Dotted', icon: StrokeStyleDottedIcon },
]

const FILL_STYLE_ITEMS: MenuItem[] = [
  { id: 'hachure', label: 'Hachure', icon: Grid3x3 },
  { id: 'cross-hatch', label: 'Cross-hatch', icon: Grid3x3 },
  { id: 'solid', label: 'Solid', icon: Square },
]

const ROUGHNESS_ITEMS: MenuItem[] = [
  { id: '0', label: 'Architect', icon: SloppinessArchitectIcon },
  { id: '1', label: 'Artist', icon: SloppinessArtistIcon },
  { id: '2', label: 'Cartoonist', icon: SloppinessCartoonistIcon },
]

const FONT_SIZE_ITEMS: MenuItem[] = [
  { id: '16', label: '16' },
  { id: '20', label: '20' },
  { id: '28', label: '28' },
  { id: '36', label: '36' },
]

const ARROW_TYPE_ITEMS: MenuItem[] = [
  { id: 'sharp', label: 'Sharp', icon: ArrowTypeStraightIcon },
  { id: 'round', label: 'Round', icon: ArrowTypeCurvedIcon },
  { id: 'elbow', label: 'Elbow', icon: ArrowTypeElbowIcon },
]

const ARROWHEAD_ITEMS: MenuItem[] = [
  { id: 'none', label: 'None', icon: ArrowheadNoneIcon },
  { id: 'arrow', label: 'Arrow', icon: ArrowheadArrowIcon },
]

function Tip({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip content={label}>{children}</Tooltip>
}

function ColorPopover({
  anchorRef,
  label,
  value,
  onChange,
  onClose,
}: {
  anchorRef: RefObject<HTMLElement | null>
  label: string
  value: string
  onChange: (hex: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [sessionColor, setSessionColor] = useState(() => cssColorToHex(value))
  const [portalThemeStyle, setPortalThemeStyle] = useState<CSSProperties>({})

  useEffect(() => {
    setSessionColor(cssColorToHex(value))
  }, [value])

  useLayoutEffect(() => {
    setPortalThemeStyle(resolveThemePortalMount(anchorRef.current).wrapStyle)
  }, [anchorRef])

  useLayoutEffect(() => {
    const el = ref.current
    const anchor = anchorRef.current
    if (!el || !anchor) return
    const rect = anchor.getBoundingClientRect()
    el.style.top = `${rect.bottom + 6}px`
    el.style.left = `${Math.min(rect.left, window.innerWidth - 280)}px`
  }, [anchorRef])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (ref.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    const id = window.setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown)
      document.addEventListener('keydown', handleEscape)
    }, 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [anchorRef, onClose])

  return createPortal(
    <div className="theme" style={portalThemeStyle}>
      <div
        ref={ref}
        className="theme-draw-canvas__color-popover theme-draw-canvas__color-popover--portal"
        role="dialog"
        aria-label={label}
        style={{ zIndex: 1200 }}
      >
        <ColorSelector
          className="theme-color-selector--popover"
          value={sessionColor}
          onChange={(hex) => {
            setSessionColor(hex)
            onChange(hex)
          }}
        />
      </div>
    </div>,
    document.body,
  )
}

function CompactMenu({
  label,
  items,
  selectedId,
  onSelect,
  icon,
  iconOnly = false,
  iconDropdown = true,
  className = '',
}: {
  label: string
  items: readonly MenuItem[]
  selectedId: string
  onSelect: (id: string) => void
  icon?: MenuItem['icon']
  iconOnly?: boolean
  iconDropdown?: boolean
  className?: string
}) {
  return (
    <MenuButton
      size="xs"
      variant="tray"
      menuSize="compact"
      portal
      portalZIndex={1200}
      scrollRail="hidden"
      triggerLabelAnim={false}
      className={className}
      label={label}
      icon={icon}
      iconOnly={iconOnly && Boolean(icon) && !iconDropdown}
      iconDropdown={iconDropdown && Boolean(icon)}
      items={items}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  )
}

function GroupLabel({ children }: { children: ReactNode }) {
  return <span className="theme-draw-canvas__format-group-label">{children}</span>
}

/** Layer 3 — single-row format ribbon (selection / active drawing tool). */
export function DrawCanvasFormatRibbon({
  open,
  snapshot,
  onStrokeColor,
  onBackgroundColor,
  onFillStyle,
  onStrokeWidth,
  onStrokeStyle,
  onRoughness,
  onOpacity,
  onFontSize,
  onTextAlign,
  onArrowType,
  onArrowhead,
  onDuplicate,
  onDelete,
  onGroup,
  onUngroup,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onHyperlink,
  onAlign,
}: DrawCanvasFormatRibbonProps) {
  const [showStrokePicker, setShowStrokePicker] = useState(false)
  const [showFillPicker, setShowFillPicker] = useState(false)
  const strokeBtnRef = useRef<HTMLSpanElement>(null)
  const fillBtnRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) {
      setShowStrokePicker(false)
      setShowFillPicker(false)
    }
  }, [open])

  const showText = snapshot.hasText || snapshot.activeTool === 'text'
  const showArrow = snapshot.hasArrow || snapshot.activeTool === 'arrow'
  const showFreedraw = snapshot.hasFreedraw || snapshot.activeTool === 'freedraw'

  const strokeWidthIcon =
    snapshot.strokeWidth === 1
      ? StrokeWidthThinIcon
      : snapshot.strokeWidth === 4
        ? StrokeWidthExtraBoldIcon
        : StrokeWidthBoldIcon
  const strokeStyleIcon =
    snapshot.strokeStyle === 'dashed'
      ? StrokeStyleDashedIcon
      : snapshot.strokeStyle === 'dotted'
        ? StrokeStyleDottedIcon
        : StrokeStyleSolidIcon
  const roughnessIcon =
    snapshot.roughness === 0
      ? SloppinessArchitectIcon
      : snapshot.roughness === 2
        ? SloppinessCartoonistIcon
        : SloppinessArtistIcon
  const fillStyleIcon = snapshot.fillStyle === 'solid' ? Square : Grid3x3
  const arrowTypeIcon =
    snapshot.arrowType === 'sharp'
      ? ArrowTypeStraightIcon
      : snapshot.arrowType === 'round'
        ? ArrowTypeCurvedIcon
        : ArrowTypeElbowIcon
  const arrowheadIcon =
    snapshot.endArrowhead === 'none' ? ArrowheadNoneIcon : ArrowheadArrowIcon

  return (
    <div
      className={[
        'theme-draw-canvas__format-ribbon',
        open ? 'theme-draw-canvas__format-ribbon--open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={!open}
    >
      <ThemeScroll axis="horizontal" rail="nano" className="theme-draw-canvas__format-scroll">
        <div className="theme-draw-canvas__format-inner" role="toolbar" aria-label="Shape formatting">
          <div className="theme-draw-canvas__format-group">
            <GroupLabel>Colors</GroupLabel>
            <ToolbarModeGroup aria-label="Stroke and fill colors">
              <span ref={strokeBtnRef} className="theme-draw-canvas__color-btn-wrap">
                <Tip label="Stroke color">
                  <IconButton
                    variant="tray-color"
                    icon={Type}
                    indicatorColor={snapshot.strokeColor}
                    aria-label="Stroke color"
                    aria-pressed={showStrokePicker}
                    size="xs"
                    active={showStrokePicker}
                    onClick={() => {
                      setShowStrokePicker((v) => !v)
                      setShowFillPicker(false)
                    }}
                  />
                </Tip>
                {showStrokePicker ? (
                  <ColorPopover
                    anchorRef={strokeBtnRef}
                    label="Stroke color"
                    value={snapshot.strokeColor}
                    onChange={onStrokeColor}
                    onClose={() => setShowStrokePicker(false)}
                  />
                ) : null}
              </span>
              <span ref={fillBtnRef} className="theme-draw-canvas__color-btn-wrap">
                <Tip label="Fill color">
                  <IconButton
                    variant="tray-color"
                    icon={PaintBucket}
                    indicatorColor={
                      snapshot.backgroundColor === 'transparent'
                        ? undefined
                        : snapshot.backgroundColor
                    }
                    aria-label="Fill color"
                    aria-pressed={showFillPicker}
                    size="xs"
                    active={showFillPicker}
                    onClick={() => {
                      setShowFillPicker((v) => !v)
                      setShowStrokePicker(false)
                    }}
                  />
                </Tip>
                {showFillPicker ? (
                  <ColorPopover
                    anchorRef={fillBtnRef}
                    label="Fill color"
                    value={
                      snapshot.backgroundColor === 'transparent'
                        ? '#ffffff'
                        : snapshot.backgroundColor
                    }
                    onChange={onBackgroundColor}
                    onClose={() => setShowFillPicker(false)}
                  />
                ) : null}
              </span>
            </ToolbarModeGroup>
            <Tip label="Fill style">
              <CompactMenu
                label="Fill style"
                icon={fillStyleIcon}
                items={FILL_STYLE_ITEMS}
                selectedId={snapshot.fillStyle}
                onSelect={onFillStyle}
                className="theme-draw-canvas__compact-menu"
              />
            </Tip>
            <Tip label="Opacity">
              <Counter
                size="xs"
                aria-label="Opacity"
                value={snapshot.opacity}
                min={0}
                max={100}
                step={5}
                formatDisplay={(value) => `${value}%`}
                onValueChange={onOpacity}
              />
            </Tip>
          </div>

          <span className="theme-draw-canvas__toolbar-divider" role="separator" aria-hidden />

          <div className="theme-draw-canvas__format-group theme-draw-canvas__format-group--menus">
            <GroupLabel>Stroke</GroupLabel>
            <Tip label="Stroke width">
              <CompactMenu
                label="Width"
                icon={strokeWidthIcon}
                items={STROKE_WIDTH_ITEMS}
                selectedId={String(snapshot.strokeWidth)}
                onSelect={(id) => onStrokeWidth(Number(id))}
                className="theme-draw-canvas__compact-menu"
              />
            </Tip>
            <Tip label="Stroke style">
              <CompactMenu
                label="Style"
                icon={strokeStyleIcon}
                items={STROKE_STYLE_ITEMS}
                selectedId={snapshot.strokeStyle}
                onSelect={onStrokeStyle}
                className="theme-draw-canvas__compact-menu"
              />
            </Tip>
            {!showFreedraw ? (
              <Tip label="Sloppiness">
                <CompactMenu
                  label="Sloppiness"
                  icon={roughnessIcon}
                  items={ROUGHNESS_ITEMS}
                  selectedId={String(snapshot.roughness)}
                  onSelect={(id) => onRoughness(Number(id))}
                  className="theme-draw-canvas__compact-menu"
                />
              </Tip>
            ) : null}
          </div>

          {showArrow ? (
            <>
              <span className="theme-draw-canvas__toolbar-divider" role="separator" aria-hidden />
              <div className="theme-draw-canvas__format-group theme-draw-canvas__format-group--menus">
                <GroupLabel>Arrow</GroupLabel>
                <Tip label="Arrow type">
                  <CompactMenu
                    label="Type"
                    icon={arrowTypeIcon}
                    items={ARROW_TYPE_ITEMS}
                    selectedId={snapshot.arrowType}
                    onSelect={(id) => onArrowType(id as DrawArrowType)}
                    className="theme-draw-canvas__compact-menu"
                  />
                </Tip>
                <Tip label="Arrowheads">
                  <CompactMenu
                    label="Heads"
                    icon={arrowheadIcon}
                    items={ARROWHEAD_ITEMS}
                    selectedId={snapshot.endArrowhead}
                    onSelect={(id) => onArrowhead(id as DrawArrowhead)}
                    className="theme-draw-canvas__compact-menu"
                  />
                </Tip>
              </div>
            </>
          ) : null}

          {showText ? (
            <>
              <span className="theme-draw-canvas__toolbar-divider" role="separator" aria-hidden />
              <div className="theme-draw-canvas__format-group">
                <GroupLabel>Text</GroupLabel>
                <Tip label="Font size">
                  <CompactMenu
                    label={String(snapshot.fontSize)}
                    items={FONT_SIZE_ITEMS}
                    selectedId={String(snapshot.fontSize)}
                    onSelect={(id) => onFontSize(Number(id))}
                    iconDropdown={false}
                    iconOnly={false}
                    className="theme-draw-canvas__compact-menu"
                  />
                </Tip>
                <ToolbarModeGroup aria-label="Text align">
                  <IconButton
                    icon={AlignLeft}
                    aria-label="Align left"
                    size="xs"
                    active={snapshot.textAlign === 'left'}
                    onClick={() => onTextAlign('left')}
                  />
                  <IconButton
                    icon={AlignCenter}
                    aria-label="Align center"
                    size="xs"
                    active={snapshot.textAlign === 'center'}
                    onClick={() => onTextAlign('center')}
                  />
                  <IconButton
                    icon={AlignRight}
                    aria-label="Align right"
                    size="xs"
                    active={snapshot.textAlign === 'right'}
                    onClick={() => onTextAlign('right')}
                  />
                </ToolbarModeGroup>
              </div>
            </>
          ) : null}

          <span className="theme-draw-canvas__toolbar-divider" role="separator" aria-hidden />

          <div className="theme-draw-canvas__format-group">
            <GroupLabel>Layers</GroupLabel>
            <ToolbarControlTray>
              <Tip label="Send to back">
                <IconButton
                  icon={LayerSendToBackIcon}
                  aria-label="Send to back"
                  size="xs"
                  variant="tray"
                  onClick={onSendToBack}
                />
              </Tip>
              <Tip label="Send backward">
                <IconButton
                  icon={LayerSendBackwardIcon}
                  aria-label="Send backward"
                  size="xs"
                  variant="tray"
                  onClick={onSendBackward}
                />
              </Tip>
              <Tip label="Bring forward">
                <IconButton
                  icon={LayerBringForwardIcon}
                  aria-label="Bring forward"
                  size="xs"
                  variant="tray"
                  onClick={onBringForward}
                />
              </Tip>
              <Tip label="Bring to front">
                <IconButton
                  icon={LayerBringToFrontIcon}
                  aria-label="Bring to front"
                  size="xs"
                  variant="tray"
                  onClick={onBringToFront}
                />
              </Tip>
            </ToolbarControlTray>
          </div>

          {snapshot.selectedCount >= 2 ? (
            <>
              <span className="theme-draw-canvas__toolbar-divider" role="separator" aria-hidden />
              <div className="theme-draw-canvas__format-group">
                <GroupLabel>Align</GroupLabel>
                <ToolbarModeGroup aria-label="Align selection">
                  <IconButton
                    icon={AlignLeft}
                    aria-label="Align left"
                    size="xs"
                    onClick={() => onAlign('left')}
                  />
                  <IconButton
                    icon={AlignCenter}
                    aria-label="Align center"
                    size="xs"
                    onClick={() => onAlign('center')}
                  />
                  <IconButton
                    icon={AlignRight}
                    aria-label="Align right"
                    size="xs"
                    onClick={() => onAlign('right')}
                  />
                </ToolbarModeGroup>
              </div>
            </>
          ) : null}

          <span className="theme-draw-canvas__toolbar-divider" role="separator" aria-hidden />

          <div className="theme-draw-canvas__format-group">
            <GroupLabel>Edit</GroupLabel>
            <ToolbarControlTray>
              <Tip label="Group">
                <IconButton icon={Group} aria-label="Group" size="xs" variant="tray" onClick={onGroup} />
              </Tip>
              <Tip label="Ungroup">
                <IconButton
                  icon={Ungroup}
                  aria-label="Ungroup"
                  size="xs"
                  variant="tray"
                  onClick={onUngroup}
                />
              </Tip>
              <Tip label="Duplicate">
                <IconButton
                  icon={Copy}
                  aria-label="Duplicate"
                  size="xs"
                  variant="tray"
                  onClick={onDuplicate}
                />
              </Tip>
              <Tip label="Hyperlink">
                <IconButton
                  icon={Link2}
                  aria-label="Hyperlink"
                  size="xs"
                  variant="tray"
                  onClick={onHyperlink}
                />
              </Tip>
              <Tip label="Delete">
                <IconButton
                  icon={Trash2}
                  aria-label="Delete"
                  size="xs"
                  variant="tray"
                  onClick={onDelete}
                />
              </Tip>
            </ToolbarControlTray>
          </div>
        </div>
      </ThemeScroll>
    </div>
  )
}
