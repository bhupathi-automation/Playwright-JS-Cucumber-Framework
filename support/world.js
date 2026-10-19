import { setWorldConstructor, World } from '@cucumber/cucumber';
import config from '../config/config.js';

/** @typedef {Record<string, string>} ApiUser */

/**
 * Scenario-scoped state shared by the steps in one Cucumber scenario.
 */
export class CustomWorld extends World {
  /**
   * @param {object} options
   * @param {object} [options.parameters]
   */
  constructor(options) {
    super(options);
    const parameters = options.parameters ?? {};
    this.config = parameters.config ?? config;
    /** @type {string|undefined} */
    this.__scenarioId = undefined;
    /** @type {string|undefined} */
    this.__scenarioName = undefined;
    /** @type {string|undefined} */
    this.__retryDemoMarkerPath = undefined;
    /** @type {string|undefined} */
    this.__videoDirectory = undefined;
    /** @type {boolean} */
    this.__traceStarted = false;
    /** @type {number|undefined} */
    this.__attemptNumber = undefined;
    this.browser = undefined;
    this.context = undefined;
    this.page = undefined;
    this.loginPage = undefined;
    this.homePage = undefined;
    this.productsPage = undefined;
    this.productDetailsPage = undefined;
    this.cartPage = undefined;
    this.registrationPage = undefined;
    /** @type {import('playwright').APIRequestContext|undefined} */
    this.requestContext = undefined;
    /** @type {import('playwright').APIResponse|undefined} */
    this.apiResponse = undefined;
    /** @type {import('./api-client.js').ApiClient|undefined} */
    this.apiClient = undefined;
    /** @type {ApiUser|undefined} */
    this.apiUser = undefined;
    /** @type {boolean} */
    this.apiUserCreated = false;
    /** @type {'create'|'update'|'delete'|undefined} */
    this.apiAction = undefined;
    /** @type {string|undefined} */
    this.searchTerm = undefined;
    /** @type {string|undefined} */
    this.integrationProductName = undefined;
    /** @type {string|undefined} */
    this.uiProductName = undefined;
  }
}

setWorldConstructor(CustomWorld);
