// The production workers.dev address remains the fixed backend if the public
// domain is served by another CDN. Named branch previews keep their own origin.
export const PRODUCTION_BACKEND = 'brainilab-web.brainilabquiz.workers.dev';
export const PUBLIC_HOST = 'brainilabgames.com';

export function productionRequest(request) {
  const url = new URL(request.url);
  if (url.protocol !== 'https:' || url.hostname !== PRODUCTION_BACKEND || url.port) return request;
  url.hostname = PUBLIC_HOST;
  // Preserve method, body and existing authentication headers. No forwarded
  // host header is trusted, and callers cannot choose another upstream.
  return new Request(url, request);
}
