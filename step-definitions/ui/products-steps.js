import { Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import uiTestData from '../../test-data/ui-test-data.json' with { type: 'json' };

When('User searches for the configured product', async function () {
  await this.productsPage.search(uiTestData.productName);
});

Then('User sees the configured product in the results', async function () {
  await expect(this.productsPage.searchedProductsHeading).toBeVisible();
  await expect(this.productsPage.productHeading(uiTestData.productName)).toBeVisible();
});

When('User searches for the configured missing product', async function () {
  await this.productsPage.search(uiTestData.missingProductName);
});

Then('User sees no products in the results', async function () {
  await expect(this.productsPage.productCards()).toHaveCount(0);
});
