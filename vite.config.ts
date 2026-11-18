import { defineConfig, loadEnv, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { v3IdrakProxyPlugin } from './server/v3-idrak-proxy-plugin.ts'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }): UserConfig => {
  const env = loadEnv(mode, rootDir, '')
  return {
    plugins: [react(), tailwindcss(), v3IdrakProxyPlugin(env, rootDir)],
    envDir: rootDir,
    envPrefix: 'VITE_',
    resolve: {
      alias: {
        '@': path.resolve(rootDir, 'src'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
  }
})
