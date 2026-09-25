import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: { main: 'index.html', admin: 'admin.html' },
    },
  },
  server: {
    // `npm run server` runs the API on 8787; the dev site talks to it via /api.
    proxy: { '/api': 'http://localhost:8787' },
  },
})
