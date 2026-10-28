<template>
  <div class="phone">
    <header class="topbar">
      <div class="topbar-copy">
        <div class="title-row">
          <h1>{{ activeTab === 'wardrobe' ? '我的衣橱' : '搭配灵感' }}</h1>
          <span class="version">v{{ appVersion }}</span>
        </div>
        <p>{{ activeTab === 'wardrobe' ? `${clothes.length} 件单品` : `${outfits.length} 套搭配` }}</p>
      </div>
      <button class="icon-action" type="button" @click="activeTab === 'wardrobe' ? openImport() : startOutfit()">
        <Plus />
      </button>
    </header>

    <main class="content">
      <section v-if="activeTab === 'wardrobe'" class="view">
        <div class="rail" aria-label="分类筛选">
          <button type="button" class="pill" :class="{ active: categoryFilter === 'all' }" @click="categoryFilter = 'all'">全部</button>
          <button
            v-for="category in CATEGORIES"
            :key="category.value"
            type="button"
            class="pill"
            :class="{ active: categoryFilter === category.value }"
            @click="categoryFilter = category.value"
          >{{ category.label }}</button>
        </div>

        <div class="rail compact" aria-label="季节筛选">
          <button type="button" class="pill small" :class="{ active: seasonFilter === 'all' }" @click="seasonFilter = 'all'">全季</button>
          <button
            v-for="season in SEASONS"
            :key="season.value"
            type="button"
            class="pill small"
            :class="{ active: seasonFilter === season.value }"
            @click="seasonFilter = season.value"
          >{{ season.label }}</button>
        </div>

        <section v-if="stagedItems.length" class="panel import-panel">
          <header class="panel-header">
            <div>
              <span class="kicker">新增</span>
              <h2>待入库 {{ stagedItems.length }} 件</h2>
            </div>
            <div class="header-actions">
              <button class="text-action" type="button" :disabled="Boolean(processingId) || saving" @click="batchCutout">
                <ScanLine />
                {{ batchStatus || '批量抠图' }}
              </button>
              <button class="icon-action subtle" type="button" @click="clearImport">
                <X />
              </button>
            </div>
          </header>

          <div v-if="batchStatus" class="progress-track">
            <div class="progress-bar"></div>
          </div>

          <article v-for="item in stagedItems" :key="item.key" class="import-card">
            <div class="preview">
              <img :src="item.workUrl" alt="待入库单品" />
              <span class="state">{{ item.error ? '失败' : item.processed ? '已抠图' : processingId === item.key ? '处理中' : '原图' }}</span>
            </div>
            <div class="import-fields">
              <input v-model.trim="item.name" class="input" type="text" placeholder="单品名称" />
              <div class="row">
                <select v-model="item.category" class="input select">
                  <option v-for="category in CATEGORIES" :key="category.value" :value="category.value">{{ category.label }}</option>
                </select>
              </div>
              <div class="season-picker">
                <button
                  v-for="season in SEASONS"
                  :key="season.value"
                  type="button"
                  class="season"
                  :class="{ active: item.seasons.includes(season.value) }"
                  @click="toggleSeason(item, season.value)"
                >{{ season.label }}</button>
              </div>
              <button class="cut-button" type="button" :disabled="processingId === item.key" @click="processCutout(item)">
                <Sparkles />
                {{ item.error ? '重试' : item.processed ? '重新抠图' : '抠图' }}
              </button>
            </div>
          </article>

          <button class="primary-action" type="button" :disabled="saving || !stagedItems.length" @click="saveItems">
            {{ saving ? '正在保存' : `入库 ${stagedItems.length} 件` }}
          </button>
          <p v-if="saveError" class="error-text">{{ saveError }}</p>
        </section>

        <section v-else-if="!filteredClothes.length" class="empty">
          <Shirt />
          <h2>衣橱还是空的</h2>
          <p>拍照或从相册选择单品照片，抠图后自动保存到本机。</p>
          <button class="primary-action" type="button" @click="openImport">添加单品</button>
        </section>

        <section v-else class="wardrobe-grid">
          <article v-for="item in filteredClothes" :key="item.id" class="product-card">
            <div class="product-image">
              <img v-if="item.image" :src="item.imageUrl" alt="" />
              <Shirt v-else />
            </div>
            <div class="product-info">
              <strong>{{ item.name }}</strong>
              <span>{{ categoryLabel(item.category) }}</span>
            </div>
          </article>
        </section>
      </section>

      <section v-if="activeTab === 'outfits'" class="view">
        <section v-if="outfitDraft && !clothes.length" class="panel">
          <header class="panel-header">
            <div>
              <span class="kicker">创建搭配</span>
              <h2>先添加单品</h2>
            </div>
            <button class="icon-action subtle" type="button" @click="outfitDraft = null">
              <X />
            </button>
          </header>
          <p class="guide-text">搭配需要从衣橱里选择单品。当前衣橱是空的，先添加衣服、鞋帽或配饰。</p>
          <button class="primary-action" type="button" @click="goAddClothes">去衣橱添加</button>
        </section>

        <section v-else-if="outfitDraft" class="panel">
          <header class="panel-header">
            <div>
              <span class="kicker">新建</span>
              <h2>选择单品</h2>
            </div>
            <button class="icon-action subtle" type="button" @click="outfitDraft = null">
              <X />
            </button>
          </header>
          <input v-model.trim="outfitDraft.name" class="input" type="text" placeholder="搭配名称" />
          <div class="season-picker">
            <button
              v-for="season in SEASONS"
              :key="season.value"
              type="button"
              class="season"
              :class="{ active: outfitDraft.seasons.includes(season.value) }"
              @click="toggleOutfitSeason(season.value)"
            >{{ season.label }}</button>
          </div>
          <p class="selection-count">已选 {{ outfitDraft.itemIds.length }} 件</p>
          <div class="choice-grid">
            <button
              v-for="item in clothes"
              :key="item.id"
              type="button"
              class="choice"
              :class="{ selected: outfitDraft.itemIds.includes(item.id) }"
              @click="toggleOutfitItem(item.id)"
            >
              <img v-if="item.image" :src="item.imageUrl" alt="" />
              <Shirt v-else />
              <span>{{ item.name }}</span>
            </button>
          </div>
          <button class="primary-action" type="button" :disabled="!outfitDraft.itemIds.length || saving" @click="saveOutfit">保存搭配</button>
          <p v-if="saveError" class="error-text">{{ saveError }}</p>
        </section>

        <section v-else-if="!outfits.length && !clothes.length" class="empty">
          <Shirt />
          <h2>先从衣橱开始</h2>
          <p>创建搭配前，先添加几件衣服、鞋帽或配饰，然后就能在这里自由组合。</p>
          <button class="primary-action" type="button" @click="goAddClothes">添加单品</button>
        </section>

        <section v-else-if="!outfits.length" class="empty">
          <Layers />
          <h2>还没有搭配</h2>
          <p>从衣橱里挑选几件单品，组合成属于你的穿搭方案。</p>
          <button class="primary-action" type="button" @click="startOutfit">创建搭配</button>
        </section>

        <section v-else class="outfit-list">
          <article v-for="outfit in outfits" :key="outfit.id" class="outfit-card">
            <header>
              <div>
                <strong>{{ outfit.name }}</strong>
                <span>{{ seasonText(outfit.seasons) }}</span>
              </div>
              <button class="icon-action subtle" type="button" @click="deleteOutfit(outfit)">
                <Trash2 />
              </button>
            </header>
            <div class="choice-grid">
              <div v-for="itemId in outfit.itemIds" :key="itemId" class="choice static">
                <img v-if="clothesById[itemId]?.image" :src="clothesById[itemId].imageUrl" alt="" />
                <Shirt v-else />
                <span>{{ clothesById[itemId]?.name || '已删除' }}</span>
              </div>
            </div>
          </article>
        </section>
      </section>
    </main>

    <input ref="fileInput" class="hidden-input" type="file" accept="image/*" multiple @change="handleFiles" />

    <nav class="bottom-nav" aria-label="主导航">
      <button type="button" :class="{ active: activeTab === 'wardrobe' }" @click="activeTab = 'wardrobe'">
        <Shirt />
        <span>衣橱</span>
      </button>
      <button class="center-add" type="button" @click="handleCenterAdd">
        <Plus />
      </button>
      <button type="button" :class="{ active: activeTab === 'outfits' }" @click="activeTab = 'outfits'">
        <Layers />
        <span>搭配</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, toRaw } from 'vue'
