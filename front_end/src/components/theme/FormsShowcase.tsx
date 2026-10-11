import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FIELD_VARIANTS } from '../../lib/forms/formControls'
import { clampMatchIndex, findTextMatches, replaceAllTextMatches, replaceTextAtMatch } from '../../lib/search/textSearch'
import { SEMANTIC_TONES } from '../../lib/ui/semanticTone'
import { validationPresets, validators } from '../../lib/forms/formValidation'
import { CopyButton } from '../CopyButton'
import { Badge } from '../Badge'
import { Button } from '../Button'
import { Checkbox } from '../Checkbox'
import { CheckboxGroup } from '../CheckboxGroup'
import { Chip } from '../Chip'
import { Combobox } from '../Combobox'
import { Counter } from '../Counter'
import { DataUpload } from '../DataUpload'
import { ExpandableSearchBar } from '../ExpandableSearchBar'
import { FindReplaceBar } from '../FindReplaceBar'
import { DateInput, DatePicker, TimeInput, TimePicker } from '../DateTimeInput'
import { Fieldset } from '../Fieldset'
import { FileInput } from '../FileInput'
import { InfoTooltip } from '../InfoTooltip'
import { Input } from '../Input'
import { EditableTitle } from '../EditableTitle'
import { MultiSelect } from '../MultiSelect'
import { NumberInput } from '../NumberInput'
import { QuantityPicker } from '../QuantityPicker'
import { PasswordInput } from '../PasswordInput'
import { RadioGroup } from '../RadioGroup'
import { SearchHighlightText } from '../SearchHighlightText'
import { SearchInput } from '../SearchInput'
import { Select } from '../Select'
import { StatusText } from '../StatusText'
import { Switch } from '../Switch'
import { Tag } from '../Tag'
import { FormulaInput } from '../FormulaInput'
import { PollField } from '../PollField'
import { StickyNoteField } from '../StickyNoteField'
import { VideoPlayerField } from '../VideoPlayerField'
import { VideoEmbedBlock } from '../VideoEmbedBlock'
import { Textarea } from '../Textarea'
import { ToggleGroup } from '../ToggleGroup'
import { Tooltip } from '../Tooltip'
import { ColorSelector } from '../ColorSelector'

const COUNTRY_OPTIONS = [
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'cm', label: 'Cameroon' },
] as const

const CITY_OPTIONS = [
  { value: 'douala', label: 'Douala' },
  { value: 'yaounde', label: 'Yaoundé' },
  { value: 'buea', label: 'Buea' },
  { value: 'limbe', label: 'Limbe' },
  { value: 'bamenda', label: 'Bamenda' },
] as const

const SKILL_OPTIONS = [
  { value: 'react', label: 'React' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'design', label: 'Design systems' },
  { value: 'css', label: 'CSS architecture' },
  { value: 'a11y', label: 'Accessibility' },
] as const

const REGION_OPTIONS = [
  { value: 'us-east', label: 'US East' },
  { value: 'us-west', label: 'US West' },
  { value: 'eu-central', label: 'EU Central' },
  { value: 'eu-west', label: 'EU West' },
  { value: 'ap-south', label: 'AP South' },
  { value: 'ap-northeast', label: 'AP Northeast' },
  { value: 'sa-east', label: 'SA East' },
  { value: 'me-central', label: 'ME Central' },
  { value: 'af-south', label: 'AF South' },
] as const

const TAG_OPTIONS = ['design', 'forms', 'theme'] as const
const SIMPLE_TAGS = ['Design', 'Forms', 'Theme', 'Validation'] as const

const UPLOAD_MAX_FILE_BYTES = 5 * 1024 * 1024

const UPLOAD_LAYOUT_OPTIONS = [
  { value: 'rows', label: 'rows — thumbnail list' },
  { value: 'cards', label: 'cards — grid tiles' },
  { value: 'gallery', label: 'gallery — compact carousel' },
] as const

