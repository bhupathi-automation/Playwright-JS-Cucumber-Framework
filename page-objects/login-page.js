import { logger } from '../utils/logger.js';

/**
 * @typedef {import('playwright').Page} Page
 */

/**
 * Page object for the login and signup entry page.
 */
export class LoginPage {
  /**
   * @param {Page} page
   */
  constructor(page) {
    this.page = page;
    this.emailInput = page.locator('[data-qa="login-email"]');
    this.passwordInput = page.locator('[data-qa="login-password"]');
    this.loginButton = page.locator('[data-qa="login-button"]');
    this.signupNameInput = page.locator('[data-qa="signup-name"]');
    this.signupEmailInput = page.locator('[data-qa="signup-email"]');
    this.signupButton = page.locator('[data-qa="signup-button"]');
    this.loggedInUser = page.locator('a').filter({ hasText: 'Logged in as' });
    this.logoutLink = page.getByRole('link', { name: 'Logout' });
    this.loginErrorMessage = page.getByText('Your email or password is incorrect!', {
      exact: true,
    });
    this.loginForm = page.locator('[data-qa="login-email"]');
  }

  /**
   * Log in with an existing account.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<void>}
   */
  async login(email, password) {
    logger.info('Submitting login form');
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Log out of the current account.
   *
   * @returns {Promise<void>}
   */
  async logout() {
    logger.debug('Logging out of the current account');
    await this.logoutLink.click();
  }

  /**
   * Start registration for a new user.
   *
   * @param {string} name
   * @param {string} email
   * @returns {Promise<void>}
   */
  async startRegistration(name, email) {
    logger.debug('Starting account registration');
    await this.signupNameInput.fill(name);
    await this.signupEmailInput.fill(email);
    await this.signupButton.click();
  }
}
