import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [
    vue(),
    // Treeshakes Vuetify components and lets us keep a single SASS settings file.
    vuetify({ autoImport: true, styles: { configFile: 'src/styles/settings.scss' } }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // autoImport adds Vuetify imports while a page compiles, after Vite's
  // startup scan. Pre-bundling Vuetify would then re-bundle and force-reload
  // the browser the first time each screen uses a new component — a blank
  // page mid-session. Vuetify ships native ES modules, so serve them as-is.
  optimizeDeps: { exclude: ['vuetify'] },
  server: { port: 5173 },
})
