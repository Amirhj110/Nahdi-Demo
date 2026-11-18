import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Connect, Plugin } from 'vite'
import { readIdrakConfig, type IdrakEnv } from './idrak-config.ts'
import { handleDermIQSkinAnalysis } from './dermiq-skin-analysis.ts'
import { handleTtsProxy } from './tts-proxy.ts'
import { handleSttProxy } from './stt-proxy.ts'

type HandleIdrakProxy = (
  req: IncomingMessage,
  res: ServerResponse,
  config: ReturnType<typeof readIdrakConfig>,
) => Promise<boolean>

/**
 * Load the server-side proxy by absolute file URL so it works in dev and preview.
 */
export function v3IdrakProxyPlugin(env: IdrakEnv, projectDir: string): Plugin {
  const proxyFile = path.join(projectDir, 'server', 'idrak-proxy.ts')
  const proxyUrl = pathToFileURL(proxyFile).href

  const liveConfig = () =>
    readIdrakConfig({
      IDRAK_BASE_URL: process.env.IDRAK_BASE_URL || env.IDRAK_BASE_URL,
      IDRAK_API_KEY: process.env.IDRAK_API_KEY || env.IDRAK_API_KEY,
      IDRAK_AGENT_KEY: process.env.IDRAK_AGENT_KEY || env.IDRAK_AGENT_KEY,
      IDRAK_CHAT_API_KEY: process.env.IDRAK_CHAT_API_KEY || env.IDRAK_CHAT_API_KEY,
      IDRAK_TTS_API_KEY: process.env.IDRAK_TTS_API_KEY || env.IDRAK_TTS_API_KEY,
      IDRAK_ALLOWED_ORIGINS: process.env.IDRAK_ALLOWED_ORIGINS || env.IDRAK_ALLOWED_ORIGINS,
      REALTIME_TOKEN_API_KEY:
        process.env.REALTIME_TOKEN_API_KEY || env.REALTIME_TOKEN_API_KEY,
      VOICE_SERVER_API_KEY: process.env.VOICE_SERVER_API_KEY || env.VOICE_SERVER_API_KEY,
      VOICE_TOKEN_BASE_URL: process.env.VOICE_TOKEN_BASE_URL || env.VOICE_TOKEN_BASE_URL,
      VOICE_SERVER_BASE_URL: process.env.VOICE_SERVER_BASE_URL || env.VOICE_SERVER_BASE_URL,
    })

  const mount = (middlewares: Connect.Server) => {
    middlewares.use((req, res, next) => {
      const pathname = new URL(req.url || '/', 'http://localhost').pathname
      if (pathname === '/api/assistant/skin-analysis' && req.method === 'POST') {
        void handleDermIQSkinAnalysis(
          req,
          res,
          process.env.DERMIQ_API_KEY || env.DERMIQ_API_KEY,
          process.env.GEMINI_VISION_API_KEY || env.GEMINI_VISION_API_KEY,
        ).catch((error: unknown) => {
          console.error('[nahdi-v3-skin-analysis]', error)
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ error: 'vision_request_failed' }))
          }
        })
        return
      }

      if (pathname === '/api/assistant/tts' && req.method === 'POST') {
        void handleTtsProxy(
          req,
          res,
          process.env.IDRAK_TTS_API_KEY ||
            env.IDRAK_TTS_API_KEY ||
            process.env.IDRAK_API_KEY ||
            env.IDRAK_API_KEY ||
            process.env.IDRAK_CHAT_API_KEY ||
            env.IDRAK_CHAT_API_KEY ||
            '',
        ).catch((error: unknown) => {
          console.error('[nahdi-v3-tts]', error)
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ error: 'voice_request_failed' }))
          }
        })
        return
      }

      if (pathname === '/api/assistant/stt' && req.method === 'POST') {
        void handleSttProxy(
          req,
          res,
          process.env.IDRAK_TTS_API_KEY ||
            env.IDRAK_TTS_API_KEY ||
            process.env.IDRAK_API_KEY ||
            env.IDRAK_API_KEY ||
            process.env.IDRAK_CHAT_API_KEY ||
            env.IDRAK_CHAT_API_KEY ||
            '',
        ).catch((error: unknown) => {
          console.error('[nahdi-v3-stt]', error instanceof Error ? error.message : 'unknown failure')
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ error: 'Speech recognition is temporarily unavailable.' }))
          }
        })
        return
      }

      void import(/* @vite-ignore */ proxyUrl)
        .then((mod) => {
          const handleIdrakProxy = (mod as { handleIdrakProxy: HandleIdrakProxy }).handleIdrakProxy
          return handleIdrakProxy(req, res, liveConfig())
        })
        .then((handled) => {
          if (!handled) next()
        })
        .catch((error: unknown) => {
          console.error('[nahdi-v3-idrak-proxy]', error)
          next()
        })
    })
  }

  return {
    name: 'nahdi-v3-idrak-proxy',
    configureServer(server) {
      mount(server.middlewares)
    },
    configurePreviewServer(server) {
      mount(server.middlewares)
    },
  }
}
