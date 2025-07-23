import { test, expect } from '@playwright/test';

test('happy path: check required payment form elements after full enrollment flow', async ({ browser }) => {
  const context = await browser.newContext({
    userAgent: 'BetterStack',
    // headless: false,
    // slowMo: 50,
  });
  const page = await context.newPage();

  console.log('⏳ Navigating to homepage...');
  await page.goto('https://roadside.goodsam.com/?test=hello1', { waitUntil: 'load' });
  console.log('✅ Page loaded:', page.url());

  // Click visible Enroll button
  const enrollButtons = page.locator('button, a', { hasText: 'Enroll' });
  let enrollClicked = false;
  for (let i = 0; i < await enrollButtons.count(); i++) {
    if (await enrollButtons.nth(i).isVisible()) {
      console.log(`✅ Found visible Enroll button #${i + 1}, clicking...`);
      await Promise.all([
        page.waitForURL(url => url.href.includes('/checkout'), { timeout: 20000 }),
        enrollButtons.nth(i).click(),
      ]);
      enrollClicked = true;
      break;
    }
  }
  if (!enrollClicked) throw new Error('No visible Enroll button found');
  console.log('✅ Enroll button clicked, navigated to:', page.url());

  // Select Platinum Complete coverage
  const platinumLink = page.locator('a.selectPlanLink[title="Select Platinum Complete"]').first();
  await platinumLink.waitFor({ state: 'visible' });
  await Promise.all([
    page.waitForLoadState('networkidle'),
    platinumLink.click(),
  ]);
  console.log('✅ Platinum Complete coverage selected');

  // Click 3-year term price
  const priceElements = page.locator('div.curr-price');
  let priceClicked = false;
  for (let i = 0; i < await priceElements.count(); i++) {
    const text = await priceElements.nth(i).textContent();
    if (text?.includes('$359.85')) {
      await priceElements.nth(i).click();
      priceClicked = true;
      break;
    }
  }
  if (!priceClicked) throw new Error('3-year term option not found');
  console.log('✅ 3-year term selected ($359.85)');

  // Fill RV info and terms
  await page.selectOption('select[name="vehicleType"]', { label: '5th Wheel Trailer' });
  const vehicleYearSelect = page.locator('select[name="vehicleYear"]');
  if (await vehicleYearSelect.count()) await vehicleYearSelect.selectOption({ label: '2023' });
  const vehicleMakeInput = page.locator('input[name="vehicleMake"]');
  if (await vehicleMakeInput.count()) await vehicleMakeInput.fill('Forest River');
  const vehicleModelInput = page.locator('input[name="vehicleModel"]');
  if (await vehicleModelInput.count()) await vehicleModelInput.fill('XLR Boost');
  const termsCheckbox = page.locator('input[type="checkbox"][name="terms"]');
  if (await termsCheckbox.count() && !(await termsCheckbox.isChecked())) await termsCheckbox.check();
  console.log('✅ RV info and terms filled/checked');

  // Continue to Customer Information page
  const continueButton = page.locator('button, a', { hasText: /Continue|Next|Submit|Proceed|Review|Checkout/i }).first();
  await continueButton.waitFor({ state: 'visible', timeout: 10000 });
  const continueButtonElem = await continueButton.elementHandle();
  if (!continueButtonElem) throw new Error('Continue button element handle not found');
  await continueButtonElem.waitForElementState('enabled', { timeout: 10000 });
  await Promise.all([
    page.waitForURL('**/checkout/account-info', { timeout: 30000 }),
    continueButton.click(),
  ]);
  console.log('✅ Continued to Customer Information page');

  // Find frame with billing[firstName]
  const frames = page.frames();
  async function findFrameWithInput(frames, selector) {
    for (const frame of frames) {
      try {
        if ((await frame.locator(selector).count()) > 0) return frame;
      } catch {}
    }
    return null;
  }
  const custSelector = 'input[name="billing[firstName]"]';
  let customerFrame = await findFrameWithInput(frames, custSelector);
  if (!customerFrame) {
    const mainCount = await page.locator(custSelector).count();
    customerFrame = mainCount > 0 ? page : null;
  }
  if (!customerFrame) throw new Error('Cannot find personal info form fields');

  // Fill personal and billing info
  await customerFrame.fill('input[name="billing[firstName]"]', 'John');
  await customerFrame.fill('input[name="billing[lastName]"]', 'Doe');
  await customerFrame.fill('input[name="billing[emailAddress]"], input[name="billing[email]"]', 'john.doe@example.com');
  await customerFrame.fill('input[name="billing[emailConfirm]"]', 'john.doe@example.com');
  await customerFrame.fill('input[name="billing[phoneNumber]"], input[name="billing[phone]"], input[name="phoneNumber"]', '1234567890');

  const addressInputs = [
    ['input[name="billing[addressLine1]"], input[name="billing[address1]"], input[name="address1"]', '123 RV Street'],
    ['input[name="billing[city]"], input[name="city"]', 'Camp Town'],
    ['input[name="billing[zipOrPostalCode]"], input[name="billing[zipCode]"], input[name="zipCode"]', '33101'],
  ];
  for (const [selector, value] of addressInputs) {
    const ele = customerFrame.locator(selector);
    if ((await ele.count()) > 0) await ele.fill(value);
  }
  await customerFrame.selectOption('select[name="billing[stateOrProvince]"]', 'FL');
  console.log('✅ Billing address and state filled');

  // Click Next Step and wait for page load
  const nextStepBtn = customerFrame.locator('button#submitAddress');
  await nextStepBtn.waitFor({ state: 'visible', timeout: 15000 });
  await expect(nextStepBtn).toBeEnabled({ timeout: 15000 });
  console.log('Clicking Next Step button...');
  await Promise.all([
    page.waitForLoadState('domcontentloaded', { timeout: 30000 }),
    nextStepBtn.click(),
  ]);

  // Click Decline offer and continue and wait navigation
  const declineOfferSelector = 'a#decline-offer';
  await page.waitForSelector(declineOfferSelector, { state: 'visible', timeout: 15000 });
  const declineOfferLink = page.locator(declineOfferSelector).first();
  const declineOfferElem = await declineOfferLink.elementHandle();
  if (!declineOfferElem) throw new Error('"Decline offer and continue" link element handle not found');
  await declineOfferElem.waitForElementState('enabled', { timeout: 10000 });
  console.log('Clicking Decline offer and continue link...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
    declineOfferLink.click(),
  ]);
  console.log('Navigated to payment step');

  // Click Review Payment button and wait navigation
  const reviewPaymentBtn = page.locator('button#submitReview');
  await reviewPaymentBtn.waitFor({ state: 'visible', timeout: 20000 });
  await expect(reviewPaymentBtn).toBeEnabled({ timeout: 20000 });
  console.log('Clicking Review Payment button...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
    reviewPaymentBtn.click(),
  ]);
  console.log('Navigated to payment input page');

  // Wait a bit for dynamic content loading
  await page.waitForTimeout(2000);

  // Check presence of required payment form elements in ANY frame
  async function labelIsVisibleAnywhere(labelSelector) {
    for (const frame of page.frames()) {
      if (await frame.locator(labelSelector).isVisible().catch(() => false)) return true;
    }
    return false;
  }

  const requiredSelectors = [
    '#CardNumberLabel',
    '#CardHolderNameLabel',
    '#ExpiryLabel',
    '#CVVLabel',
    'input[type="button"].submit-button',
  ];

  for (const selector of requiredSelectors) {
    const found = await labelIsVisibleAnywhere(selector);
    expect(found, `${selector} should be visible in some frame`).toBe(true);
  }

  console.log('✅ All required payment form elements are present. Test complete.');

  await context.close();
});
