import { ArrowRight, Menu, Settings } from 'lucide-react'
import {
  Briefcase01Icon,
  Home01Icon,
  InstagramIcon,
  Linkedin01Icon,
  Mail01Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RadioGroup } from '../RadioGroup'
import { VurifyMenuButton } from '../VurifyMenuButton'
import { VurifyIcon } from '../VurifyIcon'

/**
 * Theme lab — all Vurify chrome (menu buttons + vurify-tiered radios), kept separate
 * from product Button / choice-control demos on Buttons overview.
 */
export function ButtonsVurifyShowcase() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [tier, setTier] = useState('free')
  const [vurifyPair, setVurifyPair] = useState('hire')

  return (
    <div className="space-y-10">
      <p className="type-body-sm type-muted prose-measure mb-0">
        Vurify control language — bold display type, borders, underlines (or underlineless fill).
        Kept off the product <code className="type-code">Button</code> overview so the families do
        not mix. See also{' '}
        <Link className="underline" to="/theme?section=buttons">
          Buttons overview
        </Link>
        .
      </p>

      <section className="space-y-4">
        <p className="type-overline">Label — sizes</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          Default <code className="type-code">variant=&quot;label&quot;</code> — Elara underline under
          text only; icon sits outside the line.
        </p>
        <div className="flex flex-wrap items-end gap-6">
          <VurifyMenuButton size="sm">Small</VurifyMenuButton>
          <VurifyMenuButton size="md">Medium</VurifyMenuButton>
          <VurifyMenuButton size="lg">Menu</VurifyMenuButton>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Label — icons · tones · switch</p>
        <div className="flex flex-wrap items-end gap-6">
          <VurifyMenuButton
            icon={Menu}
            switchAnimation="flip"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </VurifyMenuButton>
          <VurifyMenuButton icon={ArrowRight} iconPosition="right">
            Continue
          </VurifyMenuButton>
          <VurifyMenuButton icon={Settings} lineTone="complement" className="is-selected">
            Selected
          </VurifyMenuButton>
          <VurifyMenuButton lineStyle="solid">Solid</VurifyMenuButton>
          <VurifyMenuButton lineStyle="double" lineTone="complement">
            Double
          </VurifyMenuButton>
          <VurifyMenuButton lineStyle="dashed" lineTone="text">
            Dashed
          </VurifyMenuButton>
          <VurifyMenuButton disabled>Disabled</VurifyMenuButton>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Icons — plain · bordered</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          <code className="type-code">VurifyIcon</code> —{' '}
          <code className="type-code">plain</code> (borderless fill glyph) or{' '}
          <code className="type-code">bordered</code> (2px thick housing-weight frame). Pricing
          feature rows use bordered.
        </p>
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-5">
            <span className="type-caption type-muted w-20">plain</span>
            <VurifyIcon iconNode={Briefcase01Icon} variant="plain" tone="accent" size="md" />
            <VurifyIcon iconNode={SparklesIcon} variant="plain" tone="accent" size="md" />
            <VurifyIcon iconNode={Mail01Icon} variant="plain" tone="complement" size="md" />
            <VurifyIcon iconNode={Home01Icon} variant="plain" tone="text" size="lg" />
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <span className="type-caption type-muted w-20">bordered</span>
            <VurifyIcon iconNode={Briefcase01Icon} variant="bordered" tone="accent" size="sm" />
            <VurifyIcon iconNode={Briefcase01Icon} variant="bordered" tone="accent" size="md" />
            <VurifyIcon iconNode={SparklesIcon} variant="bordered" tone="accent" size="md" />
            <VurifyIcon iconNode={Mail01Icon} variant="bordered" tone="complement" size="md" />
            <VurifyIcon iconNode={Home01Icon} variant="bordered" tone="text" size="lg" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Menu — Hugeicons · label</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          Scene menu category / link pattern — <code className="type-code">iconNode</code> Hugeicons
          glyphs with default <code className="type-code">label</code> underline.
        </p>
        <div className="flex flex-wrap items-end gap-6">
          <VurifyMenuButton iconNode={Home01Icon} lineTone="accent">
            Home
          </VurifyMenuButton>
          <VurifyMenuButton iconNode={SparklesIcon} lineTone="text">
            What we do
          </VurifyMenuButton>
          <VurifyMenuButton iconNode={Briefcase01Icon} lineTone="complement" className="is-selected">
            How it works
          </VurifyMenuButton>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Menu footer — fill · icon-only</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          Same chrome as Home menu utilities: Contact uses{' '}
          <code className="type-code">variant=&quot;fill&quot;</code>; socials use{' '}
          <code className="type-code">variant=&quot;icon-only&quot;</code> (Hugeicons brand marks).
        </p>
        <div className="flex flex-wrap items-end gap-8">
          <div className="flex flex-wrap items-end gap-6">
            <VurifyMenuButton
              variant="fill"
              size="sm"
              iconNode={Mail01Icon}
              lineTone="accent"
              aria-label="Contact"
            >
              Contact
            </VurifyMenuButton>
            <VurifyMenuButton
              variant="fill"
              size="sm"
              iconNode={Mail01Icon}
              lineTone="accent"
              className="is-selected"
              aria-label="Contact selected"
            >
              Contact
            </VurifyMenuButton>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <VurifyMenuButton
              variant="icon-only"
              size="sm"
              iconNode={Linkedin01Icon}
              lineTone="muted"
              aria-label="LinkedIn"
            >
              LinkedIn
            </VurifyMenuButton>
            <VurifyMenuButton
              variant="icon-only"
              size="sm"
              iconNode={InstagramIcon}
              lineTone="muted"
              aria-label="Instagram"
            >
              Instagram
            </VurifyMenuButton>
            <VurifyMenuButton
              variant="icon-only"
              size="sm"
              iconNode={Linkedin01Icon}
              lineTone="accent"
              className="is-selected"
              aria-label="LinkedIn selected"
            >
              LinkedIn
            </VurifyMenuButton>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Underlineless — fill</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          <code className="type-code">variant=&quot;fill&quot;</code> — no Elara line; bold display
          type + color fill on hover/selected (Contact / utilities). Lucide or Hugeicons.
        </p>
        <div className="flex flex-wrap items-end gap-6">
          <VurifyMenuButton variant="fill" icon={Settings} lineTone="accent">
            Contact
          </VurifyMenuButton>
          <VurifyMenuButton variant="fill" lineTone="complement">
            Settings
          </VurifyMenuButton>
          <VurifyMenuButton variant="fill" className="is-selected" lineTone="accent">
            Selected
          </VurifyMenuButton>
          <VurifyMenuButton
            variant="icon-only"
            icon={Menu}
            aria-label="Menu"
            lineTone="accent"
          >
            Menu
          </VurifyMenuButton>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Housing</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          <code className="type-code">housing</code> — 2px frame + pad; border on
          hover/selected/expanded. Label frames text + underline; fill frames the whole control.
        </p>
        <div className="flex flex-wrap items-end gap-6">
          <VurifyMenuButton housing>Label housing</VurifyMenuButton>
          <VurifyMenuButton housing icon={ArrowRight} iconPosition="right" lineTone="complement">
            With icon
          </VurifyMenuButton>
          <VurifyMenuButton housing variant="fill" iconNode={Mail01Icon} lineTone="accent">
            Fill housing
          </VurifyMenuButton>
          <VurifyMenuButton housing className="is-selected" lineTone="accent">
            Selected
          </VurifyMenuButton>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">RadioGroup vurify</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          Binary A|B — each option is a housing text-rail (same 2px border + 4/6/8 pads +
          underline as VurifyMenuButton), sitting side by side with no outer shell.
        </p>
        <RadioGroup
          aria-label="Hire or apply"
          variant="vurify"
          options={[
            { value: 'hire', label: 'Hire' },
            { value: 'apply', label: 'Apply' },
          ]}
          value={vurifyPair}
          onChange={setVurifyPair}
          size="md"
        />
        <p className="type-caption type-muted mb-0">
          Selected: <span className="font-mono">{vurifyPair}</span>
        </p>
      </section>

      <section className="space-y-4">
        <p className="type-overline">RadioGroup vurify-tiered</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          Same Free · Premium Solo/Team morph as the product tiered control — Premium pops out,
          Solo/Team occupy the half — with Vurify chrome: accent outline + text + underlines (no
          fill pills).
        </p>
        <RadioGroup
          aria-label="Vurify pricing tier"
          variant="vurify-tiered"
          tierLabel="Premium"
          options={[
            { value: 'free', label: 'Free' },
            { value: 'solo', label: 'Solo' },
            { value: 'team', label: 'Team' },
          ]}
          value={tier}
          onChange={setTier}
          size="md"
        />
        <p className="type-caption type-muted mb-0">
          Selected: <span className="font-mono">{tier}</span>
        </p>
      </section>
    </div>
  )
}