const UPLOAD_PREVIEW_OPTIONS = [
  { value: 'rows', label: 'rows — previews on' },
  { value: 'none', label: 'none — compact list' },
] as const

const UPLOAD_VARIANT_OPTIONS = FIELD_VARIANTS.map((variant) => ({
  value: variant,
  label: variant,
}))

const SEMANTIC_LABEL: Record<(typeof SEMANTIC_TONES)[number], string> = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
}

const SEMANTIC_BUTTON_ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: undefined,
  info: Info,
} as const

const SEARCH_DEMO_TEXT =
  'The design system forms library includes search patterns for toolbars and panels. Search highlights every match while the active result uses a stronger accent. Navigate matches with the up and down controls, or press Enter and Shift+Enter in the field. Try searching for form, search, or design.'

export type FormsShowcasePanel = 'overview' | 'upload' | 'search' | 'color'

function FormsSearchShowcaseSection() {
  const [query, setQuery] = useState('')
  const [activeMatch, setActiveMatch] = useState(0)
  const matches = useMemo(() => findTextMatches(SEARCH_DEMO_TEXT, query), [query])
  const safeIndex = clampMatchIndex(activeMatch, matches.length)

  const [panelText, setPanelText] = useState(SEARCH_DEMO_TEXT)
  const [panelQuery, setPanelQuery] = useState('')
  const [panelReplaceQuery, setPanelReplaceQuery] = useState('')
  const [panelActiveMatch, setPanelActiveMatch] = useState(0)
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [preserveCase, setPreserveCase] = useState(false)
  const panelSearchOptions = useMemo(
    () => ({ caseSensitive: matchCase, wholeWord, useRegex }),
    [matchCase, useRegex, wholeWord],
  )
  const panelMatches = useMemo(
    () => findTextMatches(panelText, panelQuery, panelSearchOptions),
    [panelQuery, panelSearchOptions, panelText],
  )
  const panelSafeIndex = clampMatchIndex(panelActiveMatch, panelMatches.length)

  useEffect(() => {
    setActiveMatch(0)
  }, [query])

  useEffect(() => {
    setPanelActiveMatch(0)
  }, [panelQuery, matchCase, wholeWord, useRegex])

  useEffect(() => {
    if (matches.length === 0) return
    document
      .getElementById(`search-match-${safeIndex}`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [matches.length, query, safeIndex])

  useEffect(() => {
    if (panelMatches.length === 0) return
    document
      .getElementById(`panel-search-match-${panelSafeIndex}`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [panelMatches.length, panelQuery, panelSafeIndex])

  function stepMatch(delta: number) {
    setActiveMatch((index) => clampMatchIndex(index + delta, matches.length))
  }

  function stepPanelMatch(delta: number) {
    setPanelActiveMatch((index) => clampMatchIndex(index + delta, panelMatches.length))
  }

  function handlePanelReplace() {
    const match = panelMatches[panelSafeIndex]
    if (!match) return
    setPanelText((text) => replaceTextAtMatch(text, match, panelReplaceQuery, preserveCase))
  }

  function handlePanelReplaceAll() {
    if (panelMatches.length === 0) return
    setPanelText((text) =>
      replaceAllTextMatches(text, panelMatches, panelReplaceQuery, preserveCase),
    )
    setPanelActiveMatch(0)
  }

  return (
    <section id="forms-search" className="space-y-6">
      <p className="type-body-sm type-muted prose-measure">
        Two find patterns — expandable toolbar search for chrome headers, and a stacked find/replace
        bar for side panels and editors. Pair highlights with{' '}
        <code className="type-code">SearchHighlightText</code>.
      </p>
      <div className="theme-forms-search-demo">
        <div className="theme-forms-search-demo__chrome">
          <div className="theme-forms-search-demo__heading">
            <p className="theme-forms-search-demo__title type-body-sm">Toolbar find</p>
            <p className="theme-forms-search-demo__subtitle type-caption">
              Expandable icon → field
            </p>
          </div>
          <ExpandableSearchBar
            className="theme-forms-search-demo__search"
            query={query}
            onQueryChange={setQuery}
            matchCount={matches.length}
            activeMatchIndex={safeIndex}
            onPrevMatch={() => stepMatch(-1)}
            onNextMatch={() => stepMatch(1)}
          />
        </div>
        <div className="theme-forms-search-demo__body">
          <SearchHighlightText
            text={SEARCH_DEMO_TEXT}
            query={query}
            activeMatchIndex={safeIndex}
            className="type-body-sm"
          />
        </div>
      </div>
      <div className="theme-forms-find-replace-demo">
        <p className="type-body-sm type-muted prose-measure">
          Panel find/replace — match case, whole word, and regex toggles; collapsible replace row
          with preserve-case and replace actions.
        </p>
        <FindReplaceBar
          className="theme-forms-find-replace-demo__bar"
          findQuery={panelQuery}
          onFindQueryChange={setPanelQuery}
          replaceQuery={panelReplaceQuery}
          onReplaceQueryChange={setPanelReplaceQuery}
          defaultReplaceOpen
          matchCase={matchCase}
          onMatchCaseChange={setMatchCase}
          wholeWord={wholeWord}
          onWholeWordChange={setWholeWord}
          useRegex={useRegex}
          onUseRegexChange={setUseRegex}
          preserveCase={preserveCase}
          onPreserveCaseChange={setPreserveCase}
          matchCount={panelMatches.length}
          activeMatchIndex={panelSafeIndex}
          onPrevMatch={() => stepPanelMatch(-1)}
          onNextMatch={() => stepPanelMatch(1)}
          onReplace={handlePanelReplace}
          onReplaceAll={handlePanelReplaceAll}
          size="xs"
          shadowless
        />
        <div className="theme-forms-find-replace-demo__body">
          <SearchHighlightText
            text={panelText}
            query={panelQuery}
            activeMatchIndex={panelSafeIndex}
            caseSensitive={matchCase}
            wholeWord={wholeWord}
            useRegex={useRegex}
            matchIdPrefix="panel-search-match"
            className="type-body-sm"
          />
        </div>
      </div>
    </section>
  )
}

function FormsColorShowcaseSection() {
  const [color, setColor] = useState('#4a86e8')

  const handleChange = useCallback((c: string) => setColor(c), [])

  return (
    <section id="forms-color" className="space-y-4">
      <p className="type-body-sm type-muted prose-measure">
        Reusable <code className="type-code">ColorSelector</code> — saturation plane, hue slider, main-color
        swatch column, and hex field via <code className="type-code">Input</code>. Fits toolbar popovers.
      </p>
      <div className="w-fit max-w-full space-y-2">
        <ColorSelector value={color} onChange={handleChange} />
        <p className="type-caption type-muted">
          Selected: <code className="type-code">{color}</code>
        </p>
      </div>
    </section>
  )
}

function FormsShowcasePanelGate({
  panel,
  show,
  children,
}: {
  panel: FormsShowcasePanel
  show: FormsShowcasePanel
  children: ReactNode
}) {
  if (panel !== show) return null
  return <>{children}</>
}

export function FormsShowcase({ panel = 'overview' }: { panel?: FormsShowcasePanel }) {
  const [agree, setAgree] = useState(false)
  const [notify, setNotify] = useState(true)
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [clearableCity, setClearableCity] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [skills, setSkills] = useState<string[]>(['react', 'css'])
  const [searchLog, setSearchLog] = useState('')
  const [counterFontSize, setCounterFontSize] = useState(16)
  const [tags, setTags] = useState<string[]>(['design', 'forms'])
  const [addons, setAddons] = useState<string[]>(['api'])
  const [region, setRegion] = useState('')
  const [regionStraight, setRegionStraight] = useState('')
  const [regionHidden, setRegionHidden] = useState('')
  const [uploadLayout, setUploadLayout] = useState('rows')
  const [uploadPreview, setUploadPreview] = useState('rows')
  const [uploadVariant, setUploadVariant] = useState<(typeof FIELD_VARIANTS)[number]>('flat')
  const [editableBordered, setEditableBordered] = useState('Project brief')
  const [editableBorderless, setEditableBorderless] = useState('Decision node')
  const [editableUnderline, setEditableUnderline] = useState('Section title')
  const [nativeVideoControls, setNativeVideoControls] = useState(false)
  const [nativeVideoLoop, setNativeVideoLoop] = useState(true)
  const [nativeVideoMuted, setNativeVideoMuted] = useState(true)
  return (
    <div className="space-y-12">
      <FormsShowcasePanelGate panel={panel} show="overview">
      <p className="type-body-sm type-muted prose-measure">
        Text fields use card shells; dropdowns use <code className="type-code">MenuButton</code> inside{' '}
        <code className="type-code">Select</code>. Validation runs through{' '}
        <code className="type-code">formValidation</code> rules on blur (or change when configured).
        Floating-label Vurify inputs live under{' '}
        <Link className="underline" to="/theme?section=forms-vurify">
          Forms → Vurify
        </Link>
        .
      </p>

      <section className="space-y-4">
        <p className="type-overline">Card variants</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          Field shells mirror Card surfaces. <code className="type-code">verify</code> is the
          housing lining (2px square, no brutal offset) — also on{' '}
          <Link className="underline" to="/theme?section=forms-vurify">
            Forms → Vurify
          </Link>
          .
        </p>
        <div className="grid max-w-md gap-4">
          {FIELD_VARIANTS.map((variant) => (
            <Input
              key={variant}
              label={variant.charAt(0).toUpperCase() + variant.slice(1)}
              variant={variant}
              placeholder={`${variant} field — tab to focus`}
              defaultValue={
                variant === 'ghost' || variant === 'verify' || variant === 'vurify' ? '' : 'Sample value'
              }
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Editable title</p>
        <p className="type-body-sm type-muted prose-measure">
          Click-to-rename field from Flow node headers —{' '}
          <code className="type-code">EditableTitle</code> with{' '}
          <code className="type-code">bordered</code>, <code className="type-code">borderless</code>, and{' '}
          <code className="type-code">underline</code> (underline redraws when editing ends).
        </p>
        <div className="grid max-w-md gap-5">
          <div className="space-y-1.5">
            <p className="type-caption type-faint font-mono">bordered</p>
            <EditableTitle
              value={editableBordered}
              onChange={setEditableBordered}
              variant="bordered"
              aria-label="Bordered title"
            />
          </div>
          <div className="space-y-1.5">
            <p className="type-caption type-faint font-mono">borderless</p>
            <EditableTitle
              value={editableBorderless}
              onChange={setEditableBorderless}
              variant="borderless"
              aria-label="Borderless title"
            />
          </div>
          <div className="space-y-1.5">
            <p className="type-caption type-faint font-mono">underline — settles on commit</p>
            <EditableTitle
              value={editableUnderline}
              onChange={setEditableUnderline}
              variant="underline"
              aria-label="Underline title"
            />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <p className="type-overline">Tags & pills</p>
        <p className="type-body-sm type-muted prose-measure">
          Semantic labels and simple tags (Semantic UI style), interactive filter chips, and
          portaled <code className="type-code">Tooltip</code> /{' '}
          <code className="type-code">InfoTooltip</code> — hover or click; pass{' '}
          <code className="type-code">interactive</code> to keep the panel open while hovering
          controls inside (e.g. copy).
        </p>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Semantic labels</p>
          <div className="flex flex-wrap gap-2">
            {SEMANTIC_TONES.map((tone) => (
              <Badge key={tone} tone={tone}>
                {SEMANTIC_LABEL[tone]}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Semantic text</p>
          <p className="type-body-sm">
            {SEMANTIC_TONES.map((tone, index) => (
              <span key={tone}>
                {index > 0 ? ' · ' : null}
                <StatusText tone={tone}>{SEMANTIC_LABEL[tone]} text</StatusText>
              </span>
            ))}
          </p>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Semantic buttons</p>
          <div className="flex flex-wrap gap-3">
            {SEMANTIC_TONES.map((tone) => (
              <Button
                key={tone}
                variant={tone === 'info' ? 'default' : tone}
                icon={SEMANTIC_BUTTON_ICON[tone]}
                size="md"
              >
                {SEMANTIC_LABEL[tone]}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Simple tags</p>
          <div className="theme-tag-group">
            {SIMPLE_TAGS.map((tag) => (
              <Tooltip key={tag} content={`Hover tooltip for “${tag}”`} trigger="hover">
                <Tag>{tag}</Tag>
              </Tooltip>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Filter chips</p>
          <div className="theme-chip-group">
            {TAG_OPTIONS.map((tag) => (
              <Chip
                key={tag}
                selected={tags.includes(tag)}
                onClick={() =>
                  setTags((current) =>
                    current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
                  )
                }
                onDismiss={
                  tags.includes(tag) ? () => setTags((c) => c.filter((t) => t !== tag)) : undefined
                }
              >
                {tag}
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Tooltips</p>
          <div className="flex flex-wrap items-center gap-4">
            <Tooltip content="Shown on hover — rendered in a portal" trigger="hover">
              <Button variant="outline" size="sm">
                Hover me
              </Button>
            </Tooltip>
            <Tooltip content="Toggle on click — Escape or outside click closes" trigger="click">
              <Button variant="ghost" size="sm">
                Click me
              </Button>
            </Tooltip>
            <Tooltip
              interactive
              trigger="hover"
              placement="bottom"
              content={
                <>
                  <span className="type-caption block">Deploy token — move onto the panel to interact.</span>
                  <div className="flex items-center gap-2">
                    <code className="type-code min-w-0 flex-1 truncate rounded border border-[var(--theme-border)] bg-[var(--theme-surface-inset)] px-2 py-1">
                      npm_8f2k9x1q
                    </code>
                    <CopyButton
                      text="npm_8f2k9x1q"
                      label="Copy"
                      size="sm"
                      variant="outline"
                    />
                  </div>
                </>
              }
            >
              <Button variant="outline" size="sm">
                Interactive
              </Button>
            </Tooltip>
            <span className="inline-flex items-center gap-1.5 type-label">
              Username
              <InfoTooltip
                trigger="hover"
                content="3–32 characters; letters, numbers, dots, underscores, hyphens."
              />
            </span>
            <span className="inline-flex items-center gap-1.5 type-label">
              Password policy
              <InfoTooltip
                trigger="click"
                content="At least 12 characters with upper, lower, number, and symbol."
              />
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <p className="type-overline">Extended form controls</p>
        <p className="type-body-sm type-muted prose-measure">
          Composed from existing field shells — <code className="type-code">MenuButton</code>,{' '}
          <code className="type-code">Chip</code>, control-wrap addons, and{' '}
          <code className="type-code">Fieldset</code> grouping.
        </p>

        <Fieldset legend="Shipping address">
          <Input label="Street" required placeholder="123 Main St" autoComplete="street-address" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Combobox
              label="City"
              required
              options={CITY_OPTIONS}
              value={city}
              onChange={setCity}
              rules={[validators.required('Choose a city')]}
              placeholder="Search cities…"
            />
            <Input label="Postal code" optional placeholder="00237" autoComplete="postal-code" />
          </div>
        </Fieldset>

        <div className="grid max-w-md gap-4">
          <MultiSelect
            label="Skills"
            required
            options={SKILL_OPTIONS}
            value={skills}
            onChange={setSkills}
            rules={[validators.minItems(1)]}
            placeholder="Add skill…"
          />
          <Combobox
            label="City (autocomplete)"
            options={CITY_OPTIONS}
            value={city}
            onChange={setCity}
            hint="Type to filter — arrow keys + Enter to choose."
          />
          <SearchInput
            label="Search docs"
            shape="pill"
            placeholder="Filter articles…"
            onDebouncedChange={setSearchLog}
            hint={searchLog ? `Debounced query: “${searchLog}”` : 'Debounced after 300ms'}
          />
          <SearchInput
            label="Search (Vurify)"
            variant="vurify"
            hint="Floating label rises like VurifyInput — accent thickens on focus."
          />
          <Input
            label="Website"
            type="url"
            prefixLayout="wide"
            prefix={<span className="type-caption type-muted">https://</span>}
            placeholder="yoursite.com"
          />
          <NumberInput
            label="Budget (simple steppers)"
            min={0}
            max={500}
            defaultValue={120}
            prefix={<span className="type-caption type-muted">$</span>}
            hint="Classic input with +/- buttons."
          />
          <Counter
            label="Font size"
            value={counterFontSize}
            steps={[12, 14, 16, 18, 20, 24, 30, 36]}
            formatDisplay={(size) => String(size)}
            onValueChange={setCounterFontSize}
            hint="Mini up/down stepper — search result counter pattern; used in DocEditor ribbon."
          />
          <QuantityPicker
            label="Team size"
            required
            min={0}
            max={100}
            defaultValue={4}
            hint="Scroll-wheel quantity — click the value to type. Inspired by type=number with extras."
          />
          <div className="space-y-3">
            <p className="type-caption type-faint font-mono">Native (browser picker)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <DateInput label="Start date" required />
              <TimeInput label="Meeting time" optional />
            </div>
          </div>
          <div className="space-y-3">
            <p className="type-caption type-faint font-mono">Carousel picker</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <DatePicker
                label="Start date"
                required
                hint="Type digits — `-` or `/` separators insert automatically. Calendar opens on focus."
              />
              <TimePicker
                label="Meeting time"
                optional
                hint="Type digits — `:` inserts automatically. Or use the clock button."
              />
            </div>
          </div>

          <Select
            label="Country (validated)"
            required
            options={COUNTRY_OPTIONS}
            value={country}
            onChange={setCountry}
            rules={[validators.required('Country is required')]}
            placeholder="Choose…"
          />
        </div>
      </section>

      </FormsShowcasePanelGate>

      <FormsShowcasePanelGate panel={panel} show="upload">
      <section id="forms-upload" className="space-y-4">
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">DataUpload</code> — dropzone with animated add/remove, preview
          layouts (list, card grid, compact carousel), and the same{' '}
          <code className="type-code">Field</code> feedback as other inputs.{' '}
          <code className="type-code">FileInput</code> is the compact delegate (
          <code className="type-code">preview=&quot;none&quot;</code>).
        </p>
        <div className="grid max-w-3xl gap-4 sm:grid-cols-3">
          <Select
            label="layout"
            options={UPLOAD_LAYOUT_OPTIONS}
            value={uploadLayout}
            onChange={setUploadLayout}
          />
          <Select
            label="preview"
            options={UPLOAD_PREVIEW_OPTIONS}
            value={uploadPreview}
            onChange={setUploadPreview}
            hint={uploadLayout === 'rows' ? 'Compact list when none.' : 'Rows layout only.'}
            disabled={uploadLayout !== 'rows'}
          />
          <Select
            label="variant"
            options={UPLOAD_VARIANT_OPTIONS}
            value={uploadVariant}
            onChange={(value) => setUploadVariant(value as (typeof FIELD_VARIANTS)[number])}
          />
        </div>
        <div className="grid max-w-2xl gap-6">
          <DataUpload
            key={`${uploadLayout}-${uploadPreview}-${uploadVariant}`}
            label="Documents & media"
            variant={uploadVariant}
            layout={uploadLayout as 'rows' | 'cards' | 'gallery'}
            preview={uploadPreview as 'rows' | 'none'}
            multiple
            accept="image/*,video/*,.pdf"
            hint="Drop or browse — files animate in and out when added or removed."
            validateOn="change"
          />
          <DataUpload
            label="Limited upload"
            multiple
            layout="cards"
            accept="image/*,video/*,.pdf"
            maxFiles={3}
            maxFileSize={UPLOAD_MAX_FILE_BYTES}
            hint="Max 3 files · 5 MB each · card grid layout."
            rules={[
              validators.minItems(1, 'Add at least one file'),
              validators.maxItems(3),
              validators.maxFileSize(UPLOAD_MAX_FILE_BYTES),
            ]}
            validateOn="change"
          />
          <DataUpload
            label="Gallery bundle"
            multiple
            layout="gallery"
            accept="image/*,video/*,.pdf"
            hint="Horizontal mini carousel — scroll or use chevrons when overflowed."
            validateOn="change"
          />
          <FileInput
            label="Attachments (simple)"
            multiple
            accept="image/*,.pdf"
            hint="Compact list without previews — delegates to DataUpload."
            rules={[validators.minItems(1, 'Add at least one file')]}
            validateOn="change"
          />
          <DataUpload
            label="Required bundle"
            required
            multiple
            accept="image/*,.pdf"
            rules={[validators.minItems(1, 'Upload at least one document')]}
            validateOn="change"
            hint="Required with minItems validation on change."
          />
        </div>
      </section>
      </FormsShowcasePanelGate>

      <FormsShowcasePanelGate panel={panel} show="search">
        <FormsSearchShowcaseSection />
      </FormsShowcasePanelGate>

      <FormsShowcasePanelGate panel={panel} show="color">
        <FormsColorShowcaseSection />
      </FormsShowcasePanelGate>

      <FormsShowcasePanelGate panel={panel} show="overview">
      <section className="space-y-4">
        <p className="type-overline">Clearable select</p>
        <p className="type-body-sm type-muted prose-measure">
          Pass <code className="type-code">clearable</code> to show an × control once a value is
          chosen — same trailing slot pattern as <code className="type-code">SearchInput</code>.
        </p>
        <div className="max-w-md">
          <Select
            label="City (optional)"
            clearable
            options={CITY_OPTIONS}
            value={clearableCity}
            onChange={setClearableCity}
            placeholder="Choose a city…"
            hint="Clear returns to the placeholder."
          />
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Dropdown scroll rails</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">Select</code> and <code className="type-code">Combobox</code> pass{' '}
          <code className="type-code">scrollRail</code> and <code className="type-code">scrollClouds</code> (default{' '}
          <code className="type-code">true</code>) to the list panel — curved SVG (default), straight
          native bar, or hidden rail-less scroll (<code className="type-code">data-scroll-rail</code> on the
          host).
        </p>
        <div className="grid max-w-md gap-4 sm:grid-cols-3">
          <Select
            label="Region (curved)"
            options={REGION_OPTIONS}
            value={region}
            onChange={setRegion}
            placeholder="Choose…"
          />
          <Select
            label="Region (straight)"
            options={REGION_OPTIONS}
            value={regionStraight}
            onChange={setRegionStraight}
            scrollRail="straight"
            placeholder="Choose…"
          />
          <Combobox
            label="Region (hidden)"
            options={REGION_OPTIONS}
            value={regionHidden}
            onChange={setRegionHidden}
            scrollRail="hidden"
            placeholder="Search…"
          />
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Validation library</p>
        <p className="type-body-sm type-muted prose-measure">
          Compose <code className="type-code">ValidationRule</code> arrays — failed rules list on
          separate lines; passing values show plain success text with animated feedback.
        </p>
        <div className="grid max-w-md gap-4">
          <Input
            label="Username"
            name="username"
            autoComplete="username"
            placeholder="letters, numbers, ._-"
            rules={validationPresets.username}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            rules={validationPresets.email}
          />
          <PasswordInput
            label="Create password"
            name="new-password"
            placeholder="At least 12 characters"
            hint="Tab out to validate — each failed rule lists on its own line."
            validateOn={['blur', 'change']}
          />
          <Textarea
            label="Bio"
            variant="raised"
            placeholder="Say hello…"
            rows={3}
            rules={[validators.maxLength(160, 'Bio must be 160 characters or less')]}
          />
          <DatePicker
            label="Event date"
            value={eventDate}
            onChange={setEventDate}
            validateOn={['blur', 'change']}
            rules={[
              validators.required('Event date is required'),
              validators.date(),
              validators.dateRange('2026-01-01', '2026-12-31', 'Date must fall in 2026'),
            ]}
            hint="Auto-formatted while typing — validated against a 2026 range."
          />
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Manual field states</p>
        <div className="grid max-w-md gap-4">
          <Input
            label="Email"
            type="email"
            success="Email is available"
            defaultValue="you@example.com"
          />
          <Input label="Username" error="Username is taken" defaultValue="alex" />
          <Input
            label="Legacy password hint"
            type="password"
            variant="inset"
            warning="Weak password — add a symbol or number"
            defaultValue="hello123"
          />
          <Select
            label="Country"
            placeholder="Choose…"
            options={COUNTRY_OPTIONS}
            value={country}
            onChange={setCountry}
          />
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Sizes</p>
        <div className="grid max-w-md gap-4">
          <Input label="Small" size="sm" placeholder="sm" />
          <Input label="Medium" size="md" placeholder="md" />
          <Input label="Large" size="lg" placeholder="lg" />
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Checkbox · switch</p>
        <div className="flex flex-col gap-3">
          <Checkbox
            label="I agree to the terms"
            description="Required to continue"
            checked={agree}
            onChange={setAgree}
          />
          <Switch label="Email notifications" checked={notify} onChange={setNotify} size="md" />
        </div>
      </section>

      <section id="forms-embeds" className="space-y-6">
        <p className="type-overline">Rich embed fields</p>
        <p className="type-body-sm type-muted prose-measure">
          Form-layer controls for equation, poll, video, and sticky-note content — same primitives power DocEditor insert blocks.
        </p>
        <div className="grid max-w-2xl gap-8">
          <FormulaInput defaultValue="E=mc^2" />
          <PollField />
          <VideoPlayerField defaultValue="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
          <div className="space-y-3">
            <p className="type-label mb-0">Native video player</p>
            <p className="type-caption type-muted mb-0">
              Configurable `VideoEmbedBlock` — hide controls for ambient loops, reveal them for
              interactive playback.
            </p>
            <div className="flex flex-wrap gap-4">
              <Switch
                label="Controls"
                checked={nativeVideoControls}
                onChange={setNativeVideoControls}
                size="sm"
              />
              <Switch label="Loop" checked={nativeVideoLoop} onChange={setNativeVideoLoop} size="sm" />
              <Switch
                label="Muted"
                checked={nativeVideoMuted}
                onChange={setNativeVideoMuted}
                size="sm"
              />
            </div>
            <VideoEmbedBlock
              videoId="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
              title="Sample native video"
              autoPlay
              loop={nativeVideoLoop}
              muted={nativeVideoMuted}
              controls={nativeVideoControls}
              preload="metadata"
            />
          </div>
          <StickyNoteField defaultValue="Ship the docs preview by Friday." />
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Choice controls (forms context)</p>
        <CheckboxGroup
          aria-label="Add-ons"
          options={[
            { value: 'api', label: 'API access', description: 'REST + webhooks' },
            { value: 'sso', label: 'SSO', description: 'SAML / OIDC' },
            { value: 'audit', label: 'Audit log' },
          ]}
          value={addons}
          onChange={setAddons}
          size="md"
        />
        <RadioGroup
          aria-label="Plan"
          options={[
            { value: 'free', label: 'Free', description: 'Basic features' },
            { value: 'pro', label: 'Pro', description: 'Everything' },
          ]}
          defaultValue="free"
        />
        <ToggleGroup
          aria-label="Visibility"
          mode="single"
          options={[
            { value: 'public', label: 'Public' },
            { value: 'private', label: 'Private' },
          ]}
          defaultValue="public"
          size="sm"
        />
      </section>
      </FormsShowcasePanelGate>
    </div>
  )
}
