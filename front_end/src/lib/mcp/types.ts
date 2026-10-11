/**
 * MCP resource and tool descriptor types (stub — no live server).
 */

export type McpResourceDescriptor = {
  uri: string
  name: string
  description: string
  mimeType?: string
}

export type McpToolParameter = {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object'
  description: string
  required?: boolean
}

export type McpToolDescriptor = {
  name: string
  description: string
  parameters: McpToolParameter[]
}
