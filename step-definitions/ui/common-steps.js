import { Given } from '@cucumber/cucumber';

Given('User is on the AutomationExercise home page', async function () {
  await this.homePage.open();
});

Given('User is on the AutomationExercise products page', async function () {
  await this.homePage.open();
  await this.homePage.openProductsPage();
});
