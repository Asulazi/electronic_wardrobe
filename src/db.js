import Dexie from 'dexie'

export const db = new Dexie('electronic_wardrobe')

db.version(1).stores({
  clothes: '++id, name, category, color, season, createdAt, updatedAt',
  outfits: '++id, name, season, createdAt, updatedAt',
  settings: 'key'
})

db.version(2).stores({
  clothes: '++id, name, category, color, season, createdAt, updatedAt',
  outfits: '++id, name, season, createdAt, updatedAt',
  settings: 'key'
}).upgrade(async (tx) => {
  await tx.clothes.toCollection().modify((item) => {
    item.seasons = item.season ? [item.season] : []
    item.image = item.image || null
    item.originalName = item.originalName || ''
    item.width = item.width || 0
    item.height = item.height || 0
    item.note = item.note || ''
  })
  await tx.outfits.toCollection().modify((outfit) => {
    outfit.itemIds = outfit.itemIds || []
    outfit.note = outfit.note || ''
  })
})

db.version(3).stores({
  clothes: '++id, name, category, favorite, createdAt, updatedAt',
  outfits: '++id, name, favorite, createdAt, updatedAt',
  wearLogs: '++id, date, itemId, outfitId',
  settings: 'key'
}).upgrade(async (tx) => {
  await tx.clothes.toCollection().modify((item) => {
    item.favorite = item.favorite || false
    item.brand = item.brand || ''
    item.price = item.price == null ? null : item.price
    item.wearCount = item.wearCount || 0
  })
  await tx.outfits.toCollection().modify((outfit) => {
    outfit.favorite = outfit.favorite || false
    outfit.wearCount = outfit.wearCount || 0
  })
})
