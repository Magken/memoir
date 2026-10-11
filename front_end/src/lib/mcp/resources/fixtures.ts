import { FIXTURES } from '../../editorContext/fixtures'
import type { McpResourceDescriptor } from '../types'

export const MCP_FIXTURE_RESOURCES: McpResourceDescriptor[] = Object.keys(FIXTURES).map((id) => ({
  uri: `editor://fixture/${id}`,
  name: `Fixture: ${id}`,
  description: `Editor context demo fixture ${id}.`,
  mimeType: 'application/json',
}))

export function readFixtureResource(fixtureId: string): unknown {
  const fixture = FIXTURES[fixtureId]
  if (fixture === undefined) {
    throw new Error(`Unknown editor context fixture: ${fixtureId}`)
  }
  return structuredClone(fixture)
}
