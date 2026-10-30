import { test, expect } from '@playwright/test'

async function addGeneratedImages(page, colors, names, selector = 'input[type="file"]') {
  await page.evaluate(async ({ colors, names, selector }) => {
    const transfer = new DataTransfer()
    for (const [index, color] of colors.entries()) {
      const canvas = document.createElement('canvas')
      canvas.width = 50
      canvas.height = 54
      const context = canvas.getContext('2d')
      context.fillStyle = color
      context.fillRect(0, 0, canvas.width, canvas.height)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      transfer.items.add(new File([blob], names[index], { type: 'image/png' }))
    }
    const input = document.querySelector(selector)
    input.files = transfer.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, { colors, names, selector })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/electronic_wardrobe/')
  await page.evaluate(async () => {
    indexedDB.deleteDatabase('electronic_wardrobe')
    localStorage.clear()
  sessionStorage.clear()
  })
  await page.reload()
  await page.goto('/electronic_wardrobe/')
  await expect(page.locator('.bottom-nav')).toBeVisible()
})

test('批量入库、封面修改和重复图片修复', async ({ page }) => {
  await addGeneratedImages(page, ['#4a69bd', '#ccac84'], ['blue.png', 'sand.png'])
  await expect(page.locator('.import-panel')).toContainText('待入库 2 件')
  await page.locator('.import-fields input').first().fill('蓝色外套')
  await page.locator('.import-fields input').nth(1).fill('沙色上衣')
  await page.getByRole('button', { name: '入库 2 件' }).click()
  await expect(page.locator('.product-card')).toHaveCount(2)

  await page.locator('.product-card').first().click()
  const carouselImage = page.locator('.carousel img')
  await expect(carouselImage).toBeVisible()
  await expect.poll(async () => carouselImage.evaluate((node) => node.naturalWidth)).toBeGreaterThan(0)

  await addGeneratedImages(page, ['#dfe7f5'], ['detail.png'], '.add-photo input')
  await expect(page.locator('.thumbnail-strip button')).toHaveCount(2)
  await page.locator('.thumbnail-strip button').nth(1).click()
  await page.getByRole('button', { name: '设为封面' }).click()
  await expect(page.locator('.thumbnail-strip button').first()).toHaveClass(/active/)
  await page.locator('.detail-grid input').first().fill('蓝色风衣')
  await page.locator('.detail-topbar').getByRole('button', { name: '保存' }).click()
  await expect(page.locator('.sheet')).toHaveCount(0)
  await expect(page.locator('.product-title').first()).toHaveText('蓝色风衣')

  await page.evaluate(async () => {
    const { db } = await import('/electronic_wardrobe/src/db.js')
    const item = await db.clothes.where('name').equals('蓝色风衣').first()
    const image = item.images[0]
    await db.clothes.update(item.id, { images: [image, image, image] })
  })
  await page.reload()
  await expect.poll(async () => page.evaluate(async () => {
    const { db } = await import('/electronic_wardrobe/src/db.js')
    const item = await db.clothes.where('name').equals('蓝色风衣').first()
    return item.images.length
  })).toBe(1)
  await page.locator('.product-title', { hasText: '蓝色风衣' }).click()
  await expect(page.locator('.carousel-count')).toHaveText('1/1')
  await expect(page.locator('.thumbnail-strip')).toHaveCount(0)
})

