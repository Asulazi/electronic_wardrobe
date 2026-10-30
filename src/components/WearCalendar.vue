<template>
  <div>
    <header class="calendar-header">
      <button class="round-button" type="button" @click="$emit('navigate', -1)">
        <ChevronLeft />
      </button>
      <strong>{{ year }} 年 {{ month + 1 }} 月</strong>
      <button class="round-button" type="button" @click="$emit('navigate', 1)">
        <ChevronRight />
      </button>
    </header>

    <div class="weekday-grid">
      <span v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day">{{ day }}</span>
    </div>
    <div class="calendar-grid">
      <div v-for="blank in firstWeekday" :key="`blank-${blank}`" class="calendar-cell blank"></div>
      <button
        v-for="day in daysInMonth"
        :key="day"
        type="button"
        class="calendar-cell"
        :class="{ today: isToday(day) }"
        @click="$emit('open-date', dateKey(day))"
      >
        <span>{{ day }}</span>
        <div class="day-images">
          <img
            v-for="(image, index) in dayImages(day)"
            :key="index"
            :src="image"
            alt=""
          />
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  logs: { type: Array, default: () => [] },
  clothesById: { type: Object, default: () => ({}) },
  outfitsById: { type: Object, default: () => ({}) },
  year: Number,
  month: Number
})

defineEmits(['open-date', 'navigate'])
const date = computed(() => new Date(props.year, props.month, 1))
const daysInMonth = computed(() => new Date(props.year, props.month + 1, 0).getDate())
const firstWeekday = computed(() => date.value.getDay())

function dateKey(day) {
  return `${props.year}-${String(props.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function dayImages(day) {
  const key = dateKey(day)
  return props.logs.filter((log) => log.date === key).flatMap((log) => {
    if (log.itemId) {
      const image = props.clothesById[log.itemId]?.coverImage
      return image ? [image] : []
    }
    const outfit = props.outfitsById[log.outfitId]
    if (!outfit) return []
    return outfit.itemIds.map((itemId) => props.clothesById[itemId]?.coverImage).filter(Boolean)
  }).slice(0, 3)
}

function isToday(day) {
  const now = new Date()
  return now.getFullYear() === props.year && now.getMonth() === props.month && now.getDate() === day
}
</script>
