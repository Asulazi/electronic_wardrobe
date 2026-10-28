<template>
  <main class="app">
    <header class="app-header">
      <p class="app-eyebrow">Local PWA</p>
      <h1>电子衣柜</h1>
      <p class="app-subtitle">数据只保存在这台 iPhone 上</p>
    </header>

    <section class="status-grid" aria-label="本地数据状态">
      <button class="status-card" type="button" @click="refreshCount">
        <span class="status-label">衣服</span>
        <strong class="status-value">{{ clothesCount }}</strong>
      </button>
      <button class="status-card" type="button" @click="refreshCount">
        <span class="status-label">搭配</span>
        <strong class="status-value">{{ outfitCount }}</strong>
      </button>
    </section>

    <section class="placeholder-card">
      <h2>基础框架已就绪</h2>
      <p>Vue 3、Vite、PWA 自动更新和 Dexie 本地数据库已经接入。等页面方向确认后，再继续做具体的衣服录入与搭配功能。</p>
    </section>

    <footer class="app-footer">
      <span>v{{ version }}</span>
      <span>IndexedDB · 无账号 · 不上传</span>
    </footer>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { db } from './db'

const version = __APP_VERSION__
const clothesCount = ref(0)
const outfitCount = ref(0)

async function refreshCount() {
  clothesCount.value = await db.clothes.count()
  outfitCount.value = await db.outfits.count()
}

onMounted(refreshCount)
</script>
