import { expect, test } from '@playwright/test'

test('MedFlow success state truncates long display names inside the waitlist card', async ({
  page,
  isMobile
}) => {
  test.skip(!isMobile, 'the reported layout regression is mobile-specific')

  await page.route('**/api/v1/members', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 20000,
        msg: 'Success',
        data: { message: 'Email reserved.' }
      })
    })
  })

  await page.goto('/medflow')

  await page.getByLabel('Your name').fill('220986544444444444444444444444444444444')
  await page.getByLabel('Email address').fill('long-name@example.com')
  await page.getByLabel(/You hereby acknowledge and agree/).check()
  await page.locator('#mf-btn').click()

  const successCard = page.locator('#waitlist')
  const successTitle = page.locator('#mf-success-title')
  const successPrefix = page.locator('.mf-success-prefix')
  const successName = page.locator('.mf-success-name')
  const successSuffix = page.locator('.mf-success-suffix')

  await expect(successTitle).toBeVisible()
  await expect(successPrefix).toHaveText("You're in,\u00a0")
  await expect(successSuffix).toHaveText('!')
  await expect(successTitle).toContainText('220986544444444444444444444444444444444')

  const bounds = await successName.evaluate((name) => {
    const title = name.closest('#mf-success-title')
    const prefix = title?.querySelector('.mf-success-prefix')
    const suffix = title?.querySelector('.mf-success-suffix')
    const titleBox = title?.getBoundingClientRect()
    const prefixBox = prefix?.getBoundingClientRect()
    const nameBox = name.getBoundingClientRect()
    const suffixBox = suffix?.getBoundingClientRect()
    const cardBox = title?.closest('#waitlist')?.getBoundingClientRect()

    if (!titleBox || !prefixBox || !suffixBox || !cardBox) {
      throw new Error('Missing success title layout element')
    }

    return {
      titleLeft: titleBox.left,
      titleRight: titleBox.right,
      prefixLeft: prefixBox.left,
      prefixRight: prefixBox.right,
      nameLeft: nameBox.left,
      nameRight: nameBox.right,
      suffixLeft: suffixBox.left,
      suffixRight: suffixBox.right,
      cardLeft: cardBox.left,
      cardRight: cardBox.right,
      nameScrollWidth: name.scrollWidth,
      nameClientWidth: name.clientWidth
    }
  })

  await expect(successCard).toBeVisible()
  expect(bounds.titleLeft).toBeGreaterThanOrEqual(bounds.cardLeft)
  expect(bounds.titleRight).toBeLessThanOrEqual(bounds.cardRight)
  expect(bounds.prefixLeft).toBeGreaterThanOrEqual(bounds.cardLeft)
  expect(bounds.prefixRight).toBeLessThanOrEqual(bounds.cardRight)
  expect(bounds.nameLeft).toBeGreaterThanOrEqual(bounds.cardLeft)
  expect(bounds.nameRight).toBeLessThanOrEqual(bounds.cardRight)
  expect(bounds.suffixLeft).toBeGreaterThanOrEqual(bounds.cardLeft)
  expect(bounds.suffixRight).toBeLessThanOrEqual(bounds.cardRight)
  expect(bounds.nameScrollWidth).toBeGreaterThan(bounds.nameClientWidth)
})

test('existing MedFlow route renders the replacement without horizontal overflow', async ({
  page
}) => {
  await page.goto('/medflow')
  await expect(page.getByRole('heading', { name: 'MedFlow', exact: true })).toBeVisible()
  await expect(page.getByText('COMING SOON', { exact: true })).toBeVisible()
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://aipoch.com/medflow'
  )
  await expect(page.locator('main iframe')).toHaveCount(0)
  await expect(page.locator('header')).toHaveCount(1)
  await expect(page.locator('footer')).toHaveCount(1)
  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )
    ).toBe(true)
    const input = await page.locator('#mf-email').boundingBox()
    expect(input?.width).toBeGreaterThan(200)
  }
})

test('validates consent and email, sends the real payload once, and focuses success', async ({
  page
}) => {
  let requests = 0
  let body: unknown
  let release: () => void = () => {}
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/v1/members', async (route) => {
    requests++
    body = route.request().postDataJSON()
    await pending
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 20000, msg: 'Success', data: { message: 'Email reserved.' } })
    })
  })
  await page.goto('/medflow')
  await expect(page.locator('#mf-btn')).toBeDisabled()
  await page.getByRole('button', { name: 'Join the waitlist' }).click()
  await expect(page.locator('#mf-name')).toBeFocused()
  await page.getByLabel('Your name').fill('  Avery Chen  ')
  await page.getByLabel('Email address').fill('invalid')
  await expect(page.locator('#mf-btn')).toBeDisabled()
  await page.getByLabel(/You hereby acknowledge and agree/).check()
  await page.locator('#mf-btn').click()
  await expect(page.getByText('Enter a valid email address.', { exact: true })).toBeVisible()
  expect(requests).toBe(0)
  await page.getByLabel('Email address').fill('avery@example.com')
  await page.locator('#mf-btn').click()
  await expect.poll(() => requests).toBe(1)
  await expect(page.locator('#mf-name')).toBeDisabled()
  await expect(page.locator('#mf-email')).toBeDisabled()
  await expect(page.locator('#mf-consent')).toBeDisabled()
  await expect(page.locator('#mf-btn')).toBeDisabled()
  release()
  await expect(page.locator('#mf-success-title')).toHaveText("You're in, Avery!")
  await expect(page.locator('#mf-success-title')).toBeFocused()
  await expect(page.locator('#mf-form')).toHaveCount(0)
  expect(body).toEqual({
    display_name: 'Avery Chen',
    email: 'avery@example.com',
    source: 'medflowpre'
  })
  expect(requests).toBe(1)
  await expect(page).toHaveURL(/\/medflow#joined$/)
})

for (const scenario of [
  { status: 409, message: 'This email is already on the waitlist.' },
  { status: 429, message: 'Too many requests. Please try again later.' },
  { status: 500, message: 'Please try again later.' }
]) {
  test(`retains form values and permits retry after HTTP ${scenario.status}`, async ({ page }) => {
    let attempts = 0
    await page.route('**/api/v1/members', async (route) => {
      attempts++
      await route.fulfill({
        status: attempts === 1 ? scenario.status : 200,
        contentType: 'application/json',
        body: JSON.stringify(
          attempts === 1
            ? { code: scenario.status, msg: scenario.message, data: null }
            : { code: 20000, msg: 'Success', data: { message: 'Email reserved.' } }
        )
      })
    })
    await page.goto('/medflow')
    await page.getByLabel('Your name').fill('Avery')
    await page.getByLabel('Email address').fill('retry@example.com')
    await page.getByLabel(/You hereby acknowledge and agree/).check()
    await page.locator('#mf-btn').click()
    await expect(
      page.getByRole('form', { name: 'MedFlow early access' }).getByRole('alert')
    ).toHaveText(scenario.message)
    await expect(page.locator('#mf-email')).toHaveValue('retry@example.com')
    await expect(page.locator('#mf-btn')).toBeEnabled()
    await page.locator('#mf-btn').click()
    await expect(page.locator('#mf-success-title')).toBeVisible()
    expect(attempts).toBe(2)
  })
}
