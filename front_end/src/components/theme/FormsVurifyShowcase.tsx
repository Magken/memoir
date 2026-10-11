import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '../Input'
import { Select } from '../Select'
import { Textarea } from '../Textarea'
import {
  TextInputFx,
  TEXT_INPUT_FX_EFFECTS,
  TEXT_INPUT_FX_EFFECT_LABELS,
} from '../TextInputFx'
import { VurifyInput } from '../VurifyInput'
import { VurifyDateInput } from '../VurifyDateInput'
import { VurifyCountInput } from '../VurifyCountInput'
import { VurifyPasswordToggle } from '../VurifyPasswordToggle'
import { VurifySelect } from '../VurifySelect'
import { INTERVIEW_ROLE_CATEGORY_OPTIONS } from '../../lib/interviewBrief'

const VERIFY_SELECT_OPTIONS = [
  { value: 'hire', label: 'Hiring team' },
  { value: 'talent', label: 'Candidate' },
  { value: 'partner', label: 'Partner' },
] as const

/**
 * Theme lab — product Vurify / Verify fields + Codrops TextInputFx samples.
 */
export function FormsVurifyShowcase() {
  const [audience, setAudience] = useState('hire')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [opensAt, setOpensAt] = useState('')
  const [capacity, setCapacity] = useState('12')
  const [roleCategory, setRoleCategory] = useState('engineering-software')

  return (
    <div className="space-y-12">
      <p className="type-body-sm type-muted prose-measure mb-0">
        Verify signature chrome — housing 2px square lining (same language as{' '}
        <code className="type-code">VurifyMenuButton</code> housing). Product floating-label{' '}
        <code className="type-code">VurifyInput</code>, form{' '}
        <code className="type-code">Input</code> / <code className="type-code">Textarea</code> /{' '}
        <code className="type-code">Select</code> with{' '}
        <code className="type-code">variant=&quot;verify&quot;</code>, plus Codrops samples.
        Overview fields stay under{' '}
        <Link className="underline" to="/theme?section=forms">
          Forms
        </Link>
        .
      </p>

      <section className="space-y-6">
        <div className="space-y-2">
          <p className="type-overline">Vurify inputs</p>
          <p className="type-body-sm type-muted prose-measure mb-0">
            Floating label · <code className="type-code">line</code> keeps the bottom underline that
            thickens on focus. <code className="type-code">area</code> uses the Verify housing frame
            for long text.
          </p>
        </div>
        <div className="grid max-w-2xl gap-8">
          <div className="space-y-2">
            <p className="type-caption type-muted mb-0">
              <code className="type-code">variant=&quot;line&quot;</code>
            </p>
            <VurifyInput label="Full name" autoComplete="name" />
          </div>
          <div className="space-y-2">
            <p className="type-caption type-muted mb-0">
              <code className="type-code">variant=&quot;line&quot;</code>
              <span className="type-faint"> · email</span>
            </p>
            <VurifyInput label="Email" type="email" autoComplete="email" />
          </div>
          <div className="space-y-2">
            <p className="type-caption type-muted mb-0">
              <code className="type-code">VurifyDateInput</code>
              <span className="type-faint"> · digits + auto dashes</span>
            </p>
            <VurifyDateInput label="Opens" value={opensAt} onValueChange={setOpensAt} />
          </div>
          <div className="space-y-2">
            <p className="type-caption type-muted mb-0">
              <code className="type-code">VurifyCountInput</code>
              <span className="type-faint"> · digits + steppers</span>
            </p>
            <VurifyCountInput
              label="Capacity"
              value={capacity}
              onValueChange={setCapacity}
              min={1}
              max={999}
            />
          </div>
          <div className="space-y-2">
            <p className="type-caption type-muted mb-0">
              <code className="type-code">VurifySelect</code>
              <span className="type-faint"> · typable filter combobox</span>
            </p>
            <VurifySelect
              label="Role category"
              options={INTERVIEW_ROLE_CATEGORY_OPTIONS}
              value={roleCategory}
              onChange={setRoleCategory}
              placeholder="Type to filter…"
            />
          </div>
          <div className="space-y-2">
            <p className="type-caption type-muted mb-0">
              <code className="type-code">VurifyPasswordToggle</code>
              <span className="type-faint"> · trailing Eye / EyeOff</span>
            </p>
            <VurifyInput
              label="Password"
              type={passwordVisible ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              trailing={
                <VurifyPasswordToggle
                  revealed={passwordVisible}
                  onToggle={() => setPasswordVisible((v) => !v)}
                />
              }
            />
          </div>
          <div className="space-y-2">
            <p className="type-caption type-muted mb-0">
              <code className="type-code">variant=&quot;area&quot;</code>
              <span className="type-faint"> · thick housing frame</span>
            </p>
            <VurifyInput variant="area" label="Message" rows={5} autoComplete="off" />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <p className="type-overline">Form fields · Verify</p>
          <p className="type-body-sm type-muted prose-measure mb-0">
            Same Field chrome as Forms overview, with{' '}
            <code className="type-code">variant=&quot;verify&quot;</code>. Select list scroll
            defaults to <code className="type-code">hidden</code>.
          </p>
        </div>
        <div className="grid max-w-2xl gap-6">
          <Input
            label="Name"
            variant="verify"
            placeholder="Verify line field"
            autoComplete="name"
          />
          <Textarea
            label="Message"
            variant="verify"
            placeholder="Verify long text — full housing frame"
            rows={4}
            showCounter={false}
          />
          <Select
            label="Audience"
            variant="verify"
            options={VERIFY_SELECT_OPTIONS}
            value={audience}
            onChange={setAudience}
            placeholder="Choose…"
          />
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <p className="type-overline">Verify samples</p>
          <p className="type-body-sm type-muted prose-measure mb-0">
            Codrops-style shells via <code className="type-code">TextInputFx</code> —{' '}
            {TEXT_INPUT_FX_EFFECTS.length} named motions (Haruki → Manami). Study only — not product
            fields.
          </p>
        </div>
        <div className="grid max-w-2xl gap-8 sm:grid-cols-2">
          {TEXT_INPUT_FX_EFFECTS.map((effect, index) => (
            <div key={effect} className="space-y-2">
              <p className="type-caption type-muted mb-0">
                <span className="font-mono tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                <span className="type-faint"> · </span>
                <code className="type-code">effect=&quot;{effect}&quot;</code>
              </p>
              <TextInputFx
                effect={effect}
                label={TEXT_INPUT_FX_EFFECT_LABELS[effect]}
                autoComplete="off"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
