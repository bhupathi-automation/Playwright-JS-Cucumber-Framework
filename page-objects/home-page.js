import { logger } from '../utils/logger.js';

/**
 * @typedef {import('playwright').Page} Page
 */

/**
 * Page object for the AutomationExercise home page.
 */
export class HomePage {
  /**
   * @param {Page} page
   */
  constructor(page) {
    this.page = page;
    this.loginLink = page.getByRole('link', { name: 'Signup / Login' });
    this.productsLink = page.getByRole('link', { name: 'Products' });
    this.cartLink = page.getByRole('link', { name: 'Cart' });
  }

  /**
   * Open the home page.
   *
   * @returns {Promise<void>}
   */
  async open() {
    logger.debug('Navigating to the home page');
    await this.page.goto('/');
  }

  /**
   * Open the login page from the main navigation.
   *
   * @returns {Promise<void>}
   */
  async openLoginPage() {
    logger.debug('Opening the login page from the home page');
    await this.loginLink.click();
  }

  /**
   * Open the products page from the main navigation.
   *
   * @returns {Promise<void>}
   */
  async openProductsPage() {
    logger.debug('Opening the products page from the home page');
    await this.productsLink.click();
  }

  /**
   * Open the cart page from the main navigation.
   *
   * @returns {Promise<void>}
   */
  async openCartPage() {
    logger.debug('Opening the cart from the home page');
    await this.cartLink.click();
  }
}
