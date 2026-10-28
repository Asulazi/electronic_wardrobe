const urlCache = new WeakMap()

export function blobUrl(value) {
  if (!isImageBlob(value)) return ''
  if (!urlCache.has(value)) urlCache.set(value, URL.createObjectURL(value))
  return urlCache.get(value)
}

export function isImageBlob(value) {
  return value instanceof Blob && value.size > 0
}

export async function imageToBlob(value) {
  if (isImageBlob(value)) return value
  if (typeof value === 'string' && value.startsWith('data:')) {
    try {
      const response = await fetch(value)
      const blob = await response.blob()
      return isImageBlob(blob) ? blob : null
    } catch {
      return null
    }
  }
  return null
}

export async function normalizeImages(record) {
  const oldImage = await imageToBlob(record.image)
  const oldImages = await Promise.all((record.images || []).map((image) => imageToBlob(image)))
  const cleanedImages = oldImages.filter(Boolean)

  if (!cleanedImages.length && oldImage) cleanedImages.push(oldImage)
  const image = cleanedImages[0] || oldImage || null
  const images = image ? (cleanedImages.length ? cleanedImages : [image]) : []
  const changed = record.image !== image ||
    !Array.isArray(record.images) ||
    record.images.length !== images.length ||
    record.images.some((value, index) => value !== images[index])

  return { image, images, changed }
}
