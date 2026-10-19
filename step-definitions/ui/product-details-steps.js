import { Given, Then, When } from '@cucumber/cucumber';
import uiTestData from '../../test-data/ui-test-data.json' with { type: 'json' };

Given('User is on the configured product details page', async function () {
  await this.productsPage.open();
  await this.productsPage.openProductDetails(uiTestData.productName);
});

Then('User sees the configured product details', async function () {
  await this.productDetailsPage.assertProductDetails(
    uiTestData.productName,
    uiTestData.productDetails,
  );
});

When('User changes the quantity to {int}', async function (quantity) {
  await this.productDetailsPage.setQuantity(quantity);
});

Then('User sees the product quantity set to {int}', async function (quantity) {
  await this.productDetailsPage.assertQuantity(quantity);
});

When('User adds the product to the cart from its details page', async function () {
  await this.productDetailsPage.addToCart();
});

Then('User sees the add-to-cart confirmation', async function () {
  await this.productDetailsPage.assertAddToCartConfirmation();
});

When('User opens the cart from the product details confirmation', async function () {
  await this.productDetailsPage.openCartFromConfirmation();
});

Then('User sees the required product review fields', async function () {
  await this.productDetailsPage.assertReviewFields();
});

When(
  'User submits a review with name {string}, email {string}, and message {string}',
  async function (name, email, review) {
    await this.productDetailsPage.submitReview(name, email, review);
  },
);

Then('User sees the successful review submission message', async function () {
  await this.productDetailsPage.assertReviewSubmitted();
});
