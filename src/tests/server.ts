/** A server that {@link serve} started. */
export type TestServer = ReturnType<typeof Bun.serve>

/** Answers one path of a test server. */
export type TestRoute = (req: Request) => Response | Promise<Response>

/** Starts a server on a free port that answers `routes` by path, and 500 for any other path. */
export const serve = (routes: Record<string, TestRoute>): TestServer => {
  return Bun.serve({
    port: 0,
    fetch: req => routes[new URL(req.url).pathname]?.(req) ?? new Response(null, { status: 500 }),
  })
}

/** Returns the `/api` URL of `server`, the base URL of the fetcher tests. */
export const apiUrl = (server: TestServer): string => new URL('/api', server.url).href
