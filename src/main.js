import { createApp } from 'vue'
import App from './App.vue'
import { db } from './db'
import './styles/global.css'

if (import.meta.env.PROD) {
  const updateKey = 'ew-update-refresh'
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/electronic_wardrobe/sw.js', {
        scope: '/electronic_wardrobe/'
      })
      await registration.update()
      await new Promise((resolve) => setTimeout(resolve, 250))
      if (registration.waiting && navigator.serviceWorker.controller) {
        sessionStorage.setItem(updateKey, '1')
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        return
      }
      if (sessionStorage.getItem(updateKey) === '1') {
        sessionStorage.removeItem(updateKey)
        location.replace('/electronic_wardrobe/')
      }
    } catch {
      // 离线时保持当前版本可用
    }
  })
}

db.open().catch((error) => {
  console.error('本地数据库初始化失败', error)
})

createApp(App).mount('#app')
