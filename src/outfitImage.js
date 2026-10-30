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

export async function exportOutfitImage(outfit, clothesById) {
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

  const sourceItems = outfit.itemIds.map((id) => clothesById[id]).filter(Boolean)
  if (!sourceItems.length) throw new Error('搭配里没有可用单品')
  const items = sortOutfitItems(sourceItems)
  const primary = items.find((item) => ['dress', 'outerwear', 'top'].includes(item.category)) || items[0]
  const others = items.filter((item) => item !== primary)
  const slots = [
    { x: 110, y: 310, width: 360, height: 520 },
    { x: 610, y: 310, width: 360, height: 300 },
    { x: 610, y: 650, width: 360, height: 180 }
  ]

  if (primary.image) {
    try {
      const image = await loadImage(primary.image)
      context.fillStyle = '#fff'
      roundedRect(context, slots[0].x, slots[0].y, slots[0].width, slots[0].height, 26)
      context.fill()
      const scale = Math.min((slots[0].width - 30) / image.width, (slots[0].height - 30) / image.height)
      const drawWidth = image.width * scale
      const drawHeight = image.height * scale
      context.drawImage(
        image,
        slots[0].x + (slots[0].width - drawWidth) / 2,
        slots[0].y + (slots[0].height - drawHeight) / 2,
        drawWidth,
        drawHeight
      )
    } catch {
      drawBodyFigure(context, slots[0].x, slots[0].y, slots[0].width, slots[0].height)
    }
  } else {
    drawBodyFigure(context, slots[0].x, slots[0].y, slots[0].width, slots[0].height)
  }
  drawBadge(context, LAYER_ORDER.find((layer) => layer.key === primary.category)?.label || categoryLabel(primary.category), slots[0].x + 16, slots[0].y + 16)

  for (const [index, item] of others.slice(0, 2).entries()) {
    const slot = slots[index + 1]
    context.fillStyle = '#fff'
    roundedRect(context, slot.x, slot.y, slot.width, slot.height, 24)
    context.fill()
    if (item.image) {
      try {
        const image = await loadImage(item.image)
        const scale = Math.min((slot.width - 26) / image.width, (slot.height - 26) / image.height)
        const drawWidth = image.width * scale
        const drawHeight = image.height * scale
        context.drawImage(image, slot.x + (slot.width - drawWidth) / 2, slot.y + (slot.height - drawHeight) / 2, drawWidth, drawHeight)
      } catch {
        context.fillStyle = '#99948c'
        context.font = '24px -apple-system, PingFang SC, sans-serif'
        context.fillText(item.name, slot.x + 18, slot.y + slot.height / 2)
      }
    } else {
      context.fillStyle = '#99948c'
      context.font = '24px -apple-system, PingFang SC, sans-serif'
      context.fillText(item.name || categoryLabel(item.category), slot.x + 18, slot.y + slot.height / 2)
    }
    drawBadge(context, LAYER_ORDER.find((layer) => layer.key === item.category)?.label || categoryLabel(item.category), slot.x + 14, slot.y + 14)
  }

  context.fillStyle = '#666058'
  context.font = '24px -apple-system, PingFang SC, sans-serif'
  const summary = items.map((item) => categoryLabel(item.category)).join(' · ')
  context.fillText(summary, 66, 1290)
  context.fillStyle = '#8b8177'
  context.font = '22px -apple-system, PingFang SC, sans-serif'
  context.fillText(`共 ${items.length} 件 · 本地衣橱生成`, 66, 1332)

  const blob = await new Promise((resolve, reject) => canvas.toBlob(
    (result) => result ? resolve(result) : reject(new Error('图片生成失败')),
    'image/png',
    0.92
  ))
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${outfit.name || '搭配'}_${new Date().toISOString().slice(0, 10)}.png`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
