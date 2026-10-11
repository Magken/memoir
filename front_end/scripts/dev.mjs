import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import getPort from 'get-port'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const targetPort = await getPort({ port: 5173 })
const netlifyPort = await getPort({ port: 8888 })

console.log(`\n  Local URL → http://localhost:${netlifyPort}`)
console.log(`  Vite (behind proxy) → ${targetPort}\n`)

const child = spawn(
  'npx',
  ['netlify', 'dev', '--port', String(netlifyPort), '--target-port', String(targetPort)],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(targetPort) },
    shell: true,
  },
)

child.on('exit', (code) => process.exit(code ?? 0))
