export type SceneRecord = {
  id: string
  label: string
  featureIds: readonly string[]
}

export function createSceneRegistry() {
  const scenes = new Map<string, SceneRecord>()
  return {
    register(record: SceneRecord): void {
      scenes.set(record.id, record)
    },
    unregister(id: string): boolean {
      return scenes.delete(id)
    },
    get(id: string): SceneRecord | undefined {
      return scenes.get(id)
    },
    list(): SceneRecord[] {
      return [...scenes.values()]
    },
    featuresFor(id: string): readonly string[] {
      return scenes.get(id)?.featureIds ?? []
    },
  }
}

export type SceneRegistry = ReturnType<typeof createSceneRegistry>
