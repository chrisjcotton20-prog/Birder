import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable.png'],
      manifest: {
        name: 'Birder',
        short_name: 'Birder',
        description: 'Your Life List. Track your eBird sightings against the 774 native US bird species.',
        theme_color: '#a8d8eb',
        background_color: '#fff8e8',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // File handler so a tapped .csv/.zip can launch the app on platforms that support it.
        // iOS Safari does not yet honor this, but Android Chrome and desktop browsers do.
        file_handlers: [
          {
            action: '/',
            accept: {
              'text/csv': ['.csv'],
              'application/zip': ['.zip'],
              'application/x-zip-compressed': ['.zip'],
            },
          },
        ],
        // Share Target: lets the user share the eBird export (.zip or .csv) straight
        // into Birder from their email/file app. The POST is caught by the service
        // worker (share-target-sw.js) and handed to the app. Android/Chromium PWAs
        // support file share targets; iOS does not yet.
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            files: [
              {
                name: 'file',
                accept: [
                  'text/csv',
                  '.csv',
                  'application/zip',
                  'application/x-zip-compressed',
                  '.zip',
                ],
              },
            ],
          },
        },
      },
      workbox: {
        importScripts: ['share-target-sw.js'],
        // Don't let the SPA navigation fallback swallow the share-target POST route.
        navigateFallbackDenylist: [/^\/share-target/],
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
});
