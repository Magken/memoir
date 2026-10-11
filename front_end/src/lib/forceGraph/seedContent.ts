/** Small starter graph for the workbench. */
export const SEED_FORCE_GRAPH = `{
  "nodes": [
    { "id": "a", "label": "Source", "group": 0 },
    { "id": "b", "label": "Parse", "group": 1 },
    { "id": "c", "label": "Layout", "group": 1 },
    { "id": "d", "label": "Render", "group": 2 },
    { "id": "e", "label": "Preview", "group": 2 }
  ],
  "links": [
    { "source": "a", "target": "b", "value": 2 },
    { "source": "b", "target": "c", "value": 1 },
    { "source": "c", "target": "d", "value": 2 },
    { "source": "d", "target": "e", "value": 1 },
    { "source": "b", "target": "e", "value": 1 }
  ]
}
`

/** Richer fixture for editor-context demos. */
export const SEED_FORCE_GRAPH_COMPLEX = `{
  "nodes": [
    { "id": "core", "label": "Core", "group": 0 },
    { "id": "auth", "label": "Auth", "group": 1 },
    { "id": "api", "label": "API", "group": 1 },
    { "id": "db", "label": "Database", "group": 2 },
    { "id": "cache", "label": "Cache", "group": 2 },
    { "id": "ui", "label": "UI", "group": 3 },
    { "id": "docs", "label": "Docs", "group": 3 },
    { "id": "queue", "label": "Queue", "group": 4 },
    { "id": "worker", "label": "Worker", "group": 4 },
    { "id": "metrics", "label": "Metrics", "group": 0 }
  ],
  "links": [
    { "source": "ui", "target": "api", "value": 3 },
    { "source": "api", "target": "auth", "value": 2 },
    { "source": "api", "target": "db", "value": 3 },
    { "source": "api", "target": "cache", "value": 2 },
    { "source": "auth", "target": "db", "value": 1 },
    { "source": "api", "target": "queue", "value": 2 },
    { "source": "queue", "target": "worker", "value": 2 },
    { "source": "worker", "target": "db", "value": 1 },
    { "source": "core", "target": "api", "value": 2 },
    { "source": "core", "target": "metrics", "value": 1 },
    { "source": "docs", "target": "ui", "value": 1 },
    { "source": "metrics", "target": "worker", "value": 1 }
  ]
}
`
