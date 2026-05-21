import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import https from 'node:https'
import type { Plugin } from 'vite'
import type { IncomingMessage } from 'node:http'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// ---------------------------------------------------------------------------
// Shared HTTP helpers
// ---------------------------------------------------------------------------
interface NodeResponse { status: number; body: string; setCookies: string[]; finalUrl: string }

function nodeGet(urlStr: string, headers: Record<string, string>, redirectsLeft = 5): Promise<NodeResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    https.get(
      { hostname: url.hostname, path: url.pathname + url.search, headers, maxHeaderSize: 81920 },
      (res: IncomingMessage) => {
        const setCookies = (res.headers['set-cookie'] ?? []) as string[]
        if ([301, 302, 303, 307, 308].includes(res.statusCode ?? 0) && res.headers.location && redirectsLeft > 0) {
          res.resume()
          const loc = res.headers.location as string
          const nextUrl = loc.startsWith('http') ? loc : `https://${url.hostname}${loc}`
          const merged = [
            ...(headers.Cookie ? headers.Cookie.split('; ') : []),
            ...setCookies.map((c) => c.split(';')[0]),
          ].filter(Boolean).join('; ')
          nodeGet(nextUrl, { ...headers, Cookie: merged }, redirectsLeft - 1)
            .then((r) => resolve({ ...r, setCookies: [...setCookies, ...r.setCookies] }))
            .catch(reject)
          return
        }
        let body = ''
        res.on('data', (d: Buffer) => { body += d.toString() })
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body, setCookies, finalUrl: urlStr }))
      },
    ).on('error', reject)
  })
}

function nodePost(urlStr: string, body: object, headers: Record<string, string>): Promise<NodeResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const bodyStr = JSON.stringify(body)
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr), ...headers },
        maxHeaderSize: 81920,
      },
      (res: IncomingMessage) => {
        const setCookies = (res.headers['set-cookie'] ?? []) as string[]
        let resBody = ''
        res.on('data', (d: Buffer) => { resBody += d.toString() })
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: resBody, setCookies, finalUrl: urlStr }))
      },
    )
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

// ---------------------------------------------------------------------------
// Yahoo Finance plugin — cookie + crumb auth
// ---------------------------------------------------------------------------
interface YahooAuth { cookie: string; crumb: string; expiry: number }
let yahooAuth: YahooAuth | null = null

async function refreshYahooAuth(): Promise<YahooAuth> {
  const initRes = await nodeGet('https://query2.finance.yahoo.com/v1/test/getcrumb', { 'User-Agent': UA })
  let cookie = initRes.setCookies.map((c) => c.split(';')[0]).filter(Boolean).join('; ')

  if (!cookie) {
    const homeRes = await nodeGet('https://finance.yahoo.com/', {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    })
    cookie = homeRes.setCookies.map((c) => c.split(';')[0]).filter(Boolean).join('; ')
  }

  const crumbRes = await nodeGet('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    'User-Agent': UA, Cookie: cookie,
  })
  const crumb = crumbRes.body.trim()

  if (crumbRes.status >= 400) throw new Error(`Yahoo Finance crumb fetch failed (HTTP ${crumbRes.status}): ${crumb.slice(0, 200)}`)
  if (!crumb || crumb.startsWith('<')) throw new Error(`Yahoo Finance returned invalid crumb: "${crumb.slice(0, 100)}"`)

  yahooAuth = { cookie, crumb, expiry: Date.now() + 30 * 60 * 1000 }
  return yahooAuth
}

function yahooFinancePlugin(): Plugin {
  return {
    name: 'yahoo-finance-proxy',
    configureServer(server) {
      refreshYahooAuth()
        .then(() => console.log('[yahoo-finance-proxy] auth OK, crumb:', yahooAuth?.crumb))
        .catch((e: Error) => console.error('[yahoo-finance-proxy] auth failed at startup:', e.message))

      server.middlewares.use('/api/yahoo', async (req, res) => {
        try {
          if (!yahooAuth || Date.now() > yahooAuth.expiry) await refreshYahooAuth()

          const doRequest = (auth: YahooAuth) => {
            const url = new URL(`https://query1.finance.yahoo.com${req.url}`)
            url.searchParams.set('crumb', auth.crumb)
            return nodeGet(url.toString(), { 'User-Agent': UA, Cookie: auth.cookie })
          }

          let upstream = await doRequest(yahooAuth!)
          if (upstream.status === 401) {
            await refreshYahooAuth()
            upstream = await doRequest(yahooAuth!)
          }

          res.statusCode = upstream.status
          res.setHeader('Content-Type', 'application/json')
          res.end(upstream.body)
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          console.error('[yahoo-finance-proxy]', msg)
          if (!res.headersSent) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: msg }))
          }
        }
      })
    },
  }
}

