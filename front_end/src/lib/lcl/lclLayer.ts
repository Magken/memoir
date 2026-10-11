/**
 * LCL layer tree — expand-in-place nested content for LclLayout.
 */

export const LCL_LAYER_OUT_MS = 550
export const LCL_LAYER_IN_MS = 900

export type LclBlock =
  | { kind: 'p'; text: string }
  | { kind: 'ol'; items: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'code'; text: string }
  | { kind: 'group'; title: string; items: string[] }

export type LclLayer = {
  id: string
  title: string
  overline?: string
  meta?: string
  lead?: string
  body?: string
  cover?: number
  blocks?: LclBlock[]
  layers?: LclLayer[]
}

export function lclLayerAt(root: LclLayer, path: readonly string[]): LclLayer | null {
  if (!path.length) return root
  if (path[0] !== root.id) return null
  let current = root
  for (const id of path.slice(1)) {
    const next = current.layers?.find((layer) => layer.id === id)
    if (!next) return null
    current = next
  }
  return current
}

const MCP_JSON = `{
  "servers": {
    "DevBox": {
      "command": "npx",
      "args": ["-y", "@microsoft/devbox-mcp@latest"]
    }
  }
}`

/** Sample nested copy for the first constructor preview — Dev Box MCP as seen. */
export const LCL_PREVIEW_LAYERS: Record<string, LclLayer> = {
  s1: {
    id: 's1',
    title: 'Dev Box',
    overline: 'MCP Registry',
    meta: 'microsoft · 13',
    cover: 0,
    lead: 'Natural-language tools for Microsoft Dev Box — the box itself, projects, pools, and the work that runs on them.',
    layers: [
      {
        id: 'start',
        title: 'Getting started',
        overline: 'Prerequisites',
        lead: 'A host, a subscription, and a project. Nothing else on this layer.',
        blocks: [
          {
            kind: 'ol',
            items: [
              'Node.js 18 or newer',
              'An Azure subscription with a provisioned Dev Center',
              'At least one Dev Center project, plus RBAC on those resources',
            ],
          },
          {
            kind: 'group',
            title: 'MCP host',
            items: [
              'Visual Studio Code with GitHub Copilot',
              'Visual Studio 2022 17.14 or later',
            ],
          },
        ],
      },
      {
        id: 'install',
        title: 'Installation',
        overline: 'VS Code',
        lead: 'One-click from the registry, or this server block in .vscode/mcp.json.',
        blocks: [
          { kind: 'code', text: MCP_JSON },
        ],
      },
      {
        id: 'faq',
        title: 'FAQ',
        overline: 'Repair',
        lead: 'Two failures that look like the server, and are not.',
        blocks: [
          {
            kind: 'group',
            title: 'Tool has no implementation registered',
            items: [
              'Open the command palette',
              'Run MCP: Reset cached tools',
              'Restart the MCP server',
            ],
          },
          {
            kind: 'group',
            title: 'Cannot find module keytar.node',
            items: ['Run npx clear-npx-cache, then start the server again.'],
          },
        ],
      },
    ],
  },
  s2: {
    id: 's2',
    title: 'Tools',
    overline: 'Supported',
    meta: 'scope patterns',
    cover: 1,
    lead: 'Unified tools for boxes, projects, pools, power, schedules, and customization. Open one group.',
    layers: [
      {
        id: 'lifecycle',
        title: 'Lifecycle',
        overline: 'Boxes',
        lead: 'One resource tool. Scope chooses the box; the operation chooses read, create, or delete.',
        blocks: [
          {
            kind: 'ul',
            items: [
              'List across projects, or inside one project',
              'Read a named box, or query that name across projects',
              'Create or delete by project scope',
              'List pools on a project',
            ],
          },
        ],
      },
      {
        id: 'projects',
        title: 'Projects',
        overline: 'Catalog',
        lead: 'The Dev Center projects the host can see.',
        blocks: [
          {
            kind: 'ul',
            items: ['List every project', 'Read one project by name'],
          },
        ],
      },
      {
        id: 'pools',
        title: 'Pools',
        overline: 'Capacity',
        lead: 'Available Dev Box pools on a project — the shapes you can create from.',
        blocks: [
          {
            kind: 'ul',
            items: ['List pools by project'],
          },
        ],
      },
      {
        id: 'actions',
        title: 'Actions',
        overline: 'Power',
        lead: 'Start, stop, restart, repair, remote connection — then the schedule on that box.',
        blocks: [
          {
            kind: 'group',
            title: 'Box',
            items: ['Start', 'Stop', 'Restart', 'Repair', 'Get remote connection'],
          },
          {
            kind: 'group',
            title: 'Schedule',
            items: ['List all', 'Delay all', 'Skip all'],
          },
        ],
      },
      {
        id: 'customize',
        title: 'Customization',
        overline: 'Tasks',
        lead: 'Task definitions, groups, imaging logs, run-on-box, and the desktop theme.',
        blocks: [
          {
            kind: 'ul',
            items: [
              'List and get task definitions; validate a list',
              'List, get, and create customization groups',
              'Imaging and task logs',
              'Run tasks on a box',
              'Set dark or light theme',
            ],
          },
        ],
      },
      {
        id: 'operations',
        title: 'Operations',
        overline: 'Status',
        lead: 'Long-running work has a status you can read while it finishes.',
        blocks: [
          {
            kind: 'ul',
            items: ['Get operation status'],
          },
        ],
      },
      {
        id: 'thinking',
        title: 'Thinking',
        overline: 'Context',
        lead: 'A think tool that holds Dev Box context while the other tools run.',
        blocks: [
          {
            kind: 'ul',
            items: ['DevBox Think'],
          },
        ],
      },
      {
        id: 'auth',
        title: 'Authentication',
        overline: 'Azure',
        lead: 'DefaultAzureCredential, then WAM on Windows. The chain walks until one works.',
        blocks: [
          {
            kind: 'ol',
            items: [
              'Environment variables',
              'Managed identity',
              'Visual Studio',
              'Azure CLI',
              'Azure PowerShell',
              'Azure Developer CLI',
              'Windows SSO (WAM)',
            ],
          },
          {
            kind: 'group',
            title: 'If the chain misses',
            items: [
              'Sign in to Windows SSO or Azure CLI',
              'Confirm subscription permissions',
              'az login --tenant when the default tenant is wrong',
            ],
          },
        ],
      },
    ],
  },
}
