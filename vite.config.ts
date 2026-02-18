import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'csp-connect-src',
      transformIndexHtml(html, ctx) {
        const isDev = !!ctx?.server
        const connectSrc = isDev
          ? `'self' https: http://localhost:5173 http://127.0.0.1:5173 ws://localhost:5173 ws://127.0.0.1:5173`
          : `'self' https:`
        return html.replace('__CSP_CONNECT_SRC__', connectSrc)
      },
    },
  ],
})
