import { categoryLabel, seasonText } from './config'

const LAYER_ORDER = [
  { key: 'outerwear', label: '外套' },
  { key: 'top', label: '上装' },
  { key: 'dress', label: '连衣裙' },
  { key: 'bottom', label: '下装' },
  { key: 'shoes', label: '鞋履' },
  { key: 'hat', label: '帽子' },
  { key: 'accessory', label: '配饰' },
  { key: 'other', label: '其他' }
]

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败'))
    image.src = src
  })
}

function sortOutfitItems(items) {
  return [...items].sort((left, right) => {
    const leftLayer = LAYER_ORDER.findIndex((layer) => layer.key === left.category)
    const rightLayer = LAYER_ORDER.findIndex((layer) => layer.key === right.category)
    return (leftLayer < 0 ? 99 : leftLayer) - (rightLayer < 0 ? 99 : rightLayer)
  })
}

function drawBadge(context, text, x, y) {
  context.font = '500 21px -apple-system, PingFang SC, sans-serif'
  const width = Math.max(54, context.measureText(text).width + 26)
  context.fillStyle = 'rgba(23,21,15,.78)'
  context.beginPath()
  context.roundRect(x, y, width, 36, 18)
  context.fill()
  context.fillStyle = '#fff'
  context.textBaseline = 'middle'
  context.fillText(text, x + 13, y + 19)
  context.textBaseline = 'alphabetic'
}

function drawBodyFigure(context, left, top, width, height) {
  context.save()
  context.translate(left + width / 2, top)
  context.fillStyle = 'rgba(23,21,15,.07)'
  context.strokeStyle = 'rgba(23,21,15,.16)'
  context.lineWidth = 3
  context.beginPath()
  context.arc(0, 62, 43, 0, Math.PI * 2)
  context.stroke()
  context.beginPath()
  context.moveTo(-95, 150)
  context.bezierCurveTo(-58, 118, 58, 118, 95, 150)
  context.lineTo(68, 390)
  context.lineTo(-68, 390)
  context.closePath()
  context.stroke()
  context.beginPath()
  context.moveTo(-68, 390)
  context.lineTo(-52, 760)
  context.lineTo(-17, 760)
  context.lineTo(0, 470)
  context.lineTo(17, 760)
  context.lineTo(52, 760)
  context.lineTo(68, 390)
  context.closePath()
  context.stroke()
  context.restore()
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function drawContainImage(context, image, left, top, size) {
  const scale = Math.min(size / image.width, size / image.height)
  const width = image.width * scale
  const height = image.height * scale
  context.drawImage(image, left + (size - width) / 2, top + (size - height) / 2, width, height)
}

export async function buildOutfitImage(outfit, clothesById, createdAt) {
  const width = 1080
  const height = 1600
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.fillStyle = '#f5f2ed'
  context.fillRect(0, 0, width, height)

  context.fillStyle = '#17150f'
  context.font = '700 62px -apple-system, PingFang SC, sans-serif'
  context.fillText(outfit.name || '我的搭配', 64, 118)
  context.fillStyle = '#666058'
  context.font = '30px -apple-system, PingFang SC, sans-serif'
  const meta = [
    outfit.scene,
    outfit.weather,
    outfit.temperature ? `${outfit.temperature}` : '',
    seasonText(outfit.seasons)
  ].filter(Boolean).join(' · ')
  context.fillText(meta || '本地衣橱 · 全季', 66, 176)

  const entries = outfit.itemIds
    .map((itemId) => [itemId, outfit.layout?.[String(itemId)]])
    .filter(([, layout]) => layout)
    .map(([itemId, layout]) => ({ itemId, ...layout }))
    .sort((left, right) => (left.z || 0) - (right.z || 0))

  if (entries.length) {
    for (const entry of entries) {
      const item = clothesById[entry.itemId]
      if (!item?.coverImage && !item?.image) continue
      try {
        const left = entry.x / 100 * width - entry.width / 100 * width / 2
        const top = entry.y / 100 * height - entry.width / 100 * width / 2
        const size = entry.width / 100 * width
        const image = await loadImage(item.coverImage || item.image)
        context.save()
        context.translate(left + size / 2, top + size / 2)
        context.rotate((entry.rotation || 0) * Math.PI / 180)
        drawContainImage(context, image, -size / 2, -size / 2, size)
        context.restore()
      } catch {}
    }
  } else {
    const sourceItems = outfit.itemIds.map((id) => clothesById[id]).filter(Boolean)
    if (!sourceItems.length) throw new Error('搭配里没有可用单品')
    const items = sortOutfitItems(sourceItems)
    drawBodyFigure(context, 90, 330, width - 180, 850)
    for (const [index, item] of items.entries()) {
      if (!item.image) continue
      try {
        const image = await loadImage(item.coverImage || item.image)
        drawContainImage(context, image, 250 + (index % 2) * 230, 430 + Math.floor(index / 2) * 320, 210)
      } catch {}
    }
  }

  const created = new Date(createdAt || outfit.createdAt || Date.now())
  const createdText = `${created.getFullYear()}.${String(created.getMonth() + 1).padStart(2, '0')}.${String(created.getDate()).padStart(2, '0')}`
  const summary = outfit.itemIds.map((id) => clothesById[id]).filter(Boolean).map((item) => categoryLabel(item.category)).join(' · ')
  context.fillStyle = '#666058'
  context.font = '24px -apple-system, PingFang SC, sans-serif'
  context.textAlign = 'right'
  context.fillText(summary || '本地衣橱', width - 64, height - 102)
  context.fillStyle = '#8b8177'
  context.font = '22px -apple-system, PingFang SC, sans-serif'
  context.fillText(`${createdText} · 共 ${outfit.itemIds.length} 件 · 本地衣橱生成`, width - 64, height - 64)
  context.textAlign = 'left'

  return await new Promise((resolve, reject) => canvas.toBlob(
    (result) => result ? resolve(result) : reject(new Error('图片生成失败')),
    'image/png',
    0.92
  ))
}

export async function exportOutfitImage(outfit, clothesById) {
  const blob = await buildOutfitImage(outfit, clothesById, outfit.createdAt)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${outfit.name || '搭配'}_${new Date().toISOString().slice(0, 10)}.png`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
