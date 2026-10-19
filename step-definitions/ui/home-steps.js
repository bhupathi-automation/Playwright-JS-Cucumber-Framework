import { Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';

When('User opens the AutomationExercise home page', async function () {
  await this.homePage.open();
});

Then('User sees the login navigation link', async function () {
  await expect(this.page).toHaveURL(`${this.config.application.baseUrl}/`);
  await expect(this.homePage.loginLink).toBeVisible();
});
