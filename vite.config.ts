import { defineConfig, type ViteDevServer } from 'vite'
import path from 'path'
import os from 'os'
import { pathToFileURL } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

type HonoLikeApp = {
  fetch: (req: Request) => Promise<Response> | Response
}

function localApiMiddleware() {
  let devServer: ViteDevServer | null = null
  let appPromise: Promise<HonoLikeApp> | null = null

  const loadDevApp = async (): Promise<HonoLikeApp> => {
    if (!devServer) {
      throw new Error('Vite dev server not initialized')
    }
    const mod = await devServer.ssrLoadModule('/supabase/functions/server/index.tsx')
    return (mod.app || mod.default) as HonoLikeApp
  }

  const loadPreviewApp = async (): Promise<HonoLikeApp> => {
    const { build } = await import('esbuild')
    const outfile = path.join(os.tmpdir(), `kian-hono-server-${process.pid}.mjs`)
    await build({
      entryPoints: [path.resolve(__dirname, 'supabase/functions/server/index.tsx')],
      outfile,
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node20',
      packages: 'external',
      logLevel: 'silent',
    })
    const mod = await import(pathToFileURL(outfile).href)
    return (mod.app || mod.default) as HonoLikeApp
  }

  const getApp = (mode: 'dev' | 'preview'): Promise<HonoLikeApp> => {
    if (!appPromise) {
      appPromise = (mode === 'dev' ? loadDevApp() : loadPreviewApp()).catch((err) => {
        appPromise = null
        throw err
      })
    }
    return appPromise
  }

  const createHandler = (mode: 'dev' | 'preview') => async (req: any, res: any, next: any) => {
    const urlPath = req.url || ''
    if (!urlPath.startsWith('/make-server-a2e7e82a')) {
      return next()
    }
    try {
      const honoApp = await getApp(mode)
      const protocol = req.headers['x-forwarded-proto'] || 'http'
      const host = req.headers.host || 'localhost:3000'
      const fullUrl = `${protocol}://${host}${urlPath}`

      const headers = new Headers()
      for (const [k, v] of Object.entries(req.headers)) {
        if (v === undefined) continue
        if (Array.isArray(v)) {
          for (const item of v) headers.append(k, String(item))
        } else {
          headers.set(k, String(v))
        }
      }

      const method = (req.method || 'GET').toUpperCase()
      let body: Buffer | undefined
      if (method !== 'GET' && method !== 'HEAD') {
        const chunks: Buffer[] = []
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        }
        body = Buffer.concat(chunks)
      }

      const webReq = new Request(fullUrl, {
        method,
        headers,
        body: body && body.length > 0 ? new Uint8Array(body) : undefined,
      })

      const webRes = await honoApp.fetch(webReq)
      res.statusCode = webRes.status
      webRes.headers.forEach((value, key) => {
        res.setHeader(key, value)
      })
      const arrayBuf = await webRes.arrayBuffer()
      res.end(Buffer.from(arrayBuf))
    } catch (err) {
      console.error('Local API middleware error:', err)
      if (!res.headersSent) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
      }
      res.end(JSON.stringify({ error: String((err as any)?.message || err) }))
    }
  }

  return {
    name: 'local-hono-api-middleware',
    configureServer(server: ViteDevServer) {
      devServer = server
      server.middlewares.use(createHandler('dev'))
      server.httpServer?.once('listening', () => {
        setTimeout(() => {
          getApp('dev').catch(() => {})
        }, 50)
      })
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(createHandler('preview'))
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    localApiMiddleware(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    entries: ['index.html', 'src/main.tsx'],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
    watch: {
      ignored: ['**/.data/**', '**/.playwright-cli/**', '**/.lint-dist/**', '**/dist/**'],
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
