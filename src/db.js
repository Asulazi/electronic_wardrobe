import Dexie from 'dexie'

export const db = new Dexie('electronic_wardrobe')

db.version(1).stores({
  clothes: '++id, name, category, color, season, createdAt, updatedAt',
  outfits: '++id, name, season, createdAt, updatedAt',
  settings: 'key'
})
