import { performance } from 'node:perf_hooks';
import { logger } from '../utils/logger.js';

/** @typedef {object} ApiRequestOptions
 * @property {Record<string, string>} [headers]
 * @property {unknown} [data]
 * @property {Record<string, string|number|boolean>} [form]
 * @property {unknown} [multipart]
 * @property {Record<string, string|number|boolean|string[]>} [params]
 * @property {number} [timeout]
 * @property {boolean} [failOnStatusCode]
 * @property {boolean} [ignoreHTTPSErrors]
 */

/**
 * Thin, reusable HTTP wrapper around Playwright's APIRequestContext.
 *
 * Keep endpoint-specific test expectations in the step definitions. This class
 * only sends requests and provides small helpers for common response checks.
 */
export class ApiClient {
  /**
   * @param {import('playwright').APIRequestContext} requestContext
   */
  constructor(requestContext) {
    this.requestContext = requestContext;
  }

  /**
   * @param {string} path API-relative path, such as `productsList`.
   * @param {ApiRequestOptions} [options]
   * @returns {Promise<import('playwright').APIResponse>}
   */
  get(path, options) {
    return this.request('GET', path, options);
  }

  /**
   * @param {string} path
   * @param {ApiRequestOptions} [options]
   * @returns {Promise<import('playwright').APIResponse>}
   */
  post(path, options) {
    return this.request('POST', path, options);
  }

  /**
   * @param {string} path
   * @param {ApiRequestOptions} [options]
   * @returns {Promise<import('playwright').APIResponse>}
   */
  put(path, options) {
    return this.request('PUT', path, options);
  }

  /**
   * @param {string} path
   * @param {ApiRequestOptions} [options]
   * @returns {Promise<import('playwright').APIResponse>}
   */
  delete(path, options) {
    return this.request('DELETE', path, options);
  }

  /**
   * Send an HTTP request using Playwright's API request context.
   * Leading slashes are removed so the path stays beneath the configured API base URL.
   * Options holds additional Playwright request settings, such as headers or request data.
   *
   * Examples:
   *   request('GET', 'productsList')
   *   request('POST', 'login', { data: { email: 'user@example.com' } })
   *   request('DELETE', 'products/1', { headers: { Authorization: 'token' } })
   *
   * @param {'GET'|'POST'|'PUT'|'DELETE'} method HTTP method to use.
   * @param {string} path
   * @param {ApiRequestOptions} [options]
   * @returns {Promise<import('playwright').APIResponse>}
   */
  async request(method, path, options = {}) {
    const requestPath = path.replace(/^\/+/, '');
    const safeEndpoint = requestPath.split(/[?#]/, 1)[0];
    const startedAt = performance.now();
    const requestHeaders = {
      Accept: 'application/json',
    };
    for (const [name, value] of Object.entries(options.headers ?? {})) {
      requestHeaders[name] = value;
    }

    const requestOptions = {
      headers: requestHeaders,
      data: options.data,
      form: options.form,
      multipart: options.multipart,
      params: options.params,
      timeout: options.timeout,
      failOnStatusCode: options.failOnStatusCode,
      ignoreHTTPSErrors: options.ignoreHTTPSErrors,
    };

    let requestPromise;
    switch (method) {
      case 'GET':
        requestPromise = this.requestContext.get(requestPath, requestOptions);
        break;
      case 'POST':
        requestPromise = this.requestContext.post(requestPath, requestOptions);
        break;
      case 'PUT':
        requestPromise = this.requestContext.put(requestPath, requestOptions);
        break;
      case 'DELETE':
        requestPromise = this.requestContext.delete(requestPath, requestOptions);
        break;
      default:
        throw new Error(`Unsupported API method: ${method}`);
    }

    logger.debug('Sending API request', { method, endpoint: safeEndpoint });

    try {
      const response = await requestPromise;
      logger.info('API response received', {
        method,
        endpoint: safeEndpoint,
        status: response.status(),
        durationMs: Math.round(performance.now() - startedAt),
      });
      return response;
    } catch {
      logger.error('API request failed before receiving a response', {
        method,
        endpoint: safeEndpoint,
        durationMs: Math.round(performance.now() - startedAt),
      });
      throw new Error(
        `API ${method} request failed before receiving a response. Check API connectivity and request configuration.`,
      );
    }
  }

  /**
   * Validate the HTTP status without including potentially sensitive response bodies.
   *
   * @param {import('playwright').APIResponse} response
   * @param {number} expectedStatus
   * @returns {import('playwright').APIResponse}
   */
  assertStatus(response, expectedStatus) {
    if (response.status() !== expectedStatus) {
      throw new Error(`Expected API status ${expectedStatus}, received ${response.status()}.`);
    }
    return response;
  }

  /**
   * Parse an API response and make sure its JSON body is an object.
   * API responses from AutomationExercise include their application-level
   * result in a `responseCode` property, separate from the HTTP status.
   *
   * @param {import('playwright').APIResponse} response
   * @returns {Promise<Record<string, unknown>>}
   */
  async readJsonObject(response) {
    const body = await response.json();
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('Expected the API response body to be a JSON object.');
    }
    return body;
  }

  /**
   * Validate the application-level response code in the JSON body.
   *
   * @param {import('playwright').APIResponse} response
   * @param {number} expectedCode
   * @returns {Promise<Record<string, unknown>>} The parsed response for further checks.
   */
  async assertResponseCode(response, expectedCode) {
    const body = await this.readJsonObject(response);
    if (body.responseCode !== expectedCode) {
      throw new Error(
        `Expected API responseCode ${expectedCode}, received ${String(body.responseCode)}.`,
      );
    }
    return body;
  }

  /**
   * Validate the response message returned by the API.
   *
   * @param {import('playwright').APIResponse} response
   * @param {string} expectedMessage
   * @returns {Promise<Record<string, unknown>>} The parsed response for further checks.
   */
  async assertResponseMessage(response, expectedMessage) {
    const body = await this.readJsonObject(response);
    if (body.message !== expectedMessage) {
      throw new Error(
        `Expected API message "${expectedMessage}", received "${String(body.message)}".`,
      );
    }
    return body;
  }

  /**
   * Validate that a named response property is an array, and optionally check
   * its exact length. Returning the array lets a step perform additional
   * scenario-specific checks without parsing the response body again.
   *
   * @param {import('playwright').APIResponse} response
   * @param {string} propertyName
   * @param {number} [expectedLength]
   * @returns {Promise<unknown[]>}
   */
  async assertArrayProperty(response, propertyName, expectedLength) {
    const body = await this.readJsonObject(response);
    const value = body[propertyName];
    if (!Array.isArray(value)) {
      throw new Error(`Expected API response property "${propertyName}" to be an array.`);
    }
    if (expectedLength !== undefined && value.length !== expectedLength) {
      throw new Error(
        `Expected API response property "${propertyName}" to contain ${expectedLength} items, received ${value.length}.`,
      );
    }
    return value;
  }
}
