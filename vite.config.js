import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

/**
 * Commit date + short sha, so a given commit always builds identically.
 *
 * The date format deliberately contains no space: execSync goes through a
 * shell, and a space splits "%H:%M" into a second argument that git reads
 * as a revision, failing with "invalid object name". That threw silently
 * into the clock fallback and made builds nondeterministic again.
 */
function buildStamp() {
  try {
    const date = execSync('git log -1 --format=%cd --date=format:%Y-%m-%dT%H:%M', { encoding: 'utf8' }).trim()
    const sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
    if (!date || !sha) throw new Error('empty git output')
    return `${date.replace('T', ' ')} · ${sha}`
  } catch {
    // No git (e.g. a tarball build) — fall back to the clock.
    return new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
  }
}

/**
 * Two targets from one source.
 *
 * The web build is served from a GitHub Pages subpath and needs the service
 * worker. The native build is served by Capacitor from the root of its own
 * scheme, so an absolute '/medschool-prep/' base would 404 every asset, and a
 * service worker is both unreliable in WKWebView and pointless when the whole
 * bundle is already on disk inside the app.
 *
 *   npm run build          web, unchanged
 *   npm run build:native   what Capacitor copies into the iOS project
 */
export default defineConfig(({ mode }) => {
  const native = mode === 'native'
  return {
  base: native ? './' : '/medschool-prep/',
  resolve: {
    // main.jsx imports the plugin's virtual module unconditionally; in a
    // native build the plugin is gone, so point it at a no-op instead of
    // branching the entry point.
    alias: native ? { 'virtual:pwa-register': '/src/lib/pwaRegisterStub.js' } : {},
  },
  define: {
    // Shown in the footer so the user can tell whether an update landed.
    //
    // Taken from the COMMIT, not the clock: stamping build time made every
    // build produce a different bundle hash from identical source, which
    // broke the "does the live hash match dist?" deploy check. Keyed to the
    // commit, the same source always builds to the same hash.
    __BUILD_DATE__: JSON.stringify(buildStamp()),
  },
  plugins: [
    react(),
    ...(native ? [] : [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: 'MedLadder',
        short_name: 'MedLadder',
        description: 'Organic chemistry and gen-chem study drills',
        start_url: '/medschool-prep/',
        scope: '/medschool-prep/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
      },
    }),
    ]),
  ],
  }
})
