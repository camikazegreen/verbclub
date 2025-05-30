import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const rootDir = path.resolve(__dirname, '../../')
  const env = loadEnv(mode, rootDir, '')
  
  console.log('Vite env loading:', {
    mode,
    rootDir,
    envKeys: Object.keys(env),
    mapboxToken: env.VITE_MAPBOX_TOKEN ? 'present' : 'missing',
    envFile: path.resolve(rootDir, '.env')
  })

  return {
    plugins: [react()],
    root: path.resolve(__dirname),
    envDir: rootDir,
    define: {
      'import.meta.env.VITE_MAPBOX_TOKEN': JSON.stringify(env.VITE_MAPBOX_TOKEN)
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
}) 