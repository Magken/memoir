import { useState } from 'react'
import {
  BACKEND_SYSTEMS,
  type BackendOfferingKind,
  type BackendSystem,
} from '../../lib/backendCatalog'
import { Input } from '../Input'

const KIND_LABEL: Record<BackendOfferingKind, string> = {
  rpc: 'RPC',
  helper: 'Helper',
  resource: 'Resource',
  catalog: 'Catalog',
  edge: 'Edge',
  client: 'Client',
  table: 'Table',
}

function matchesQuery(system: BackendSystem, q: string): boolean {
  if (!q) return true
  const hay = [
    system.id,
    system.title,
    system.summary,
    system.hotWire,
    system.memoir,
    ...system.feLibs,
    ...system.offerings.map((o) => `${o.name} ${o.summary} ${o.kind}`),
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

export function BackendSystemsShowcase() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const systems = BACKEND_SYSTEMS.filter((s) => matchesQuery(s, q))

  return (
    <div className="space-y-8 max-w-3xl">
      <header className="space-y-3">
        <p className="type-overline">Backend systems</p>
        <p className="type-body-sm type-muted prose-measure">
          Summary catalog of what each platform system offers — data platform, user system, mail,
          notifications, cron, and companions. Live labs stay under User management / Platform
          services; this page is the human lookup index.
        </p>
        <Input
          label="Filter systems or offerings"
          size="sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. mail_enqueue, cron, prefs…"
        />
        <p className="type-muted type-body-sm">
          Showing {systems.length} of {BACKEND_SYSTEMS.length} systems · memoir under{' '}
          <span className="type-code">project_indexer/back_end/</span>
        </p>
      </header>

      <div className="space-y-6">
        {systems.length === 0 ? (
          <p className="type-body-sm type-muted">No systems match that filter.</p>
        ) : (
          systems.map((system) => <SystemBlock key={system.id} system={system} />)
        )}
      </div>
    </div>
  )
}

function SystemBlock({ system }: { system: BackendSystem }) {
  return (
    <section className="space-y-3 rounded border border-[var(--theme-border)] p-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="type-title-sm">{system.title}</h2>
          <span className="type-code type-muted">{system.id}</span>
        </div>
        <p className="type-body-sm type-muted prose-measure">{system.summary}</p>
      </div>

      <dl className="grid gap-2 type-body-sm sm:grid-cols-[7rem_1fr]">
        <dt className="type-muted">Memoir</dt>
        <dd className="type-code">project_indexer/back_end/{system.memoir}</dd>
        <dt className="type-muted">FE libs</dt>
        <dd className="type-code">{system.feLibs.join(' · ')}</dd>
        <dt className="type-muted">Hot-wire</dt>
        <dd className="prose-measure">{system.hotWire}</dd>
        {system.themeLab ? (
          <>
            <dt className="type-muted">Theme lab</dt>
            <dd>
              <a className="underline" href={system.themeLab}>
                {system.themeLab}
              </a>
            </dd>
          </>
        ) : null}
      </dl>

      <div className="space-y-2">
        <p className="type-label">Offerings</p>
        <ul className="space-y-2">
          {system.offerings.map((o) => (
            <li
              key={`${system.id}-${o.name}`}
              className="flex flex-wrap gap-x-3 gap-y-1 border-t border-[var(--theme-border)] pt-2 first:border-t-0 first:pt-0"
            >
              <span className="type-code shrink-0 w-16 type-muted">{KIND_LABEL[o.kind]}</span>
              <span className="type-code min-w-[10rem] flex-1">{o.name}</span>
              <span className="type-body-sm type-muted basis-full sm:basis-auto sm:flex-[2]">
                {o.summary}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
