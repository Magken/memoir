import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
} from 'd3'
import type { ForceGraphSpec, ForceSimLink, ForceSimNode } from './types'

export type ForceSimulationHandle = {
  simulation: Simulation<ForceSimNode, ForceSimLink>
  nodes: ForceSimNode[]
  links: ForceSimLink[]
  stop: () => void
}

export function createForceSimulation(
  spec: ForceGraphSpec,
  onTick: (nodes: ForceSimNode[], links: ForceSimLink[]) => void,
): ForceSimulationHandle {
  const nodes: ForceSimNode[] = spec.nodes.map((n) => ({ ...n }))
  const links: ForceSimLink[] = spec.links.map((l) => ({
    source: l.source,
    target: l.target,
    value: l.value,
  }))

  const degree = new Map<string, number>()
  for (const link of links) {
    degree.set(link.source as string, (degree.get(link.source as string) ?? 0) + 1)
    degree.set(link.target as string, (degree.get(link.target as string) ?? 0) + 1)
  }

  const simulation = forceSimulation<ForceSimNode, ForceSimLink>(nodes)
    .force(
      'link',
      forceLink<ForceSimNode, ForceSimLink>(links)
        .id((d) => d.id)
        .distance((d) => 56 + (d.value ?? 1) * 14)
        .strength(0.55),
    )
    .force('charge', forceManyBody<ForceSimNode>().strength(-340))
    .force('center', forceCenter(0, 0))
    .force(
      'collide',
      forceCollide<ForceSimNode>()
        .radius((d) => 16 + Math.min(10, (degree.get(d.id) ?? 0) * 1.5))
        .strength(0.85),
    )
    .alphaDecay(0.028)
    .on('tick', () => onTick(nodes, links))

  return {
    simulation,
    nodes,
    links,
    stop: () => {
      simulation.on('tick', null)
      simulation.stop()
    },
  }
}

export function pinNode(node: ForceSimNode, x: number, y: number) {
  node.fx = x
  node.fy = y
}

export function releaseNode(node: ForceSimNode) {
  node.fx = null
  node.fy = null
}
