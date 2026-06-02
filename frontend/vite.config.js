import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/upload':   'http://localhost:8002',
      '/analysis': 'http://localhost:8002',
      '/health':   'http://localhost:8002',
    },
    // /analysis already covers /analysis/{id}/progression and /analysis/{id}/stream
  },
})
