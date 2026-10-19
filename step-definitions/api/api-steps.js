import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import apiEndpoints from '../../config/api-endpoints.json' with { type: 'json' };
import apiTestData from '../../test-data/api-test-data.json' with { type: 'json' };
import { createApiUser } from '../../test-data/test-data.js';
import { getConfiguredCredentials } from '../../support/common-utils.js';

When('I request the products list', async function () {
  this.apiResponse = await this.apiClient.get(apiEndpoints.productsList);
});

When('I search products using configured {string} product data', async function (searchType) {
  const searchTerm = apiTestData.productSearch[searchType];
  if (typeof searchTerm !== 'string') {
    throw new Error(`No configured API product search data exists for "${searchType}".`);
  }

  this.searchTerm = searchTerm;
  this.apiResponse = await this.apiClient.post(apiEndpoints.searchProduct, {
    form: { search_product: searchTerm },
  });
});

When('I search for products without a search term', async function () {
  this.apiResponse = await this.apiClient.post(apiEndpoints.searchProduct, { form: {} });
});

When('I verify login using the configured valid credentials', async function () {
  const errorMessage =
    'Set VALID_USERNAME to a registered account email address and VALID_PASSWORD in the .env file to run this scenario.';
  const { username: email, password } = getConfiguredCredentials(errorMessage);
  if (!email.includes('@')) {
    throw new Error(errorMessage);
  }

  this.apiResponse = await this.apiClient.post(apiEndpoints.verifyLogin, {
    form: { email, password },
  });
});

When('I verify login without a password', async function () {
  this.apiResponse = await this.apiClient.post(apiEndpoints.verifyLogin, {
    form: { email: apiTestData.missingCredentialsEmail },
  });
});

When('I verify login using the newly created API user', async function () {
  this.apiResponse = await this.apiClient.post(apiEndpoints.verifyLogin, {
    form: {
      email: this.apiUser.email,
      password: this.apiUser.password,
    },
  });
});

Given('I prepare a unique API user', function () {
  this.apiUser = createApiUser();
});

When('I create the API user', async function () {
  this.apiAction = 'create';
  this.apiResponse = await this.apiClient.post(apiEndpoints.createAccount, {
    form: this.apiUser,
  });
});

When('I update the API user', async function () {
  this.apiAction = 'update';
  this.apiResponse = await this.apiClient.put(apiEndpoints.updateAccount, {
    form: { ...this.apiUser, ...apiTestData.accountUpdate },
  });
});

When('I delete the API user', async function () {
  this.apiAction = 'delete';
  this.apiResponse = await this.apiClient.delete(apiEndpoints.deleteAccount, {
    form: {
      email: this.apiUser.email,
      password: this.apiUser.password,
    },
  });
});

Then('the API response status is {int}', function (expectedStatus) {
  this.apiClient.assertStatus(this.apiResponse, expectedStatus);
});

Then('the API response code is {int}', async function (expectedCode) {
  await this.apiClient.assertResponseCode(this.apiResponse, expectedCode);

  // Track successful account lifecycle calls so the After hook can safely clean up.
  if (this.apiAction === 'create' && expectedCode === 201) {
    this.apiUserCreated = true;
  }
  if (this.apiAction === 'delete' && expectedCode === 200) {
    this.apiUserCreated = false;
  }
});

Then('the API response message is {string}', async function (expectedMessage) {
  await this.apiClient.assertResponseMessage(this.apiResponse, expectedMessage);
});

Then('the API response contains products', async function () {
  const products = await this.apiClient.assertArrayProperty(this.apiResponse, 'products');
  expect(products.length).toBeGreaterThan(0);
});

Then('the product results include the configured search term', async function () {
  const products = await this.apiClient.assertArrayProperty(this.apiResponse, 'products');
  expect(products.length).toBeGreaterThan(0);
  const searchTerm = this.searchTerm.toLowerCase();
  const hasMatchingProduct = products.some(
    (product) =>
      typeof product === 'object' &&
      product !== null &&
      'name' in product &&
      typeof product.name === 'string' &&
      product.name.toLowerCase().includes(searchTerm),
  );

  expect(hasMatchingProduct).toBe(true);
});

Then('the API response contains exactly {int} {string}', async function (count, propertyName) {
  await this.apiClient.assertArrayProperty(this.apiResponse, propertyName, count);
});
