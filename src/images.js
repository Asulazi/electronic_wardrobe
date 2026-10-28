const urlCache = new WeakMap()

export function imageUrl(value) {
  if (isDataImage(value)) return value
  if (!isImageBlob(value)) return ''
  if (!urlCache.has(value)) urlCache.set(value, URL.createObjectURL(value))
  return urlCache.get(value)
}

export function isDataImage(value) {
  return typeof value === 'string' && /^data:image\//.test(value) && value.length > 20
}

export function isImageBlob(value) {
  return value instanceof Blob && value.size > 0
}

export function isImageValue(value) {
  return isImageBlob(value) || isDataImage(value)
}

export function dataUrlFromImage(value) {
  if (isDataImage(value)) return value
  if (!isImageBlob(value)) return null
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('图片读取失败'))
    reader.readAsDataURL(value)
  })
}

export async function normalizeImages(record) {
  const converted = await Promise.all([
    dataUrlFromImage(record.image),
    ...(record.images || []).map((image) => dataUrlFromImage(image))
  ])
  const images = converted.filter(Boolean)
  const image = images[0] || null
  const changed = record.image !== image ||
    !Array.isArray(record.images) ||
    record.images.length !== images.length ||
    record.images.some((value, index) => value !== images[index])

  return { image, images, changed }
}
