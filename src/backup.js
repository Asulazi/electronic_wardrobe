import { db } from './db'
import { dataUrlFromImage } from './images'

function downloadJson(payload) {
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `electronic_wardrobe_backup_${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportBackup() {
  const [clothes, outfits, wearLogs] = await Promise.all([
    db.clothes.toArray(),
    db.outfits.toArray(),
    db.wearLogs.toArray()
  ])
  const payload = {
    type: 'electronic_wardrobe_backup',
    version: 4,
    exportedAt: new Date().toISOString(),
    data: {
      clothes: await Promise.all(clothes.map(async (item) => ({
        ...item,
        image: await dataUrlFromImage(item.image),
        images: await Promise.all((item.images || []).map((image) => dataUrlFromImage(image)))
      }))),
      outfits,
      wearLogs
    }
  }
  downloadJson(payload)
}

export async function importBackup(file) {
  const text = await file.text()
  const payload = JSON.parse(text)
  if (payload.type !== 'electronic_wardrobe_backup') throw new Error('备份文件格式不正确')
  const data = payload.data
  if (!data || !Array.isArray(data.clothes)) throw new Error('备份文件缺少数据')

  await db.transaction('rw', [db.clothes, db.outfits, db.wearLogs], async () => {
    await Promise.all([
      db.clothes.clear(),
      db.outfits.clear(),
      db.wearLogs.clear()
    ])
    const clothes = await Promise.all(data.clothes.map(async (item) => {
      const { id, ...rest } = item
      return {
        id,
        ...rest,
        image: await dataUrlFromImage(item.image),
        images: (await Promise.all((item.images || []).map((image) => dataUrlFromImage(image)))).filter(Boolean)
      }
    }))
    await db.clothes.bulkPut(clothes)
    if (Array.isArray(data.outfits)) await db.outfits.bulkPut(data.outfits)
    if (Array.isArray(data.wearLogs)) await db.wearLogs.bulkPut(data.wearLogs)
  })
  return {
    clothes: data.clothes.length,
    outfits: data.outfits?.length || 0,
    wearLogs: data.wearLogs?.length || 0
  }
}
