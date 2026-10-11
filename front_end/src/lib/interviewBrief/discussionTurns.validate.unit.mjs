/**
 * Discussion-turn packs live on Edge (interview-talk-turn) — SSOT like Vurex compose examples.
 * Run: npm run front_end:test:discussion-turns
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const edgeValidator = join(
  root,
  '../../../../back_end/supabase/functions/interview-talk-turn/examples.validate.unit.mjs',
)
const r = spawnSync(process.execPath, [edgeValidator], { stdio: 'inherit' })
process.exit(r.status ?? 1)
