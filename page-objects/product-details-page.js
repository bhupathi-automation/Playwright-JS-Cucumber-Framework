import { expect } from 'playwright/test';
import { logger } from '../utils/logger.js';

/**
 * @typedef {import('playwright').Page} Page
 */

/**
 * Page object for an individual product details page.
 */
export class ProductDetailsPage {
  /**
   * @param {Page} page
   */
  constructor(page) {
    this.page = page;
    this.productInformation = page.locator('.product-information');
    this.productHeading = this.productInformation.getByRole('heading', { level: 2 });
    this.category = this.productInformation.locator('p').filter({ hasText: 'Category:' });
    this.price = this.productInformation.locator('span > span').first();
    this.availability = this.productInformation.locator('p').filter({ hasText: 'Availability:' });
    this.condition = this.productInformation.locator('p').filter({ hasText: 'Condition:' });
    this.brand = this.productInformation.locator('p').filter({ hasText: 'Brand:' });
    this.quantityInput = this.productInformation.locator('#quantity');
    this.addToCartButton = this.productInformation.getByRole('button', { name: 'Add to cart' });
    this.addedHeading = page.getByRole('heading', { name: 'Added!', exact: true });
    this.addedMessage = page.getByText('Your product has been added to cart.', { exact: true });
    this.viewCartLink = page.getByRole('link', { name: 'View Cart' });
    this.reviewNameInput = page.locator('#name');
    this.reviewEmailInput = page.locator('#email');
    this.reviewInput = page.locator('#review');
    this.reviewSubmitButton = page.locator('#button-review');
    this.reviewSuccessMessage = page.locator('#review-section .alert-success');
  }

  /**
   * Set the quantity for the displayed product.
   *
   * @param {number} quantity
   * @returns {Promise<void>}
   */
  async setQuantity(quantity) {
    logger.debug('Setting the product quantity', { quantity });
    await this.quantityInput.fill(String(quantity));
  }

  /**
   * Assert that the displayed product matches its configured details.
   *
   * @param {string} productName
   * @param {{category: string, price: string, availability: string, condition: string, brand: string}} details
   * @returns {Promise<void>}
   */
  async assertProductDetails(productName, details) {
    await expect(this.productHeading).toBeVisible();
    await expect(this.productHeading).toHaveText(productName);
    await expect(this.category).toBeVisible();
    await expect(this.category).toHaveText(`Category: ${details.category}`);
    await expect(this.price).toBeVisible();
    await expect(this.price).toHaveText(details.price);
    await expect(this.availability).toBeVisible();
    await expect(this.availability).toHaveText(`Availability: ${details.availability}`);
    await expect(this.condition).toBeVisible();
    await expect(this.condition).toHaveText(`Condition: ${details.condition}`);
    await expect(this.brand).toBeVisible();
    await expect(this.brand).toHaveText(`Brand: ${details.brand}`);
  }

  /**
   * Assert that the quantity input contains the expected value.
   *
   * @param {number} quantity
   * @returns {Promise<void>}
   */
  async assertQuantity(quantity) {
    await expect(this.quantityInput).toHaveValue(String(quantity));
  }

  /**
   * Add the displayed product to the cart.
   *
   * @returns {Promise<void>}
   */
  async addToCart() {
    logger.debug('Adding the displayed product to the cart');
    await this.addToCartButton.click();
  }

  /**
   * Assert that adding the product to the cart is confirmed.
   *
   * @returns {Promise<void>}
   */
  async assertAddToCartConfirmation() {
    await expect(this.addedHeading).toBeVisible();
    await expect(this.addedMessage).toBeVisible();
    await expect(this.viewCartLink).toBeVisible();
  }

  /**
   * Open the cart from the add-to-cart confirmation.
   *
   * @returns {Promise<void>}
   */
  async openCartFromConfirmation() {
    logger.debug('Opening the cart from the add-to-cart confirmation');
    await this.viewCartLink.click();
  }

  /**
   * Submit a product review.
   *
   * @param {string} name
   * @param {string} email
   * @param {string} review
   * @returns {Promise<void>}
   */
  async submitReview(name, email, review) {
    logger.debug('Submitting a product review');
    await this.reviewNameInput.fill(name);
    await this.reviewEmailInput.fill(email);
    await this.reviewInput.fill(review);
    await this.reviewSubmitButton.click();
  }

  /**
   * Assert that the required product review fields are displayed.
   *
   * @returns {Promise<void>}
   */
  async assertReviewFields() {
    await expect(this.reviewNameInput).toBeVisible();
    await expect(this.reviewNameInput).toHaveAttribute('placeholder', 'Your Name');
    await expect(this.reviewNameInput).toHaveAttribute('required', '');
    await expect(this.reviewEmailInput).toBeVisible();
    await expect(this.reviewEmailInput).toHaveAttribute('placeholder', 'Email Address');
    await expect(this.reviewEmailInput).toHaveAttribute('type', 'email');
    await expect(this.reviewEmailInput).toHaveAttribute('required', '');
    await expect(this.reviewInput).toBeVisible();
    await expect(this.reviewInput).toHaveAttribute('placeholder', 'Add Review Here!');
    await expect(this.reviewInput).toHaveAttribute('required', '');
    await expect(this.reviewSubmitButton).toBeVisible();
    await expect(this.reviewSubmitButton).toHaveText('Submit');
  }

  /**
   * Assert that the review submission succeeded.
   *
   * @returns {Promise<void>}
   */
  async assertReviewSubmitted() {
    await expect(this.reviewSuccessMessage).toBeVisible();
    await expect(this.reviewSuccessMessage).toHaveText('Thank you for your review.');
  }
}
