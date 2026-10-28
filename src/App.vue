<template>
  <main class="app">
    <header class="app-header">
      <p class="app-eyebrow">Local Wardrobe</p>
      <h1>电子衣柜</h1>
      <p class="app-subtitle">数据只保存在这台 iPhone 上</p>
    </header>

    <nav class="tabbar" aria-label="主导航">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="tab-button"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <section v-if="activeTab === 'wardrobe'" class="view">
      <div class="toolbar">
        <div class="filter-scroll">
          <button type="button" class="chip" :class="{ active: categoryFilter === 'all' }" @click="categoryFilter = 'all'">全部</button>
          <button
            v-for="category in CATEGORIES"
            :key="category.value"
            type="button"
            class="chip"
            :class="{ active: categoryFilter === category.value }"
            @click="categoryFilter = category.value"
          >{{ category.label }}</button>
        </div>
        <div class="filter-scroll">
          <button type="button" class="chip" :class="{ active: seasonFilter === 'all' }" @click="seasonFilter = 'all'">全季</button>
          <button
            v-for="season in SEASONS"
            :key="season.value"
            type="button"
            class="chip"
            :class="{ active: seasonFilter === season.value }"
            @click="seasonFilter = season.value"
          >{{ season.label }}</button>
        </div>
        <button class="primary-button" type="button" @click="openImport">选择图片</button>
      </div>

      <section v-if="stagedItems.length" class="import-panel">
        <div class="panel-heading">
          <h2>准备入库 · {{ stagedItems.length }}</h2>
          <div class="heading-actions">
            <button
              class="ghost-button"
              type="button"
              :disabled="Boolean(processingId) || saving"
              @click="batchCutout"
            >{{ batchStatus || '批量抠图' }}</button>
            <button class="ghost-button" type="button" @click="clearImport">清空</button>
          </div>
        </div>
        <div v-for="item in stagedItems" :key="item.key" class="staged-item">
          <div class="check-stage">
            <img :src="item.workUrl" alt="待入库衣服" />
            <div class="stage-badge">{{ item.error ? '抠图失败' : item.processed ? '抠图完成' : processingId === item.key ? '识别中' : '原图' }}</div>
          </div>
          <div class="staged-fields">
            <input v-model.trim="item.name" class="text-input" type="text" placeholder="名称" />
            <select v-model="item.category" class="select-input">
              <option v-for="category in CATEGORIES" :key="category.value" :value="category.value">{{ category.label }}</option>
            </select>
            <div class="season-row" role="group" aria-label="季节">
              <button
                v-for="season in SEASONS"
                :key="season.value"
                type="button"
                class="season-chip"
                :class="{ active: item.seasons.includes(season.value) }"
                @click="toggleSeason(item, season.value)"
              >{{ season.label }}</button>
            </div>
            <button class="secondary-button" type="button" :disabled="processingId === item.key" @click="processCutout(item)">
              {{ item.error ? '重试抠图' : item.processed ? '重新抠图' : '自动抠图' }}
            </button>
            <p class="processing-tip">{{ item.error ? '这一张失败了，已保留原图；可重试后继续批量入库。' : item.processed ? '已按识别结果处理，请确认后再保存。' : '可先用原图入库，后续再加手动微调。' }}</p>
          </div>
        </div>
        <button class="primary-button" type="button" :disabled="saving || !stagedItems.length" @click="saveItems">
          {{ saving ? '正在入库' : `批量入库 · ${stagedItems.length}` }}
        </button>
      </section>

      <section class="grid-area">
        <p v-if="!filteredClothes.length" class="empty-state">还没有符合条件的衣服。点「选择图片」批量导入。</p>
        <div class="clothes-grid">
          <article v-for="item in filteredClothes" :key="item.id" class="clothes-card">
            <div class="image-wrap">
              <img v-if="item.image" :src="item.imageUrl" alt="" />
              <div v-else class="image-placeholder">{{ item.name }}</div>
            </div>
            <div class="card-body">
              <strong>{{ item.name }}</strong>
              <span>{{ categoryLabel(item.category) }}</span>
              <small>{{ seasonText(item.seasons) }}</small>
            </div>
          </article>
        </div>
      </section>
    </section>

    <section v-if="activeTab === 'outfits'" class="view">
      <div class="toolbar">
        <button class="primary-button" type="button" @click="startOutfit">创建搭配</button>
      </div>

      <section v-if="outfitDraft" class="outfit-panel">
        <div class="panel-heading">
          <h2>选择单品</h2>
          <button class="ghost-button" type="button" @click="outfitDraft = null">取消</button>
        </div>
        <input v-model.trim="outfitDraft.name" class="text-input" type="text" placeholder="搭配名称" />
        <div class="season-row" role="group" aria-label="搭配季节">
          <button
            v-for="season in SEASONS"
            :key="season.value"
            type="button"
            class="season-chip"
            :class="{ active: outfitDraft.seasons.includes(season.value) }"
            @click="toggleOutfitSeason(season.value)"
          >{{ season.label }}</button>
        </div>
        <p class="selected-count">已选 {{ outfitDraft.itemIds.length }} 件</p>
        <div class="selector-grid">
          <button
            v-for="item in clothes"
            :key="item.id"
            type="button"
            class="selector-card"
            :class="{ selected: outfitDraft.itemIds.includes(item.id) }"
            @click="toggleOutfitItem(item.id)"
          >
            <img v-if="item.image" :src="item.imageUrl" alt="" />
            <span v-else>{{ item.name }}</span>
          </button>
        </div>
        <button class="primary-button" type="button" :disabled="!outfitDraft.itemIds.length || saving" @click="saveOutfit">保存搭配</button>
      </section>

      <p v-if="!outfits.length && !outfitDraft" class="empty-state">还没有自定义搭配。</p>
      <section v-for="outfit in outfits" :key="outfit.id" class="outfit-card">
        <div class="panel-heading">
          <h2>{{ outfit.name }}</h2>
          <button class="ghost-button danger" type="button" @click="deleteOutfit(outfit)">删除</button>
        </div>
        <div class="selector-grid">
          <div v-for="itemId in outfit.itemIds" :key="itemId" class="selector-card static">
            <img v-if="clothesById[itemId]?.image" :src="clothesById[itemId].imageUrl" alt="" />
            <span v-else>单品已删除</span>
          </div>
        </div>
        <small class="outfit-season">{{ seasonText(outfit.seasons) }}</small>
      </section>
    </section>

    <input ref="fileInput" class="hidden-input" type="file" accept="image/*" multiple @change="handleFiles" />

    <footer class="app-footer">
      <span>v{{ version }}</span>
      <span>IndexedDB · 无账号 · 不上传</span>
    </footer>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { removeBackground } from '@imgly/background-removal'
