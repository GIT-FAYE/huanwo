import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { lib: { entry: 'electron/main.ts' } }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { lib: { entry: 'electron/preload.ts' } }
  },
  renderer: {
    plugins: [react()],
    root: 'src',
    build: {
      rollupOptions: {
        input: 'src/index.html'
      }
    }
  }
})