import { removeBackground } from '@imgly/background-removal'
import { Layers, Plus, ScanLine, Shirt, Sparkles, Trash2, X } from 'lucide-vue-next'
import { db } from './db'
import { CATEGORIES, SEASONS, categoryLabel, seasonText } from './config'

const activeTab = ref('wardrobe')
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
const appVersion = __APP_VERSION__
const saveError = ref('')

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
  batchStatus.value = ''
  saveError.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function handleCenterAdd() {
  if (activeTab.value === 'wardrobe' || !clothes.value.length) {
    activeTab.value = 'wardrobe'
    openImport()
    return
  }
  startOutfit()
}

function goAddClothes() {
  outfitDraft.value = null
  activeTab.value = 'wardrobe'
  openImport()
}

async function handleFiles(event) {
  const files = Array.from(event.target.files || [])
  if (!files.length) return
  const startIndex = stagedItems.value.length
  const records = await Promise.all(files.slice(0, 30).map(async (file, index) => {
    const bitmap = await createImageBitmap(file)
    return {
      key: `${Date.now()}-${index}`,
      original: file,
      originalName: file.name,
      workUrl: URL.createObjectURL(file),
      processed: false,
      error: false,
      image: null,
      width: bitmap.width,
      height: bitmap.height,
      name: `单品 ${String(startIndex + index + 1).padStart(2, '0')}`,
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
  if (!success) alert('这张图片识别失败，可以重试或直接用原图入库。')
}

async function batchCutout() {
  const queue = stagedItems.value.filter((item) => !item.processed)
  if (!queue.length) return
  let completed = 0
  let failed = 0
  for (const [index, item] of queue.entries()) {
    batchStatus.value = `处理中 ${index + 1}/${queue.length}`
    const success = await runCutout(item)
    if (success) completed += 1
    else failed += 1
  }
  batchStatus.value = failed ? `完成 ${completed} · 失败 ${failed}` : `完成 ${completed}`
  setTimeout(() => {
    batchStatus.value = ''
  }, 2200)
}

function toggleSeason(item, value) {
  item.seasons = item.seasons.includes(value)
    ? item.seasons.filter((season) => season !== value)
    : [...item.seasons, value]
}

async function saveItems() {
  saving.value = true
  saveError.value = ''
  try {
    const now = Date.now()
    const records = stagedItems.value.map((reactiveItem) => {
      const item = toRaw(reactiveItem)
      return {
        name: item.name || categoryLabel(item.category),
        category: item.category,
        seasons: [...item.seasons],
        color: '',
        note: item.note || '',
        image: item.image || item.original,
        originalName: item.originalName || '',
        width: Number(item.width) || 0,
        height: Number(item.height) || 0,
        processed: Boolean(item.processed),
        createdAt: now,
        updatedAt: now
      }
    })
    await db.clothes.bulkAdd(records)
    clearImport()
    await refresh()
  } catch (error) {
    console.error(error)
    saveError.value = '入库失败：本地数据库写入未完成，请重试一次。'
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
  saveError.value = ''
  try {
    const now = Date.now()
    const draft = toRaw(outfitDraft.value)
    await db.outfits.add({
      name: draft.name || '未命名搭配',
      seasons: [...draft.seasons],
      itemIds: [...draft.itemIds],
      note: '',
      createdAt: now,
      updatedAt: now
    })
    outfitDraft.value = null
    await refresh()
  } catch (error) {
    console.error(error)
    saveError.value = '保存失败：本地数据库写入未完成，请重试一次。'
  } finally {
    saving.value = false
  }
}

async function deleteOutfit(outfit) {
  if (!confirm(`删除「${outfit.name}」？单品不会删除。`)) return
  await db.outfits.delete(outfit.id)
  await refresh()
}

onMounted(refresh)
</script>
