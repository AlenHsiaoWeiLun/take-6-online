/**
 * Cloudflare Worker for the static site. Real files (assets, prerendered landing pages) are served
 * by the assets layer before this runs; anything else is a client route like /play/ABCD, so it gets
 * the untouched SPA shell. Missing files with an extension stay 404s.
 */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (/\.[a-z0-9]+$/i.test(url.pathname) || (request.method !== 'GET' && request.method !== 'HEAD')) {
      return new Response('Not found', { status: 404 });
    }
    // html_handling "drop-trailing-slash" serves app.html at /app (and 307s /app.html there).
    const shell = await env.ASSETS.fetch(new Request(new URL('/app', url), request));
    if (!shell.ok) return shell;
    const headers = new Headers(shell.headers);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
    return new Response(shell.body, { status: 200, headers });
  },
};
