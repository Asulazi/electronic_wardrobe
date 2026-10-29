import { db } from './db'
import { CATEGORIES, STATUSES } from './config'

async function loadXlsx() {
  return import('xlsx')
}

function categoryLabelByValue(value) {
  return CATEGORIES.find((category) => category.value === value)?.label || value || ''
}

function statusLabelByValue(value) {
  return STATUSES.find((status) => status.value === value)?.label || value || ''
}

function categoryValueByLabel(label) {
  return CATEGORIES.find((category) => category.label === label)?.value || 'other'
}

function statusValueByLabel(label) {
  return STATUSES.find((status) => status.label === label)?.value || 'normal'
}

export async function exportClothesExcel() {
  const XLSX = await loadXlsx()
  const clothes = await db.clothes.toArray()
  const rows = clothes.map((item) => ({
    名称: item.name || '',
    品类: categoryLabelByValue(item.category),
    状态: statusLabelByValue(item.status),
    季节: (item.seasons || []).join('/'),
    标签: (item.tags || []).join('/'),
    品牌: item.brand || '',
    尺码: item.size || '',
    价格: item.price == null ? '' : Number(item.price),
    材质: item.material || '',
    主色: item.primaryColor || '',
    辅色: item.secondaryColor || '',
    购入时间: item.purchasedAt || '',
    购买渠道: item.purchaseChannel || '',
    穿着次数: item.wearCount || 0,
    归档: item.archived ? '是' : '否',
    收藏: item.favorite ? '是' : '否',
    备注: item.memo || item.note || ''
  }))
  const sheet = XLSX.utils.json_to_sheet(rows)
  sheet['!cols'] = [
    { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 14 },
    { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 26 }
  ]
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, '单品清单')
  XLSX.writeFile(book, `电子衣橱单品_${new Date().toISOString().slice(0, 10)}.xlsx`)
  return rows.length
}

export async function importClothesExcel(file) {
  const XLSX = await loadXlsx()
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { type: 'array' })
  const sheet = book.Sheets[book.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  if (!rows.length) throw new Error('表格为空')

  const now = Date.now()
  const records = rows.map((row, index) => {
    const seasons = String(row.季节 || '')
      .split(/[\/,，、\s]+/)
      .map((label) => ({ 春: 'spring', 夏: 'summer', 秋: 'autumn', 冬: 'winter' }[label]))
      .filter(Boolean)
    const tags = String(row.标签 || '').split(/[\/,，、\s]+/).filter(Boolean)
    const price = row.价格 === '' || row.价格 == null ? null : Number(row.价格)
    return {
      name: String(row.名称 || `导入单品 ${index + 1}`).slice(0, 50),
      category: categoryValueByLabel(String(row.品类 || '')),
      status: statusValueByLabel(String(row.状态 || '')),
      seasons,
      tags,
      brand: String(row.品牌 || ''),
      size: String(row.尺码 || ''),
      price: Number.isFinite(price) ? price : null,
      material: String(row.材质 || ''),
      primaryColor: String(row.主色 || ''),
      secondaryColor: String(row.辅色 || ''),
      purchasedAt: String(row.购入时间 || ''),
      purchaseChannel: String(row.购买渠道 || ''),
      wearCount: Number(row.穿着次数 || 0) || 0,
      archived: String(row.归档 || '').includes('是'),
      favorite: String(row.收藏 || '').includes('是'),
      note: String(row.备注 || ''),
      memo: String(row.备注 || ''),
      image: null,
      images: [],
      color: '',
      originalName: '',
      width: 0,
      height: 0,
      processed: false,
      lastWornAt: null,
      createdAt: now + index,
      updatedAt: now + index
    }
  })

  await db.clothes.bulkAdd(records)
  return records.length
}
