import { categoryLabel } from './config'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败'))
    image.src = src
  })
}

export async function exportOutfitImage(outfit, clothesById) {
  const width = 1080
  const height = 1350
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.fillStyle = '#f5f2ed'
  context.fillRect(0, 0, width, height)
  context.fillStyle = '#17150f'
  context.font = '700 58px -apple-system, PingFang SC, sans-serif'
  context.fillText(outfit.name || '我的搭配', 60, 118)
  context.fillStyle = '#666058'
  context.font = '30px -apple-system, PingFang SC, sans-serif'
  const meta = [outfit.scene, outfit.temperature ? `${outfit.temperature}` : '', outfit.seasons?.length ? outfit.seasons.join('/') : '']
    .filter(Boolean).join(' · ')
  context.fillText(meta || 'Local Wardrobe', 62, 170)

  const items = outfit.itemIds.map((id) => clothesById[id]).filter(Boolean)
  if (!items.length) throw new Error('搭配里没有可用单品')
  const columns = Math.min(2, Math.max(1, Math.ceil(Math.sqrt(items.length))))
  const rows = Math.ceil(items.length / columns)
  const padding = 60
  const top = 230
  const gap = 32
  const cellWidth = (width - padding * 2 - gap * (columns - 1)) / columns
  const cellHeight = Math.min(340, (height - top - padding - gap * (rows - 1)) / rows)

  for (const [index, item] of items.entries()) {
    const x = padding + (index % columns) * (cellWidth + gap)
    const y = top + Math.floor(index / columns) * (cellHeight + gap)
    context.fillStyle = '#fff'
    context.fillRect(x, y, cellWidth, cellHeight)
    if (item.image) {
      try {
        const image = await loadImage(item.image)
        const scale = Math.min((cellWidth - 28) / image.width, (cellHeight - 28) / image.height)
        const drawWidth = image.width * scale
        const drawHeight = image.height * scale
        context.drawImage(image, x + (cellWidth - drawWidth) / 2, y + (cellHeight - drawHeight) / 2, drawWidth, drawHeight)
      } catch {
        context.fillStyle = '#99948c'
        context.font = '24px sans-serif'
        context.fillText(item.name, x + 18, y + cellHeight / 2)
      }
    } else {
      context.fillStyle = '#99948c'
      context.font = '24px sans-serif'
      context.fillText(item.name || categoryLabel(item.category), x + 18, y + cellHeight / 2)
    }
  }

  const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('图片生成失败')), 'image/png', 0.92))
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${outfit.name || '搭配'}_${new Date().toISOString().slice(0, 10)}.png`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
