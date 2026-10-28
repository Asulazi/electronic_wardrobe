<template>
  <div class="phone">
    <header class="topbar">
      <div class="topbar-copy">
        <div class="title-row">
          <h1>{{ pageTitle }}</h1>
          <span class="version">v{{ appVersion }}</span>
        </div>
        <p>{{ pageSubtitle }}</p>
      </div>
      <button class="icon-action" type="button" @click="handlePrimaryAction">
        <component :is="activeTab === 'profile' ? Download : Plus" />
      </button>
    </header>

    <main class="content">
      <section v-if="activeTab === 'home'" class="view">
        <section class="hero-stats">
          <div class="stat-card main">
            <span>衣橱总数</span>
            <strong>{{ clothes.length }}</strong>
            <small>全部保存在本机</small>
          </div>
          <div class="stat-group">
            <div class="stat-card"><span>搭配</span><strong>{{ outfits.length }}</strong></div>
            <div class="stat-card"><span>收藏</span><strong>{{ favoriteCount }}</strong></div>
          </div>
        </section>

        <section class="panel">
          <header class="panel-header">
            <div>
              <span class="kicker">分类分布</span>
              <h2>衣橱概览</h2>
            </div>
          </header>
          <div class="distribution">
            <button
              v-for="category in categoryStats"
              :key="category.value"
              type="button"
              class="category-stat"
              @click="goCategory(category.value)"
            >
              <span>{{ category.label }}</span>
              <strong>{{ category.count }}</strong>
            </button>
          </div>
        </section>

        <section class="panel">
          <header class="panel-header">
            <div>
              <span class="kicker">最近添加</span>
              <h2>最新单品</h2>
            </div>
            <button class="text-action" type="button" @click="goCategory('all')">
              查看全部
              <ChevronRight />
            </button>
          </header>
          <div v-if="recentClothes.length" class="recent-row">
            <button v-for="item in recentClothes" :key="item.id" type="button" class="mini-product" @click="openDetail(item)">
              <img v-if="item.image" :src="item.imageUrl" alt="" />
              <Shirt v-else />
              <span>{{ item.name }}</span>
            </button>
          </div>
          <div v-else class="inline-empty">
            <p>还没有单品，先添加几件开始建衣橱。</p>
            <button class="secondary-action" type="button" @click="goAddClothes">添加单品</button>
          </div>
        </section>
      </section>

      <section v-if="activeTab === 'wardrobe'" class="view">
        <div class="search-bar">
          <Search />
          <input v-model.trim="searchText" type="search" placeholder="搜索名称、品牌、备注" />
        </div>

        <div class="rail" aria-label="分类筛选">
          <button type="button" class="pill" :class="{ active: categoryFilter === 'all' }" @click="categoryFilter = 'all'">
            全部 {{ clothes.length }}
          </button>
          <button
            v-for="category in CATEGORIES"
            :key="category.value"
            type="button"
            class="pill"
            :class="{ active: categoryFilter === category.value }"
            @click="categoryFilter = category.value"
          >{{ category.label }} {{ categoryCounts[category.value] || 0 }}</button>
        </div>

        <div class="rail compact" aria-label="排序与筛选">
          <button type="button" class="pill small" :class="{ active: seasonFilter === 'all' }" @click="seasonFilter = 'all'">全季</button>
          <button
            v-for="season in SEASONS"
            :key="season.value"
            type="button"
            class="pill small"
            :class="{ active: seasonFilter === season.value }"
            @click="seasonFilter = season.value"
          >{{ season.label }}</button>
          <button type="button" class="pill small" :class="{ active: onlyFavorite }" @click="onlyFavorite = !onlyFavorite">
            <Heart />
            收藏
          </button>
          <button type="button" class="pill small" @click="toggleSort">
            <ArrowDownUp />
            {{ sortMode === 'newest' ? '最新' : sortMode === 'oldest' ? '最早' : '常穿' }}
          </button>
        </div>

        <div v-if="filteredClothes.length" class="list-meta"><span>共 {{ filteredClothes.length }} 件</span></div>

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

          <div v-if="batchStatus" class="progress-track"><div class="progress-bar"></div></div>

          <article v-for="item in stagedItems" :key="item.key" class="import-card">
            <div class="preview">
              <img :src="item.workUrl" alt="待入库单品" />
              <span class="state">{{ item.error ? '失败' : item.processed ? '已抠图' : processingId === item.key ? '处理中' : '原图' }}</span>
            </div>
            <div class="import-fields">
              <input v-model.trim="item.name" class="input" type="text" placeholder="单品名称" />
              <select v-model="item.category" class="input select">
                <option v-for="category in CATEGORIES" :key="category.value" :value="category.value">{{ category.label }}</option>
              </select>
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

          <div class="import-extra">
            <input v-model.trim="bulkBrand" class="input" type="text" placeholder="统一品牌（可选）" />
            <input v-model="bulkPrice" class="input" type="number" inputmode="decimal" placeholder="统一价格（可选）" />
          </div>
          <button class="primary-action" type="button" :disabled="saving || !stagedItems.length" @click="saveItems">
            {{ saving ? '正在保存' : `入库 ${stagedItems.length} 件` }}
          </button>
          <p v-if="saveError" class="error-text">{{ saveError }}</p>
        </section>

        <section v-else-if="!filteredClothes.length" class="empty">
          <Shirt />
          <h2>{{ clothes.length ? '没有匹配的单品' : '衣橱还是空的' }}</h2>
          <p>{{ clothes.length ? '换个分类、季节或关键词试试。' : '拍照或从相册选择单品照片，抠图后保存到本机。' }}</p>
          <button class="primary-action" type="button" @click="openImport">添加单品</button>
        </section>

        <section v-else class="wardrobe-grid">
          <article v-for="item in filteredClothes" :key="item.id" class="product-card">
            <button class="product-image" type="button" @click="openDetail(item)">
              <img v-if="item.image" :src="item.imageUrl" alt="" />
              <Shirt v-else />
              <span v-if="item.favorite" class="favorite-badge"><Heart /></span>
            </button>
            <div class="product-info">
              <button class="product-title" type="button" @click="openDetail(item)">{{ item.name }}</button>
              <div class="meta-row">
                <span>{{ categoryLabel(item.category) }}</span>
                <button class="fav-button" type="button" @click="toggleFavorite(item)">
                  <Heart :class="{ filled: item.favorite }" />
                </button>
              </div>
            </div>
          </article>
        </section>
      </section>

      <section v-if="activeTab === 'outfits'" class="view">
        <section v-if="outfitDraft && !clothes.length" class="panel">
          <header class="panel-header">
            <div><span class="kicker">创建搭配</span><h2>先添加单品</h2></div>
            <button class="icon-action subtle" type="button" @click="outfitDraft = null"><X /></button>
          </header>
          <p class="guide-text">搭配需要从衣橱里选择单品。当前衣橱是空的，先添加衣服、鞋帽或配饰。</p>
          <button class="primary-action" type="button" @click="goAddClothes">去衣橱添加</button>
        </section>

        <section v-else-if="outfitDraft" class="panel">
          <header class="panel-header">
            <div><span class="kicker">新建</span><h2>选择单品</h2></div>
            <button class="icon-action subtle" type="button" @click="outfitDraft = null"><X /></button>
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
                <button class="product-title" type="button" @click="openOutfitDetail(outfit)">{{ outfit.name }}</button>
                <span>{{ seasonText(outfit.seasons) }} · 穿过 {{ outfit.wearCount || 0 }} 次</span>
              </div>
              <button class="icon-action subtle" type="button" @click="toggleOutfitFavorite(outfit)">
                <Heart :class="{ filled: outfit.favorite }" />
              </button>
            </header>
            <div class="choice-grid">
              <div v-for="itemId in outfit.itemIds" :key="itemId" class="choice static">
                <img v-if="clothesById[itemId]?.image" :src="clothesById[itemId].imageUrl" alt="" />
                <Shirt v-else />
                <span>{{ clothesById[itemId]?.name || '已删除' }}</span>
              </div>
            </div>
            <div class="outfit-actions">
              <button class="secondary-action" type="button" @click="openOutfitDetail(outfit)">详情 / 记录穿着</button>
            </div>
          </article>
        </section>
      </section>

      <section v-if="activeTab === 'profile'" class="view">
        <section class="profile-card">
          <div class="avatar"><User /></div>
          <div><strong>本地衣橱</strong><span>无账号 · 数据只在这台设备</span></div>
        </section>

        <section class="panel">
          <header class="panel-header">
            <div><span class="kicker">数据安全</span><h2>备份与恢复</h2></div>
          </header>
          <p class="guide-text">导出会生成 JSON 备份文件，包含衣服、搭配、穿着记录和图片。导入会覆盖当前本机数据。</p>
          <button class="primary-action" type="button" :disabled="backupBusy" @click="handleExport">
            {{ backupBusy ? '处理中' : '导出备份' }}
          </button>
          <button class="secondary-action full" type="button" @click="backupInput?.click()">导入备份</button>
          <p v-if="backupMessage" class="backup-message">{{ backupMessage }}</p>
        </section>

        <section class="panel">
          <header class="panel-header">
            <div><span class="kicker">衣橱统计</span><h2>当前状态</h2></div>
          </header>
          <div class="profile-stats">
            <div><strong>{{ clothes.length }}</strong><span>单品</span></div>
            <div><strong>{{ outfits.length }}</strong><span>搭配</span></div>
            <div><strong>{{ totalWears }}</strong><span>穿着次数</span></div>
            <div><strong>{{ processedCount }}</strong><span>已抠图</span></div>
          </div>
        </section>
      </section>
    </main>

    <div v-if="detailItem" class="sheet-backdrop" @click="closeDetail">
      <section class="sheet" @click.stop>
        <header class="sheet-header">
          <div>
            <span class="kicker">单品详情</span>
            <h2>{{ detailItem.name }}</h2>
          </div>
          <button class="icon-action subtle" type="button" @click="closeDetail"><X /></button>
        </header>
        <div class="detail-grid">
          <div class="preview large">
            <img v-if="detailItem.image" :src="detailItem.imageUrl" alt="" />
            <Shirt v-else />
          </div>
          <div class="detail-fields">
            <label><span>名称</span><input v-model.trim="detailItem.name" class="input" type="text" /></label>
            <label><span>分类</span>
              <select v-model="detailItem.category" class="input select">
                <option v-for="category in CATEGORIES" :key="category.value" :value="category.value">{{ category.label }}</option>
              </select>
            </label>
            <label><span>品牌</span><input v-model.trim="detailItem.brand" class="input" type="text" /></label>
            <label><span>价格</span><input v-model.number="detailItem.price" class="input" type="number" inputmode="decimal" /></label>
          </div>
        </div>
        <div class="season-picker">
          <button
            v-for="season in SEASONS"
            :key="season.value"
            type="button"
            class="season"
            :class="{ active: detailItem.seasons.includes(season.value) }"
            @click="toggleDetailSeason(season.value)"
          >{{ season.label }}</button>
        </div>
        <label class="note-label"><span>备注</span><textarea v-model="detailItem.note" class="input note" rows="3" placeholder="面料、尺码、搭配想法"></textarea></label>
        <div class="detail-stats">
          <span>穿过 {{ detailItem.wearCount || 0 }} 次</span>
          <span>入库 {{ formatDate(detailItem.createdAt) }}</span>
        </div>
        <div class="detail-actions">
          <button class="primary-action" type="button" @click="recordItemWear(detailItem)">记录穿着</button>
          <button class="secondary-action full" type="button" @click="saveDetail">保存修改</button>
          <button class="danger-action" type="button" @click="deleteClothes(detailItem)">删除单品</button>
        </div>
      </section>
    </div>

    <div v-if="detailOutfit" class="sheet-backdrop" @click="closeOutfitDetail">
      <section class="sheet" @click.stop>
        <header class="sheet-header">
          <div>
            <span class="kicker">搭配详情</span>
            <h2>{{ detailOutfit.name }}</h2>
          </div>
          <button class="icon-action subtle" type="button" @click="closeOutfitDetail"><X /></button>
        </header>
        <div class="choice-grid">
          <div v-for="itemId in detailOutfit.itemIds" :key="itemId" class="choice static">
            <img v-if="clothesById[itemId]?.image" :src="clothesById[itemId].imageUrl" alt="" />
            <Shirt v-else />
            <span>{{ clothesById[itemId]?.name || '已删除' }}</span>
          </div>
        </div>
        <label><span class="field-label">名称</span><input v-model.trim="detailOutfit.name" class="input" type="text" /></label>
        <div class="season-picker">
          <button
            v-for="season in SEASONS"
            :key="season.value"
            type="button"
            class="season"
            :class="{ active: detailOutfit.seasons.includes(season.value) }"
            @click="toggleDetailOutfitSeason(season.value)"
          >{{ season.label }}</button>
        </div>
        <div class="detail-stats"><span>穿过 {{ detailOutfit.wearCount || 0 }} 次</span></div>
        <div class="detail-actions">
          <button class="primary-action" type="button" @click="recordOutfitWear(detailOutfit)">记录穿着</button>
          <button class="secondary-action full" type="button" @click="saveOutfitDetail">保存修改</button>
          <button class="danger-action" type="button" @click="deleteOutfit(detailOutfit)">删除搭配</button>
        </div>
      </section>
    </div>

    <input ref="fileInput" class="hidden-input" type="file" accept="image/*" multiple @change="handleFiles" />
    <input ref="backupInput" class="hidden-input" type="file" accept="application/json,.json" @change="handleBackupImport" />

    <nav class="bottom-nav" aria-label="主导航">
      <button type="button" :class="{ active: activeTab === 'home' }" @click="activeTab = 'home'">
        <Home />
        <span>首页</span>
      </button>
      <button type="button" :class="{ active: activeTab === 'wardrobe' }" @click="activeTab = 'wardrobe'">
        <Shirt />
        <span>衣橱</span>
      </button>
      <button class="center-add" type="button" @click="handleCenterAdd"><Plus /></button>
      <button type="button" :class="{ active: activeTab === 'outfits' }" @click="activeTab = 'outfits'">
        <Layers />
        <span>搭配</span>
      </button>
      <button type="button" :class="{ active: activeTab === 'profile' }" @click="activeTab = 'profile'">
        <User />
        <span>我的</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, toRaw } from 'vue'
