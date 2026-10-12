/** Auth and the Data API occasionally disagree on a brand-new token's issue time.
 * Only that explicit pre-execution rejection is retried; permission failures stay failures.
 */
export function createSessionFetch(fetcher: typeof fetch = (...args) => globalThis.fetch(...args), wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))): typeof fetch {
  return async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (!url.includes('/rest/v1/')) return await fetcher(input, init);
    const request = new Request(input, init);
    for (let attempt = 0; ; attempt += 1) {
      const response = await fetcher(request.clone());
      if (response.status !== 401 || attempt >= 3) return response;
      const body: unknown = await response.clone().json().catch(() => null);
      if (!body || typeof body !== 'object' || !('message' in body) || body.message !== 'JWT issued at future') return response;
      if (request.signal.aborted) return response;
      await wait(1500);
      if (request.signal.aborted) return response;
    }
  };
}
