export type DisposeFn = () => void

export function createDisposeRegistry() {
  const items = new Set<DisposeFn>()
  return {
    add(fn: DisposeFn): DisposeFn {
      items.add(fn)
      return () => {
        items.delete(fn)
      }
    },
    disposeAll(): number {
      const count = items.size
      for (const fn of items) fn()
      items.clear()
      return count
    },
    get size() {
      return items.size
    },
  }
}

export type DisposeRegistry = ReturnType<typeof createDisposeRegistry>
