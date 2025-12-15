import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_PORT) || 3847,
      strictPort: true,
    },
    preview: {
      port: parseInt(env.VITE_PORT) || 3847,
    },
  }
})
