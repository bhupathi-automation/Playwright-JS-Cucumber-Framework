import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import apiEndpoints from '../../config/api-endpoints.json' with { type: 'json' };
import apiTestData from '../../test-data/api-test-data.json' with { type: 'json' };
import uiTestData from '../../test-data/ui-test-data.json' with { type: 'json' };

When('I log in through the UI using the API-created account', async function () {
  if (!this.apiUser) {
    throw new Error('The API-created account credentials are not available in the scenario World.');
  }

  await this.loginPage.login(this.apiUser.email, this.apiUser.password);
});

Then('the API-created user is logged in through the UI', async function () {
  await expect(this.loginPage.loggedInUser).toContainText(this.apiUser.name);
  await expect(this.loginPage.logoutLink).toBeVisible();
});

Given('I search the API for configured matching products', async function () {
  this.apiResponse = await this.apiClient.post(apiEndpoints.searchProduct, {
    form: { search_product: apiTestData.productSearch.matching },
  });
});

Then('the API provides a product for the UI search', async function () {
  this.apiClient.assertStatus(this.apiResponse, 200);
  await this.apiClient.assertResponseCode(this.apiResponse, 200);

  const products = await this.apiClient.assertArrayProperty(this.apiResponse, 'products');
  expect(products.length).toBeGreaterThan(0);

  const productName = products
    .map((product) =>
      typeof product === 'object' &&
      product !== null &&
      'name' in product &&
      typeof product.name === 'string'
        ? product.name.trim()
        : '',
    )
    .find(Boolean);

  expect(productName).toBeTruthy();
  if (!productName) {
    throw new Error('The API search results did not contain a product name.');
  }
  this.integrationProductName = productName;
});

When('I search the UI for the product returned by the API', async function () {
  if (!this.integrationProductName) {
    throw new Error('The API product name is not available for the UI search.');
  }

  await this.homePage.open();
  await this.homePage.openProductsPage();
  await this.productsPage.search(this.integrationProductName);
});

Then('the UI displays the product returned by the API', async function () {
  await expect(this.productsPage.searchedProductsHeading).toBeVisible();
  await expect(this.productsPage.productHeading(this.integrationProductName)).toBeVisible();
});

Given('I search the UI for the configured product', async function () {
  await this.homePage.open();
  await this.homePage.openProductsPage();
  await this.productsPage.search(uiTestData.productName);
});

Then('the UI displays the configured product', async function () {
  await expect(this.productsPage.searchedProductsHeading).toBeVisible();
  await expect(this.productsPage.productHeading(uiTestData.productName)).toBeVisible();
  this.uiProductName = await this.productsPage.getProductName(uiTestData.productName);
});

When('I search the API for the product displayed in the UI', async function () {
  if (!this.uiProductName) {
    throw new Error('The UI product name is not available for the API search.');
  }

  this.apiResponse = await this.apiClient.post(apiEndpoints.searchProduct, {
    form: { search_product: this.uiProductName },
  });
});

Then('the API results include the product displayed in the UI', async function () {
  this.apiClient.assertStatus(this.apiResponse, 200);
  await this.apiClient.assertResponseCode(this.apiResponse, 200);

  const products = await this.apiClient.assertArrayProperty(this.apiResponse, 'products');
  expect(products.length).toBeGreaterThan(0);

  const hasMatchingProduct = products.some(
    (product) =>
      typeof product === 'object' &&
      product !== null &&
      'name' in product &&
      typeof product.name === 'string' &&
      product.name.toLowerCase() === this.uiProductName.toLowerCase(),
  );

  expect(hasMatchingProduct).toBe(true);
});
