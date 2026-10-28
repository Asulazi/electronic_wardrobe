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
  clothes: '++id, name, category, favorite, archived, createdAt, updatedAt',
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

db.version(4).stores({
  clothes: '++id, name, category, favorite, archived, status, createdAt, updatedAt',
  outfits: '++id, name, favorite, scene, createdAt, updatedAt',
  wearLogs: '++id, date, itemId, outfitId',
  settings: 'key'
}).upgrade(async (tx) => {
  await tx.clothes.toCollection().modify((item) => {
    item.images = item.images || (item.image ? [item.image] : [])
    item.status = item.status || 'normal'
    item.archived = item.archived || false
    item.material = item.material || ''
    item.primaryColor = item.primaryColor || ''
    item.secondaryColor = item.secondaryColor || ''
    item.size = item.size || ''
    item.purchaseChannel = item.purchaseChannel || ''
    item.purchasedAt = item.purchasedAt || ''
    item.tags = item.tags || []
    item.memo = item.memo || ''
    item.lastWornAt = item.lastWornAt || null
  })
  await tx.outfits.toCollection().modify((outfit) => {
    outfit.scene = outfit.scene || ''
    outfit.weather = outfit.weather || ''
    outfit.temperature = outfit.temperature || ''
    outfit.styleTags = outfit.styleTags || []
  })
})
