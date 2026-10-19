import { Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { getConfiguredCredentials } from '../../support/common-utils.js';

When('User opens the login page', async function () {
  await this.homePage.openLoginPage();
});

When('User submits login credentials {string} and {string}', async function (email, password) {
  await this.loginPage.login(email, password);
});

When('User logs in with valid credentials from the environment', async function () {
  const { email, password } = getConfiguredCredentials();
  await this.loginPage.login(email, password);
});

When('User logs out', async function () {
  await this.loginPage.logout();
});

Then('User sees the login form', async function () {
  await expect(this.loginPage.loginForm).toBeVisible();
});

Then('User sees the invalid login error', async function () {
  await expect(this.loginPage.loginErrorMessage).toBeVisible();
});

Then('User sees the configured user logged in', async function () {
  const { username } = getConfiguredCredentials();
  await expect(this.loginPage.loggedInUser).toContainText(username);
  await expect(this.loginPage.logoutLink).toBeVisible();
});

Then('User sees the logged-out state', async function () {
  await expect(this.loginPage.logoutLink).toBeHidden();
  await expect(this.homePage.loginLink).toBeVisible();
});
