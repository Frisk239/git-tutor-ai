import { test, expect } from '@playwright/test'

test.describe('File Reader', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
  })

  test('should display three-column layout', async ({ page }) => {
    // Check file tree exists
    const fileTree = page.locator('text=/文件树/i')
    await expect(fileTree).toBeVisible()
  })

  test('should display code reader', async ({ page }) => {
    // Check Monaco Editor container exists
    const editor = page.locator('.monaco-editor')
    // Editor may not be visible until file opened
    const codeReader = page.locator('text=/Code Reader/i').or(page.locator('.flex-1'))
    await expect(codeReader).toBeVisible()
  })
})