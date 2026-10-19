import { logger } from '../utils/logger.js';

/**
 * @typedef {import('playwright').Page} Page
 */

/**
 * Page object for the account registration form.
 */
export class RegistrationPage {
  /**
   * @param {Page} page
   */
  constructor(page) {
    this.page = page;
    this.passwordInput = page.locator('[data-qa="password"]');
    this.createAccountButton = page.locator('[data-qa="create-account"]');
  }

  /**
   * Set the account password.
   *
   * @param {string} password
   * @returns {Promise<void>}
   */
  async setPassword(password) {
    logger.debug('Entering the account password');
    await this.passwordInput.fill(password);
  }

  /**
   * Submit the registration form.
   *
   * @returns {Promise<void>}
   */
  async createAccount() {
    logger.debug('Submitting the account registration form');
    await this.createAccountButton.click();
  }
}
