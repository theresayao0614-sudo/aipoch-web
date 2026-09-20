import { expect, test } from '@playwright/test'

test('legacy preview links arrive at the real MedFlow page without simulated success', async ({
  page
}) => {
  await page.goto('/medflow-redesign?state=success&result=success')
  await expect(page).toHaveURL(/\/medflow$/)
  await expect(page.getByRole('heading', { name: 'MedFlow', exact: true })).toBeVisible()
  await expect(page.getByLabel('Your name')).toHaveValue('')
  await expect(page.getByLabel('Email address')).toHaveValue('')
  await expect(page.locator('#mf-success')).toHaveCount(0)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://aipoch.com/medflow'
  )
})
