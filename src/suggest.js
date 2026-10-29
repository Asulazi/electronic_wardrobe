import { SCENES } from './config'

function parseTemperature(value) {
  if (!value) return null
  const number = Number(String(value).replace(/[^\d.-]/g, ''))
  return Number.isFinite(number) ? number : null
}

function seasonForTemperature(value) {
  if (value == null) return []
  if (value >= 26) return ['summer']
  if (value >= 18) return ['spring', 'autumn']
  if (value >= 8) return ['autumn', 'spring']
  return ['winter']
}

function scoreItem(item, seasons, scene) {
  let score = 0
  if (!item.archived && item.status === 'normal') score += 20
  if (seasons.length && item.seasons?.some((season) => seasons.includes(season))) score += 30
  if (!item.seasons?.length) score += 8
  if (scene && (item.tags || []).includes(scene)) score += 12
  score += Math.min(item.wearCount || 0, 10)
  if (item.favorite) score += 5
  return score
}

function pickByCategory(items, category, count = 1) {
  return items
    .filter((item) => item.category === category)
    .sort((a, b) => scoreItem(b) - scoreItem(a))
    .slice(0, count)
}

export function suggestOutfits(clothes, options = {}) {
  const scene = SCENES.includes(options.scene) ? options.scene : ''
  const temperature = parseTemperature(options.temperature)
  const seasons = options.seasons?.length ? options.seasons : seasonForTemperature(temperature)
  const available = clothes.filter((item) => !item.archived)
  const ranked = available
    .map((item) => ({ item, score: scoreItem(item, seasons, scene) }))
    .sort((a, b) => b.score - a.score)

  const tops = ranked.filter(({ item }) => item.category === 'top')
  const bottoms = ranked.filter(({ item }) => item.category === 'bottom')
  const dresses = ranked.filter(({ item }) => item.category === 'dress')
  const shoes = ranked.filter(({ item }) => item.category === 'shoes')
  const outerwear = ranked.filter(({ item }) => item.category === 'outerwear')
  const accessories = ranked.filter(({ item }) => ['hat', 'accessory'].includes(item.category))

  const variants = []
  for (let index = 0; index < 3; index += 1) {
    const ids = []
    if (dresses[index]) {
      ids.push(dresses[index].item.id)
    } else {
      if (tops[index]) ids.push(tops[index].item.id)
      if (bottoms[index]) ids.push(bottoms[index].item.id)
    }
    if (temperature != null && temperature <= 15 && outerwear[index]) ids.push(outerwear[index].item.id)
    if (shoes[index]) ids.push(shoes[index].item.id)
    if (accessories[index]) ids.push(accessories[index].item.id)
    if (ids.length) {
      variants.push({
        name: `${scene || '推荐'}方案 ${index + 1}`,
        scene,
        seasons,
        itemIds: [...new Set(ids)]
      })
    }
  }
  return variants
}
