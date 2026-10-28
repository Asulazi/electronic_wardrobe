import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/electronic_wardrobe/',
  plugins: [
    vue(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/electronic_wardrobe/index.html',
        clientsClaim: true,
        skipWaiting: true
      },
      manifest: {
        name: 'electronic_wardrobe',
        short_name: '衣柜',
        description: '纯本地电子衣柜与穿搭记录',
        lang: 'zh-CN',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/electronic_wardrobe/',
        scope: '/electronic_wardrobe/',
        background_color: '#f7f5f1',
        theme_color: '#f7f5f1',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
})