import { removeBackground } from '@imgly/background-removal'
import {
  ArrowDownUp, ChevronRight, Download, Heart, Home, Layers, Plus, ScanLine,
  Search, Shirt, Sparkles, Trash2, User, X
} from 'lucide-vue-next'
import { exportBackup, importBackup } from './backup'
import { db } from './db'
import { CATEGORIES, SEASONS, categoryLabel, seasonText } from './config'

const appVersion = __APP_VERSION__
const activeTab = ref('home')
const clothes = ref([])
const outfits = ref([])
const stagedItems = ref([])
const processingId = ref('')
const batchStatus = ref('')
const saving = ref(false)
const categoryFilter = ref('all')
const seasonFilter = ref('all')
const searchText = ref('')
const onlyFavorite = ref(false)
const sortMode = ref('newest')
const fileInput = ref(null)
const backupInput = ref(null)
const outfitDraft = ref(null)
const saveError = ref('')
const detailItem = ref(null)
const detailOutfit = ref(null)
const bulkBrand = ref('')
const bulkPrice = ref(null)
const backupBusy = ref(false)
const backupMessage = ref('')

const pageTitle = computed(() => ({
  home: '我的衣橱',
  wardrobe: '衣橱',
  outfits: '搭配灵感',
  profile: '我的'
}[activeTab.value]))