test('日历翻月、任意日期补录和缩略预览', async ({ page }) => {
  await addGeneratedImages(page, ['#4a69bd'], ['blue.png'])
  await page.getByRole('button', { name: '入库 1 件' }).click()
  await expect(page.locator('.product-card')).toHaveCount(1)

  await page.getByRole('button', { name: '日历' }).click()
  const monthTitle = page.locator('.calendar-header strong')
  const currentMonth = await monthTitle.textContent()
  await page.locator('.round-button').first().click()
  await expect(monthTitle).not.toHaveText(currentMonth)
  await page.locator('.round-button').nth(1).click()
  await expect(monthTitle).toHaveText(currentMonth)

  await page.locator('.calendar-cell:not(.blank)').nth(2).click()
  await page.getByRole('button', { name: '补录单品' }).click()
  await expect(page.locator('.picker-title')).toContainText('选择单品')
  await page.locator('.selection-card').first().click()
  await expect(page.locator('.selection-card').first()).toHaveClass(/selected/)
  await page.getByRole('button', { name: /确认补录/ }).click()
  await expect(page.locator('.date-log-item')).toContainText('单品 01')
  await expect(page.locator('.date-log-item img')).toBeVisible()
  await page.locator('.date-log-item').first().click()
  await expect(page.locator('.detail-topbar')).toContainText('保存')
  await page.locator('.detail-topbar').getByRole('button', { name: '取消' }).click()
  await expect(page.locator('.sheet')).toHaveCount(0)
})

test('搭配详情使用中文季节并生成成套标注海报', async ({ page }) => {
  await addGeneratedImages(page, ['#4a69bd', '#ccac84'], ['top.png', 'bottom.png'])
  await expect(page.locator('.import-panel')).toContainText('待入库 2 件')
  await page.locator('.import-fields input').first().fill('黑上衣')
  await page.locator('.import-fields select').first().selectOption('top')
  await page.locator('.import-fields input').nth(1).fill('米裤子')
  await page.locator('.import-fields select').nth(1).selectOption('bottom')
  await page.getByRole('button', { name: '入库 2 件' }).click()
  await expect(page.locator('.product-card')).toHaveCount(2)

  await page.getByRole('button', { name: '搭配册' }).click()
  await page.getByRole('button', { name: '创建搭配' }).click()
  await page.locator('.choice').nth(0).click()
  await page.locator('.choice').nth(1).click()
  await page.getByRole('button', { name: '夏' }).click()
  await page.getByRole('button', { name: '保存搭配' }).click()
  await page.getByRole('button', { name: '详情 / 记录' }).first().click()
  await expect(page.locator('.season-picker')).toContainText('夏')
  await expect(page.locator('.date-record-row input')).toHaveValue(/^\d{4}-\d{2}-\d{2}$/)
  await page.locator('.date-record-row input').fill('2026-10-27')
  await page.getByRole('button', { name: '补录到 10 月 27 日' }).click()
  await expect(page.locator('.topbar-copy')).toContainText('2026 年 10 月')
  await expect(page.locator('.profile-stats')).toContainText('记录次数')
  await expect(page.locator('.date-log-item img')).toBeVisible()
  await page.locator('.sheet-header').getByRole('button').click()
  await page.locator('.calendar-cell', { hasText: '27' }).click()
  await expect(page.locator('.date-log-item')).toContainText('未命名搭配')

  await page.locator('.sheet-header').getByRole('button').click()
  await page.getByRole('button', { name: '搭配册' }).click()
  await page.getByRole('button', { name: '详情 / 记录' }).first().click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出搭配图' }).click()
  const file = await download
  expect(await file.suggestedFilename()).toContain('未命名搭配')
  await expect(page.locator('.season-picker')).toContainText('夏')
})

test('移动端导航、悬浮按钮和横向布局', async ({ page }) => {
  await addGeneratedImages(page, ['#4a69bd'], ['blue.png'])
  await page.getByRole('button', { name: '入库 1 件' }).click()
  await expect(page.locator('.product-card')).toHaveCount(1)

  await expect(page.locator('.bottom-nav > button')).toHaveCount(5)
  const addButton = page.locator('.floating-add')
  await expect(addButton).toBeVisible()
  const box = await addButton.boundingBox()
  expect(box.x + box.width).toBeGreaterThan(390)
  expect(box.y + box.height).toBeLessThan(932)

  await page.locator('.product-card').first().click()
  await expect(page.locator('.detail-topbar')).toHaveCSS('position', 'sticky')
  await page.getByRole('button', { name: '取消' }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(430)
})
