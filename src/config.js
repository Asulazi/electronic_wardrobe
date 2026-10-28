export const CATEGORIES = [
  { value: 'top', label: '上衣', color: '#4c7d92' },
  { value: 'bottom', label: '下装', color: '#557a5b' },
  { value: 'outerwear', label: '外套', color: '#7b5f47' },
  { value: 'shoes', label: '鞋子', color: '#6d5d8f' },
  { value: 'hat', label: '帽子', color: '#8f5f5d' },
  { value: 'accessory', label: '配饰', color: '#776f66' },
  { value: 'dress', label: '连衣裙', color: '#8a5f7a' },
  { value: 'other', label: '其他', color: '#8b8177' }
]

export const SEASONS = [
  { value: 'spring', label: '春' },
  { value: 'summer', label: '夏' },
  { value: 'autumn', label: '秋' },
  { value: 'winter', label: '冬' }
]

export function categoryLabel(value) {
  return CATEGORIES.find((category) => category.value === value)?.label || '未分类'
}

export function categoryColor(value) {
  return CATEGORIES.find((category) => category.value === value)?.color || '#8b8177'
}

export function seasonText(values) {
  if (!values?.length) return '四季'
  return values
    .map((value) => SEASONS.find((season) => season.value === value)?.label)
    .filter(Boolean)
    .join(' · ')
}
