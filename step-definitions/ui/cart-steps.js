import { Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import uiTestData from '../../test-data/ui-test-data.json' with { type: 'json' };

When('User adds the configured product to the cart', async function () {
  await this.productsPage.addProductToCart(uiTestData.productName);
});

When('User opens the cart from the confirmation dialog', async function () {
  await this.productsPage.openCartFromConfirmation();
});

Then('User sees the configured product in the cart', async function () {
  await expect(this.cartPage.productRow(uiTestData.productName)).toHaveCount(1);
});
