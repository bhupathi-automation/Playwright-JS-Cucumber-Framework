import { logger } from '../utils/logger.js';

/**
 * @typedef {import('playwright').Page} Page
 */

/**
 * Page object for the shopping cart.
 */
export class CartPage {
  /**
   * @param {Page} page
   */
  constructor(page) {
    this.page = page;
    this.checkoutButton = page.getByText('Proceed To Checkout', { exact: true });
    this.cartRows = page.locator('#cart_info_table tbody tr');
  }

  /**
   * Continue from the cart to checkout.
   *
   * @returns {Promise<void>}
   */
  async proceedToCheckout() {
    logger.debug('Proceeding from the cart to checkout');
    await this.checkoutButton.click();
  }

  /**
   * Return the cart row for a named product.
   *
   * @param {string} productName
   * @returns {import('playwright').Locator}
   */
  productRow(productName) {
    return this.cartRows.filter({
      has: this.page.getByRole('link', { name: productName, exact: true }),
    });
  }
}