import { db } from './db'
import { CATEGORIES, SEASONS, categoryLabel, seasonText } from './config'

const version = __APP_VERSION__
const activeTab = ref('wardrobe')
const tabs = [
  { id: 'wardrobe', label: '衣橱' },
  { id: 'outfits', label: '搭配' }
]
const clothes = ref([])
const outfits = ref([])
const stagedItems = ref([])
const processingId = ref('')
const batchStatus = ref('')
const saving = ref(false)
const categoryFilter = ref('all')
const seasonFilter = ref('all')
const fileInput = ref(null)
const outfitDraft = ref(null)

const clothesById = computed(() => Object.fromEntries(clothes.value.map((item) => [item.id, item])))
const filteredClothes = computed(() => clothes.value.filter((item) => {
  const categoryOk = categoryFilter.value === 'all' || item.category === categoryFilter.value
  const seasonOk = seasonFilter.value === 'all' || item.seasons.includes(seasonFilter.value)
  return categoryOk && seasonOk
}))

async function refresh() {
  const records = await db.clothes.orderBy('createdAt').reverse().toArray()
  clothes.value = records.map((item) => ({
    ...item,
    imageUrl: item.image ? URL.createObjectURL(item.image) : ''
  }))
  outfits.value = await db.outfits.orderBy('createdAt').reverse().toArray()
}

function openImport() {
  fileInput.value?.click()
}

