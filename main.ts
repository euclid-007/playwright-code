import { test, expect } from '@playwright/test';

test('Happy path to enroll in RV Platinum Complete coverage with validation check', async ({ browser }) => {
  const context = await browser.newContext({
    userAgent: 'BetterStack',
  });

  const page = await context.newPage();

  // Test Data
  const invalidData = {
    firstName: 'John',
    lastName: 'Doe',
    address: 'Invalid Address 123!@#',
    address2: 'Apt 4B',
    city: 'InvalidCity123',
    zip: '00000',
    phone: '555-123-4567',
    email: 'invalid-email-format',
    confirmEmail: 'different-email@test.com',
  };

  const validData = {
    address: '123 Main Street',
    city: 'Laurel',
    zip: '20707',
    email: 'john.doe@yahoo.com',
  };

  await test.step('Navigate to the Roadside site', async () => {
    await page.goto('https://roadside.goodsam.com/?test=hello1');
    await expect(page).toHaveURL(/roadside\.goodsam\.com/);
  });

  await test.step('Select Platinum Complete plan and enroll', async () => {
    await page.getByText('Platinum Complete').click();
    await page.getByRole('button', { name: 'Enroll now' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/plan/i);
  });

  await test.step('Select RV Coverage and 3-Year Term', async () => {
    await page.getByText('RV Coverage').click();
    await page.getByRole('radio', { name: '3 years' }).click();
  });

  await test.step('Select RV type and continue', async () => {
    await page.selectOption('select[name="rvType"]', '5th Wheel Trailer');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form')).toBeVisible();
  });

  await test.step('Fill form with invalid data', async () => {
    await page.getByLabel('First Name').fill(invalidData.firstName);
    await page.getByLabel('Last Name').fill(invalidData.lastName);
    await page.getByLabel('Address').fill(invalidData.address);
    await page.getByLabel('Address 2').fill(invalidData.address2);
    await page.getByLabel('City').fill(invalidData.city);
    await page.selectOption('select[name="state"]', { label: 'Maryland' });
    await page.getByLabel('Zip Code').fill(invalidData.zip);
    await page.selectOption('select[name="country"]', { label: 'United States' });
    await page.getByLabel('Phone').fill(invalidData.phone);
    await page.getByLabel('Email').fill(invalidData.email);
    await page.getByLabel('Confirm Email').fill(invalidData.confirmEmail);
    await page.getByRole('button', { name: 'Next Step' }).click();
  });

  await test.step('Check for validation errors and correct the data', async () => {
    const errorPopup = page.locator('.error-popup, .alert-error, [role="alert"], .validation-error');
    const errorMessage = page.locator('text=/error|invalid|required/i');

    if (await errorPopup.isVisible() || await errorMessage.isVisible()) {
      console.log('Validation errors detected, correcting data...');

      const closeButton = page.locator('.close, .dismiss, [aria-label="close"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }

      await page.getByLabel('Address').fill(validData.address);
      await page.getByLabel('City').fill(validData.city);
      await page.getByLabel('Zip Code').fill(validData.zip);
      await page.getByLabel('Email').fill(validData.email);
      await page.getByLabel('Confirm Email').fill(validData.email);
      await page.getByRole('button', { name: 'Next Step' }).click();
    }
    await page.waitForLoadState('networkidle');
  });

  await test.step('Decline any optional offers if shown', async () => {
    const declineOffer = page.getByRole('button', { name: /decline|no thanks|skip/i });
    if (await declineOffer.isVisible()) {
      await declineOffer.click();
    }
  });

  await test.step('Continue to payment review', async () => {
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Review Payment' }).click();
    await page.waitForLoadState('networkidle');
  });

  await test.step('Verify all payment form elements are visible', async () => {
    const cardNumberField = page.getByLabel(/card number|credit card/i);
    const cardholderNameField = page.getByLabel(/cardholder name|name on card/i);
    const expiryDateField = page.getByLabel(/expiry|expiration|exp date/i);
    const cvvField = page.getByLabel(/cvv|security code|cvc/i);
    const submitButton = page.getByRole('button', { name: /submit|pay now|complete/i });
    const termsCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /terms|conditions|agreement/i });

    await expect(cardNumberField).toBeVisible();
    await expect(cardholderNameField).toBeVisible();
    await expect(expiryDateField).toBeVisible();
    await expect(cvvField).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(termsCheckbox).toBeVisible();

    console.log('✅ All payment form fields verified.');
  });
});
