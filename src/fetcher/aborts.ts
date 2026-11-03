/** The in-flight requests of a {@link Fetcher} by the id the caller gave them. */
export class FetcherAborts {
  readonly #groups = new Map<string, Set<AbortController>>()

  /** Runs `fn` under a signal that {@link FetcherAborts.abort} with `id` fires. */
  public async track<T>(id: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController()
    this.#groups.set(id, (this.#groups.get(id) ?? new Set()).add(controller))

    try {
      return await fn(controller.signal)
    } finally {
      this.#release(id, controller)
    }
  }

  /** Aborts every in-flight request with `id`. Returns `false` when there is none. */
  public abort(id: string): boolean {
    const group = this.#groups.get(id)
    if (!group) return false

    // Delete first, so a request that starts with the same id later gets a new group.
    this.#groups.delete(id)
    group.forEach(controller => {
      controller.abort()
    })

    return true
  }

  // After an abort, the id maps to a newer group or to none, and this controller is in neither.
  #release(id: string, controller: AbortController): void {
    const group = this.#groups.get(id)
    group?.delete(controller)
    if (!group?.size) this.#groups.delete(id)
  }
}
