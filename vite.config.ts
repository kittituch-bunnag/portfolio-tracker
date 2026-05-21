import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import https from 'node:https'
import type { Plugin } from 'vite'
import type { IncomingMessage } from 'node:http'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

interface YahooAuth { cookie: string; crumb: string; expiry: number }
let yahooAuth: YahooAuth | null = null

interface NodeResponse { status: number; body: string; setCookies: string[] }

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
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body, setCookies }))
      },
    ).on('error', reject)
  })
}

async function refreshYahooAuth(): Promise<YahooAuth> {
  // fc.yahoo.com is Yahoo's dedicated first-cookie endpoint — sets the A1 session cookie
  const fcRes = await nodeGet('https://fc.yahoo.com', { 'User-Agent': UA })
  let cookie = fcRes.setCookies.map((c) => c.split(';')[0]).filter(Boolean).join('; ')

  // Fallback: visit finance homepage (follows redirects, accumulates cookies)
  if (!cookie) {
    const homeRes = await nodeGet('https://finance.yahoo.com/', {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    })
    cookie = homeRes.setCookies.map((c) => c.split(';')[0]).filter(Boolean).join('; ')
  }

  if (!cookie) throw new Error('Could not obtain Yahoo Finance session cookies')

  const crumbRes = await nodeGet(
    'https://query2.finance.yahoo.com/v1/test/getcrumb',
    { 'User-Agent': UA, Cookie: cookie },
  )
  const crumb = crumbRes.body.trim()

  if (crumbRes.status >= 400) {
    throw new Error(`Yahoo Finance crumb fetch failed (HTTP ${crumbRes.status}): ${crumb.slice(0, 200)}`)
  }
  if (!crumb || crumb.startsWith('<')) {
    throw new Error(`Yahoo Finance returned invalid crumb: "${crumb.slice(0, 100)}"`)
  }

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

export default defineConfig({
  plugins: [react(), yahooFinancePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
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
})
