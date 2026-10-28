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