// ---------------------------------------------------------------------------
// Finnomena plugin — email/password auth → access_token cookie
// ---------------------------------------------------------------------------
interface FinnomenaAuth { cookie: string; expiry: number }
let finnomenaAuth: FinnomenaAuth | null = null

async function refreshFinnomenaAuth(email: string, password: string): Promise<FinnomenaAuth> {
  // Step 1: get login challenge from the auth redirect URL
  const loginActionRes = await nodeGet(
    'https://www.finnomena.com/fn3/api/auth/loginaction?return_url=https://www.finnomena.com/&action=login&device=web',
    { 'User-Agent': UA },
  )
  const challenge = loginActionRes.finalUrl.split('=').pop() ?? ''
  if (!challenge) throw new Error('Finnomena: could not extract login challenge')

  // Step 2: POST credentials to auth server
  const loginRes = await nodePost(
    'https://auth.finnomena.com/api/web/login',
    { email, password, challenge },
    { 'User-Agent': UA },
  )
  let redirectTo: string
  try {
    const loginData = JSON.parse(loginRes.body)
    redirectTo = loginData?.data?.redirect_to ?? ''
  } catch {
    throw new Error(`Finnomena login failed (HTTP ${loginRes.status}): ${loginRes.body.slice(0, 200)}`)
  }
  if (!redirectTo) throw new Error(`Finnomena login: no redirect_to in response: ${loginRes.body.slice(0, 200)}`)

  // Step 3: follow redirect to get access_token cookie
  const redirectRes = await nodeGet(redirectTo, { 'User-Agent': UA })
  const allCookies = [...loginRes.setCookies, ...redirectRes.setCookies]
  const cookieMap = new Map<string, string>()
  for (const c of allCookies) {
    const eqIdx = c.indexOf('=')
    if (eqIdx === -1) continue
    cookieMap.set(c.slice(0, eqIdx).trim(), c.slice(eqIdx + 1).trim())
  }

  const accessToken = cookieMap.get('access_token')
  if (!accessToken) throw new Error('Finnomena login: access_token cookie not received')

  finnomenaAuth = { cookie: `access_token=${accessToken}`, expiry: Date.now() + 60 * 60 * 1000 }
  return finnomenaAuth
}

function finnomenaPlugin(email: string, password: string): Plugin {
  return {
    name: 'finnomena-proxy',
    configureServer(server) {
      refreshFinnomenaAuth(email, password)
        .then(() => console.log('[finnomena-proxy] auth OK'))
        .catch((e: Error) => console.error('[finnomena-proxy] auth failed at startup:', e.message))

      server.middlewares.use('/api/finnomena', async (req, res) => {
        try {
          if (!finnomenaAuth || Date.now() > finnomenaAuth.expiry) {
            await refreshFinnomenaAuth(email, password)
          }

          const upstream = await nodeGet(
            `https://www.finnomena.com${req.url}`,
            { 'User-Agent': UA, Cookie: finnomenaAuth!.cookie },
          )

          // {} means auth expired — refresh once and retry
          if (upstream.body === '{}' || upstream.status === 401) {
            await refreshFinnomenaAuth(email, password)
            const retry = await nodeGet(
              `https://www.finnomena.com${req.url}`,
              { 'User-Agent': UA, Cookie: finnomenaAuth!.cookie },
            )
            res.statusCode = retry.status
            res.setHeader('Content-Type', 'application/json')
            res.end(retry.body)
            return
          }

          res.statusCode = upstream.status
          res.setHeader('Content-Type', 'application/json')
          res.end(upstream.body)
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          console.error('[finnomena-proxy]', msg)
          if (!res.headersSent) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: msg }))
          }
        }
      })
    },
  }
}

// ---------------------------------------------------------------------------
// Vite config
// ---------------------------------------------------------------------------
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const finnomenaEmail = env.FINNOMENA_EMAIL
  const finnomenaPassword = env.FINNOMENA_PASSWORD

  const plugins: Plugin[] = [react() as Plugin, yahooFinancePlugin()]
  if (finnomenaEmail && finnomenaPassword) {
    plugins.push(finnomenaPlugin(finnomenaEmail, finnomenaPassword))
  } else {
    console.warn('[finnomena-proxy] FINNOMENA_EMAIL / FINNOMENA_PASSWORD not set — Thai MF auto-price disabled')
  }

  return {
    plugins,
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      proxy: {
        '/api/coingecko': {
          target: 'https://api.coingecko.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/coingecko/, ''),
        },
        '/api/exchangerate': {
          target: 'https://open.er-api.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/exchangerate/, ''),
        },
      },
    },
  }
})
