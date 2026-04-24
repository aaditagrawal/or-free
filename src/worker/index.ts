// Cloudflare Worker entry for production.
// Proxies /api/models to the upstream ORCA endpoint (no CORS on upstream),
// and otherwise serves the static asset bundle.

const ORCA_URL = 'https://orca.orb.town/api/preview/v2/models'

type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/models') {
      return proxyModels(request)
    }

    return env.ASSETS.fetch(request)
  },
}

async function proxyModels(request: Request): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const upstream = await fetch(ORCA_URL, {
    method: request.method,
    headers: { Accept: 'application/json' },
  })

  const headers = new Headers(upstream.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Cache-Control', 'public, max-age=60')

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  })
}
