import { createApp } from 'vue'
import App from './App.vue'
import { db } from './db'
import './styles/global.css'

db.open().catch((error) => {
  console.error('本地数据库初始化失败', error)
})

createApp(App).mount('#app')
