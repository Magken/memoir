export type ForceNode = {
  id: string
  label?: string
  group?: string | number
}

export type ForceLink = {
  source: string
  target: string
  value?: number
}

export type ForceGraphSpec = {
  nodes: ForceNode[]
  links: ForceLink[]
}

export type ForceSimNode = ForceNode & {
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
  index?: number
}

export type ForceSimLink = {
  source: string | ForceSimNode
  target: string | ForceSimNode
  value?: number
  index?: number
}
