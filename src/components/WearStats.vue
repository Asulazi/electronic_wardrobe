<template>
  <div>
    <section class="hero-stats">
      <div class="stat-card main"><span>总单品</span><strong>{{ clothes.length }}</strong><small>本机数据</small></div>
      <div class="stat-group">
        <div class="stat-card"><span>搭配</span><strong>{{ outfits.length }}</strong></div>
        <div class="stat-card"><span>穿着</span><strong>{{ logs.length }}</strong></div>
      </div>
    </section>

    <section class="panel">
      <header class="panel-header"><div><span class="kicker">分类占比</span><h2>衣橱结构</h2></div></header>
      <div class="bars">
        <div v-for="category in categoryData" :key="category.value" class="bar-row">
          <span>{{ category.label }}</span>
          <div class="bar-track"><div class="bar" :style="{ width: `${category.percent}%` }"></div></div>
          <strong>{{ category.count }}</strong>
        </div>
      </div>
    </section>

    <section class="panel">
      <header class="panel-header"><div><span class="kicker">穿着洞察</span><h2>高频与沉睡</h2></div></header>
      <div class="insight-grid">
        <div class="insight">
          <span>回本王</span>
          <div v-if="topWorn" class="insight-item" @click="$emit('open-item', topWorn)">
            <img v-if="topWorn.coverImage" :src="topWorn.coverImage" alt="" />
            <Shirt v-else />
            <strong>{{ topWorn.name }}</strong>
            <small>{{ topWorn.wearCount || 0 }} 次</small>
          </div>
          <p v-else>还没有穿着记录</p>
        </div>
        <div class="insight">
          <span>沉睡单品</span>
          <div v-if="sleeping.length" class="sleep-list">
            <button v-for="item in sleeping.slice(0, 4)" :key="item.id" type="button" @click="$emit('open-item', item)">
              <strong>{{ item.name }}</strong>
              <small>{{ item.wearCount || 0 }} 次</small>
            </button>
          </div>
          <p v-else>暂无</p>
        </div>
      </div>
    </section>

    <section class="panel">
      <header class="panel-header"><div><span class="kicker">消费</span><h2>价格与换季</h2></div></header>
      <div class="profile-stats">
        <div><strong>{{ totalSpent || 0 }}</strong><span>累计花费</span></div>
        <div><strong>{{ averagePrice || 0 }}</strong><span>均价</span></div>
        <div><strong>{{ pricedCount }}</strong><span>已记录</span></div>
        <div><strong>{{ archiveCount }}</strong><span>归档</span></div>
      </div>
      <p class="guide-text">沉睡标准：从未穿过或超过 90 天未穿。</p>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Shirt } from 'lucide-vue-next'
import { CATEGORIES } from '../config'

const props = defineProps({
  clothes: Array,
  outfits: Array,
  logs: Array
})

defineEmits(['open-item'])

const categoryData = computed(() => {
  const total = props.clothes.length || 1
  return CATEGORIES.map((category) => {
    const count = props.clothes.filter((item) => item.category === category.value).length
    return { ...category, count, percent: Math.round((count / total) * 100) }
  }).filter((category) => category.count)
})

const pricedItems = computed(() => props.clothes.filter((item) => item.price > 0))
const totalSpent = computed(() => Math.round(pricedItems.value.reduce((sum, item) => sum + Number(item.price || 0), 0)))
const averagePrice = computed(() => pricedItems.value.length ? Math.round(totalSpent.value / pricedItems.value.length) : 0)
const pricedCount = computed(() => pricedItems.value.length)
const archiveCount = computed(() => props.clothes.filter((item) => item.archived).length)
const topWorn = computed(() => [...props.clothes].sort((a, b) => (b.wearCount || 0) - (a.wearCount || 0))[0])
const sleeping = computed(() => {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
  return props.clothes.filter((item) => (item.wearCount || 0) === 0 || (item.lastWornAt || 0) < cutoff)
})
</script>
