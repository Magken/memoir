/**
 * Read kps_api_token from a dotenv file. The value is never logged.
 */
import fs from 'node:fs'

export function readKpsToken(envFile: string): string {
  const text = fs.readFileSync(envFile, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    if (key !== 'kps_api_token') continue
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!value.startsWith('kps_')) {
      throw new Error('kps_api_token must start with kps_')
    }
    return value
  }
  throw new Error('kps_api_token is missing')
}