const pageSubtitle = computed(() => ({
  home: `${clothes.value.length} 件单品 · ${outfits.value.length} 套搭配`,
  wardrobe: '分类、搜索和管理单品',
  outfits: '组合并记录你的穿搭',
  profile: '本地数据与备份'
}[activeTab.value]))

const clothesById = computed(() => Object.fromEntries(clothes.value.map((item) => [item.id, item])))
const favoriteCount = computed(() => clothes.value.filter((item) => item.favorite).length)
const recentClothes = computed(() => clothes.value.slice(0, 6))
const categoryCounts = computed(() => clothes.value.reduce((result, item) => {
  result[item.category] = (result[item.category] || 0) + 1
  return result
}, {}))
const categoryStats = computed(() => CATEGORIES.map((category) => ({
  ...category,
  count: categoryCounts.value[category.value] || 0
})).filter((category) => category.count > 0))
const totalWears = computed(() => wearLogs.value.length)
const processedCount = computed(() => clothes.value.filter((item) => item.processed).length)

const filteredClothes = computed(() => {
  const keyword = searchText.value.toLowerCase()
  let result = clothes.value.filter((item) => {
    const categoryOk = categoryFilter.value === 'all' || item.category === categoryFilter.value
    const seasonOk = seasonFilter.value === 'all' || item.seasons.includes(seasonFilter.value)
    const favoriteOk = !onlyFavorite.value || item.favorite
    const text = `${item.name} ${item.brand || ''} ${item.note || ''}`.toLowerCase()
    return categoryOk && seasonOk && favoriteOk && (!keyword || text.includes(keyword))
  })
  if (sortMode.value === 'oldest') result = [...result].sort((a, b) => a.createdAt - b.createdAt)
  if (sortMode.value === 'worn') result = [...result].sort((a, b) => (b.wearCount || 0) - (a.wearCount || 0))
  return result
})

