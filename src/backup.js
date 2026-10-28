import { db } from './db'

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('图片读取失败'))
    reader.readAsDataURL(blob)
  })
}

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
    version: 3,
    exportedAt: new Date().toISOString(),
    data: {
      clothes: await Promise.all(clothes.map(async (item) => ({
        ...item,
        image: item.image ? await blobToDataUrl(item.image) : null
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
        image: item.image ? await (async () => {
          const response = await fetch(item.image)
          return response.blob()
        })() : null
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
