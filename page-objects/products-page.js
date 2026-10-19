import { logger } from '../utils/logger.js';

/**
 * @typedef {import('playwright').Page} Page
 */

/**
 * Page object for the products listing page.
 */
export class ProductsPage {
  /**
   * @param {Page} page
   */
  constructor(page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder('Search Product');
    this.searchButton = page.locator('#submit_search');
    this.searchedProductsHeading = page.getByRole('heading', { name: 'Searched Products' });
  }

  /**
   * Open the products listing page.
   *
   * @returns {Promise<void>}
   */
  async open() {
    logger.debug('Navigating to the products page');
    await this.page.goto('/products');
  }

  /**
   * Search for products by name.
   *
   * @param {string} productName
   * @returns {Promise<void>}
   */
  async search(productName) {
    logger.debug('Searching the product catalog');
    await this.searchInput.fill(productName);
    await this.searchButton.click();
  }

  /**
   * Open the details page for a named product.
   *
   * @param {string} productName
   * @returns {Promise<void>}
   */
  async openProductDetails(productName) {
    logger.debug('Opening a product details page');
    const productCard = this.page
      .locator('.product-image-wrapper')
      .filter({ hasText: productName })
      .first();
    const productDetailsPath = await productCard
      .getByRole('link', { name: 'View Product' })
      .getAttribute('href');
    if (!productDetailsPath) {
      throw new Error(`Could not find a product details link for: ${productName}`);
    }
    await this.page.goto(productDetailsPath);
  }

  /**
   * Return the product heading for a named product.
   *
   * @param {string} productName
   * @returns {import('playwright').Locator}
   */
  productHeading(productName) {
    return this.page.locator('.productinfo').filter({ hasText: productName }).first();
  }

  /**
   * Read the displayed product name from a product card.
   *
   * @param {string} productName
   * @returns {Promise<string>}
   */
  async getProductName(productName) {
    const displayedName = (await this.productHeading(productName).locator('p').innerText()).trim();
    if (!displayedName) {
      throw new Error(`The product card for "${productName}" did not display a product name.`);
    }
    return displayedName;
  }

  /**
   * Add a named product to the cart.
   *
   * @param {string} productName
   * @returns {Promise<void>}
   */
  async addProductToCart(productName) {
    logger.debug('Adding a product to the cart');
    const productCard = this.page.locator('.productinfo').filter({ hasText: productName }).first();
    await productCard.getByText('Add to cart', { exact: true }).click();
  }

  /**
   * Open the cart from the add-to-cart confirmation dialog.
   *
   * @returns {Promise<void>}
   */
  async openCartFromConfirmation() {
    logger.debug('Opening the cart from the add-to-cart confirmation');
    await this.page.getByRole('link', { name: 'View Cart' }).click();
  }

  /**
   * Return all visible product cards.
   *
   * @returns {import('playwright').Locator}
   */
  productCards() {
    return this.page.locator('.productinfo');
  }
}