async function refresh() {
  const records = await db.clothes.orderBy('createdAt').reverse().toArray()
  clothes.value = records.map((item) => ({
    ...item,
    imageUrl: item.image ? URL.createObjectURL(item.image) : ''
  }))
  outfits.value = await db.outfits.orderBy('createdAt').reverse().toArray()
}

function handlePrimaryAction() {
  if (activeTab.value === 'profile') handleExport()
  else if (activeTab.value === 'outfits') startOutfit()
  else openImport()
}

function openImport() {
  fileInput.value?.click()
}

function clearImport() {
  stagedItems.value.forEach((item) => URL.revokeObjectURL(item.workUrl))
  stagedItems.value = []
  batchStatus.value = ''
  saveError.value = ''
  bulkBrand.value = ''
  bulkPrice.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function handleCenterAdd() {
  if (activeTab.value === 'outfits' && clothes.value.length) startOutfit()
  else {
    activeTab.value = 'wardrobe'
    openImport()
  }
}

function goAddClothes() {
  outfitDraft.value = null
  activeTab.value = 'wardrobe'
  openImport()
}

function goCategory(value) {
  categoryFilter.value = value
  activeTab.value = 'wardrobe'
}

function toggleSort() {
  sortMode.value = sortMode.value === 'newest' ? 'oldest' : sortMode.value === 'oldest' ? 'worn' : 'newest'
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
    const blob = await removeBackground(item.original, { device: 'cpu', output: { format: 'image/png' } })
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
    if (await runCutout(item)) completed += 1
    else failed += 1
  }
  batchStatus.value = failed ? `完成 ${completed} · 失败 ${failed}` : `完成 ${completed}`
  setTimeout(() => { batchStatus.value = '' }, 2200)
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
        brand: bulkBrand.value || '',
        price: bulkPrice.value === '' || bulkPrice.value == null ? null : Number(bulkPrice.value),
        note: item.note || '',
        image: item.image || item.original,
        originalName: item.originalName || '',
        width: Number(item.width) || 0,
        height: Number(item.height) || 0,
        processed: Boolean(item.processed),
        favorite: false,
        wearCount: 0,
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
      favorite: false,
      wearCount: 0,
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

async function openDetail(item) {
  detailItem.value = { ...item }
}

function closeDetail() {
  detailItem.value = null
}

function toggleDetailSeason(value) {
  const seasons = detailItem.value.seasons
  detailItem.value.seasons = seasons.includes(value)
    ? seasons.filter((season) => season !== value)
    : [...seasons, value]
}

async function saveDetail() {
  const item = toRaw(detailItem.value)
  const { imageUrl, ...data } = item
  await db.clothes.update(item.id, { ...data, seasons: [...item.seasons], updatedAt: Date.now() })
  detailItem.value = null
  await refresh()
}

async function deleteClothes(item) {
  if (!confirm(`删除「${item.name}」？搭配中的引用会显示为已删除。`)) return
  await db.clothes.delete(item.id)
  closeDetail()
  await refresh()
}

async function toggleFavorite(item) {
  await db.clothes.update(item.id, { favorite: !item.favorite, updatedAt: Date.now() })
  await refresh()
}

async function recordItemWear(item) {
  const today = new Date().toISOString().slice(0, 10)
  await db.transaction('rw', [db.clothes, db.wearLogs], async () => {
    await db.wearLogs.add({ date: today, itemId: item.id, outfitId: null, createdAt: Date.now() })
    await db.clothes.update(item.id, { wearCount: (item.wearCount || 0) + 1, updatedAt: Date.now() })
  })
  closeDetail()
  await refresh()
}

function openOutfitDetail(outfit) {
  detailOutfit.value = { ...outfit }
}

function closeOutfitDetail() {
  detailOutfit.value = null
}

function toggleDetailOutfitSeason(value) {
  const seasons = detailOutfit.value.seasons
  detailOutfit.value.seasons = seasons.includes(value)
    ? seasons.filter((season) => season !== value)
    : [...seasons, value]
}

async function saveOutfitDetail() {
  const outfit = toRaw(detailOutfit.value)
  await db.outfits.update(outfit.id, { name: outfit.name, seasons: [...outfit.seasons], updatedAt: Date.now() })
  closeOutfitDetail()
  await refresh()
}

async function toggleOutfitFavorite(outfit) {
  await db.outfits.update(outfit.id, { favorite: !outfit.favorite, updatedAt: Date.now() })
  await refresh()
}

async function recordOutfitWear(outfit) {
  const today = new Date().toISOString().slice(0, 10)
  await db.transaction('rw', [db.outfits, db.wearLogs], async () => {
    await db.wearLogs.add({ date: today, itemId: null, outfitId: outfit.id, createdAt: Date.now() })
    await db.outfits.update(outfit.id, { wearCount: (outfit.wearCount || 0) + 1, updatedAt: Date.now() })
  })
  closeOutfitDetail()
  await refresh()
}

async function deleteOutfit(outfit) {
  if (!confirm(`删除「${outfit.name}」？单品不会删除。`)) return
  await db.outfits.delete(outfit.id)
  closeOutfitDetail()
  await refresh()
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('zh-CN')
}

async function handleExport() {
  backupBusy.value = true
  backupMessage.value = ''
  try {
    await exportBackup()
    backupMessage.value = '备份已导出，请在手机文件或下载列表中保存。'
  } catch (error) {
    console.error(error)
    backupMessage.value = '导出失败，请重试。'
  } finally {
    backupBusy.value = false
  }
}

async function handleBackupImport(event) {
  const file = event.target.files?.[0]
  if (!file) return
  backupBusy.value = true
  backupMessage.value = ''
  try {
    const result = await importBackup(file)
    await refresh()
    backupMessage.value = `导入完成：${result.clothes} 件单品 / ${result.outfits} 套搭配。`
  } catch (error) {
    console.error(error)
    backupMessage.value = '导入失败：请确认这是本应用导出的备份文件。'
  } finally {
    backupBusy.value = false
    if (backupInput.value) backupInput.value.value = ''
  }
}

onMounted(refresh)
</script>