function clearImport() {
  stagedItems.value.forEach((item) => URL.revokeObjectURL(item.workUrl))
  stagedItems.value = []
  if (fileInput.value) fileInput.value.value = ''
}

async function handleFiles(event) {
  const files = Array.from(event.target.files || [])
  if (!files.length) return
  const records = await Promise.all(files.slice(0, 30).map(async (file) => {
    const bitmap = await createImageBitmap(file)
    return {
      key: `${Date.now()}-${Math.random()}`,
      original: file,
      originalName: file.name,
      workUrl: URL.createObjectURL(file),
      processed: false,
      image: null,
      width: bitmap.width,
      height: bitmap.height,
      name: file.name.replace(/\.[^.]+$/, '').slice(0, 24) || '新衣服',
      category: 'top',
      seasons: [],
      note: ''
    }
  }))
  stagedItems.value.push(...records)
  if (fileInput.value) fileInput.value.value = ''
}

async function runCutout(item) {
  processingId.value = item.key
  item.error = false
  try {
    const blob = await removeBackground(item.original, {
      device: 'cpu',
      output: { format: 'image/png' }
    })
    URL.revokeObjectURL(item.workUrl)
    item.image = blob
    item.workUrl = URL.createObjectURL(blob)
    item.processed = true
    const bitmap = await createImageBitmap(blob)
    item.width = bitmap.width
    item.height = bitmap.height
    return true
  } catch (error) {
    console.error(error)
    item.error = true
    return false
  } finally {
    processingId.value = ''
  }
}

async function processCutout(item) {
  const success = await runCutout(item)
  if (!success) {
    alert('自动抠图失败，可先保存原图。')
  }
}

async function batchCutout() {
  const queue = stagedItems.value.filter((item) => !item.processed)
  if (!queue.length) return
  let completed = 0
  let failed = 0
  for (const [index, item] of queue.entries()) {
    batchStatus.value = `抠图中 ${index + 1}/${queue.length}`
    const success = await runCutout(item)
    if (success) completed += 1
    else failed += 1
  }
  batchStatus.value = failed ? `完成 ${completed} · 失败 ${failed}` : `完成 ${completed}`
  setTimeout(() => {
    batchStatus.value = ''
  }, 2400)
}

function toggleSeason(item, value) {
  item.seasons = item.seasons.includes(value)
    ? item.seasons.filter((season) => season !== value)
    : [...item.seasons, value]
}

async function saveItems() {
  saving.value = true
  try {
    const now = Date.now()
    await db.clothes.bulkAdd(stagedItems.value.map((item) => ({
      name: item.name || categoryLabel(item.category),
      category: item.category,
      seasons: item.seasons,
      color: '',
      note: item.note,
      image: item.image || item.original,
      originalName: item.originalName,
      width: item.width,
      height: item.height,
      processed: item.processed,
      createdAt: now,
      updatedAt: now
    })))
    clearImport()
    await refresh()
  } finally {
    saving.value = false
  }
}

function startOutfit() {
  outfitDraft.value = { name: '', seasons: [], itemIds: [] }
}

function toggleOutfitSeason(value) {
  const seasons = outfitDraft.value.seasons
  outfitDraft.value.seasons = seasons.includes(value)
    ? seasons.filter((season) => season !== value)
    : [...seasons, value]
}

function toggleOutfitItem(itemId) {
  const itemIds = outfitDraft.value.itemIds
  outfitDraft.value.itemIds = itemIds.includes(itemId)
    ? itemIds.filter((id) => id !== itemId)
    : [...itemIds, itemId]
}

async function saveOutfit() {
  saving.value = true
  try {
    const now = Date.now()
    await db.outfits.add({
      name: outfitDraft.value.name || '未命名搭配',
      seasons: outfitDraft.value.seasons,
      itemIds: outfitDraft.value.itemIds,
      note: '',
      createdAt: now,
      updatedAt: now
    })
    outfitDraft.value = null
    await refresh()
  } finally {
    saving.value = false
  }
}

async function deleteOutfit(outfit) {
  if (!confirm(`删除「${outfit.name}」？衣服不会删除。`)) return
  await db.outfits.delete(outfit.id)
  await refresh()
}

onMounted(refresh)
</script>
