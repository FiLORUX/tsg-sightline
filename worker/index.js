// File: worker/index.js
// Origin discipline for the tsg-sightline Worker.
//
// The tool is served to the public by the tsg-proxy Worker under
// /tsg/sightline on the apex; this Worker's own *.workers.dev hostname is an
// origin, never a surface. A request that reaches the origin name directly
// answers 308 to the canonical path, path and query preserved, so no search
// engine indexes a duplicate. The proxy marks its own fetches with
// X-Thast-Proxy and is served from the static assets.
//
// Rule: one canonical, the rest redirect (thast.se doctrine §2.4). The origin
// list per surface lives in thast.se/internal/data/surfaces.json and the
// nightly loop asserts that no origin is ever indexable.
const CANONICAL = 'https://xn--thst-roa.se/tsg/sightline';
const ORIGIN_SUFFIX = '.workers.dev';
const REDIRECT_STATUSES = new Set([301, 302, 307, 308]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const fromProxy = request.headers.has('x-thast-proxy');

    if (url.hostname.endsWith(ORIGIN_SUFFIX) && !fromProxy) {
      return Response.redirect(`${CANONICAL}${url.pathname}${url.search}`, 308);
    }

    const response = await env.ASSETS.fetch(request);

    // The asset layer normalises paths such as /index.html with a redirect
    // whose Location names this origin. Rewrite it onto the canonical host
    // so the origin name never appears in a response the proxy passes on.
    const location = response.headers.get('Location');
    if (location && REDIRECT_STATUSES.has(response.status)) {
      const target = new URL(location, url);
      if (target.hostname === url.hostname) {
        const headers = new Headers(response.headers);
        headers.set('Location', `${CANONICAL}${target.pathname}${target.search}`);
        return new Response(null, { status: response.status, headers });
      }
    }

    return response;
  },
};
