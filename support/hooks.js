import { After, AfterAll, Before, BeforeAll, setDefaultTimeout, Status } from '@cucumber/cucumber';
import { randomUUID } from 'node:crypto';
import { request } from 'playwright';
import { mkdir, readFile, rmdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import config from '../config/config.js';
import { CartPage } from '../page-objects/cart-page.js';
import { HomePage } from '../page-objects/home-page.js';
import { LoginPage } from '../page-objects/login-page.js';
import { ProductDetailsPage } from '../page-objects/product-details-page.js';
import { ProductsPage } from '../page-objects/products-page.js';
import { RegistrationPage } from '../page-objects/registration-page.js';
import { ApiClient } from '../support/api-client.js';
import apiEndpoints from '../config/api-endpoints.json' with { type: 'json' };
import { logger } from '../utils/logger.js';

// Give Cucumber enough time for a real browser navigation on a slower network.
// This complements Playwright's navigation timeout configured below.
setDefaultTimeout(config.timeout.navigation);

/** @type {Map<string, number>} */
const scenarioAttempts = new Map();

BeforeAll(function () {
  logger.info('Cucumber test execution started', {
    browser: config.browser.name,
    logLevel: logger.level,
    fileLogging: logger.fileLoggingEnabled,
    logFile: logger.logFilePath,
  });
});

AfterAll(async function () {
  logger.info('Cucumber test execution completed');
  await logger.flush();
});

/**
 * @param {string} value
 * @returns {string}
 */
function safeFileName(value) {
  return value
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

/**
 * @param {object} world
 * @param {string} name
 * @returns {string}
 */
function evidencePath(world, name) {
  const scenarioName = safeFileName(world.pickle?.name ?? 'scenario');
  return path.resolve(
    'reports',
    'evidence',
    `${scenarioName}-${world.__scenarioId}-${randomUUID()}-${name}`,
  );
}

Before(async function ({ pickle }) {
  this.__scenarioId = safeFileName(pickle.id);
  this.__scenarioName = pickle.name;

  const isApiScenario = pickle.tags.some((tag) => tag.name === '@api');
  const isIntegrationScenario = pickle.tags.some((tag) => tag.name === '@integration');
  const attempt = (scenarioAttempts.get(pickle.id) ?? 0) + 1;
  scenarioAttempts.set(pickle.id, attempt);
  this.__attemptNumber = attempt;

  const tags = pickle.tags.map((tag) => tag.name);
  logger.startScenario(pickle.name, tags, attempt);
  logger.info('Scenario setup selected', {
    type: isIntegrationScenario ? 'integration' : isApiScenario ? 'api' : 'ui',
    browser: this.config.browser.name,
  });

  try {
    // Integration scenarios need both clients; API-only scenarios do not need a browser.
    if (isApiScenario || isIntegrationScenario) {
      const apiBaseUrl = new URL(this.config.application.apiBaseUrl);
      apiBaseUrl.pathname = `${apiBaseUrl.pathname.replace(/\/+$/, '')}/`;

      this.requestContext = await request.newContext({
        baseURL: apiBaseUrl.toString(),
        timeout: this.config.timeout.default,
      });
      this.apiClient = new ApiClient(this.requestContext);
      logger.info('API request context initialized');
    }

    if (isApiScenario && !isIntegrationScenario) {
      logger.info('Before hook completed');
      return;
    }

    // Read the browser settings from the World so each scenario uses the shared framework config.
    const browserType = this.config.browser.name;
    const browserLauncher = await import('playwright');
    const launchOptions = {
      headless: this.config.browser.headless,
      ...(this.config.browser.channel ? { channel: this.config.browser.channel } : {}),
    };

    // Create a new browser, context, and page for this scenario.
    // A separate context prevents cookies, storage, and sessions leaking between scenarios.
    this.browser = await browserLauncher[browserType].launch(launchOptions);
    logger.info('Browser launched', { browser: browserType });
    await this.attach(`Browser: ${browserType}`, 'text/plain');
    const contextOptions = { baseURL: this.config.application.baseUrl };
    if (this.config.video.mode !== 'off') {
      this.__videoDirectory = evidencePath(this, 'video-temp');
      await mkdir(this.__videoDirectory, { recursive: true });
      contextOptions.recordVideo = { dir: this.__videoDirectory };
    }
    this.context = await this.browser.newContext(contextOptions);
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.config.timeout.action);
    this.page.setDefaultNavigationTimeout(this.config.timeout.navigation);

    // Page objects all use the same page, but they are still created per scenario.
    // This keeps step definitions simple: steps can use this.homePage, this.cartPage, etc.
    this.loginPage = new LoginPage(this.page);
    this.homePage = new HomePage(this.page);
    this.productsPage = new ProductsPage(this.page);
    this.productDetailsPage = new ProductDetailsPage(this.page);
    this.cartPage = new CartPage(this.page);
    this.registrationPage = new RegistrationPage(this.page);
    logger.debug('Scenario Page Objects initialized');

    // Tracing starts before the scenario steps run, so Playwright can record their actions.
    if (this.config.trace.mode !== 'off') {
      await this.context.tracing.start({ screenshots: true, snapshots: true });
      this.__traceStarted = true;
      logger.debug('Playwright tracing started');
    }
  } catch (error) {
    logger.error('Before hook failed during scenario setup', {
      attempt,
      errorType: error instanceof Error ? error.name : 'UnknownError',
    });
    throw error;
  }
});

After(async function ({ result, willBeRetried = false }) {
  // Cucumber provides the result so the hook can collect evidence only when needed.
  const failed = result?.status === Status.FAILED;
  const status = result?.status ?? 'UNKNOWN';
  const captureScreenshot =
    (failed && this.config.screenshot.onFailure) || this.config.screenshot.mode === 'on';
  const captureTrace = this.config.trace.mode === 'on' || (failed && this.config.trace.onFailure);
  const cleanupErrors = [];
  let video;
  let contextClosed;

  // logger.info('After hook started', { attempt: this.__attemptNumber });
  if (failed) {
    logger.error('Scenario failed', { attempt: this.__attemptNumber });
    if (willBeRetried) {
      logger.warn('Scenario will be retried', { nextAttempt: (this.__attemptNumber ?? 0) + 1 });
    }
  }

  // Keep cleanup and each evidence operation independent so one failure cannot hide another.
  if (this.apiUserCreated && this.apiUser && this.apiClient) {
    try {
      logger.info('Cleaning up scenario-created API account');
      const cleanupResponse = await this.apiClient.delete(apiEndpoints.deleteAccount, {
        form: {
          email: this.apiUser.email,
          password: this.apiUser.password,
        },
      });
      await this.apiClient.assertResponseCode(cleanupResponse, 200);
    } catch (error) {
      cleanupErrors.push(
        new Error('Failed to clean up the scenario-created API account.', { cause: error }),
      );
      logger.error('Scenario-created API account cleanup failed', {
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }

  if (captureScreenshot && this.page) {
    try {
      const screenshot = await this.page.screenshot();
      const screenshotPath = evidencePath(this, 'screenshot.png');
      await mkdir(path.dirname(screenshotPath), { recursive: true });
      await writeFile(screenshotPath, screenshot);
      await this.attach(screenshot, 'image/png');
      logger.info('Scenario screenshot saved and attached');
    } catch (error) {
      cleanupErrors.push(
        new Error('Failed to save or attach the scenario screenshot.', { cause: error }),
      );
      logger.error('Scenario screenshot capture failed', {
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }

  if (this.__traceStarted && this.context) {
    try {
      if (captureTrace) {
        const tracePath = evidencePath(this, 'trace.zip');
        await mkdir(path.dirname(tracePath), { recursive: true });
        await this.context.tracing.stop({ path: tracePath });
        await this.attach(await readFile(tracePath), 'application/zip');
        logger.info('Playwright trace saved and attached');
      } else {
        await this.context.tracing.stop();
        logger.debug('Playwright trace discarded');
      }
    } catch (error) {
      cleanupErrors.push(
        new Error('Failed to stop or save the Playwright trace.', { cause: error }),
      );
      logger.error('Playwright trace handling failed', {
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
    } finally {
      this.__traceStarted = false;
    }
  }

  if (this.config.video.mode !== 'off') {
    try {
      video = this.page?.video();
    } catch (error) {
      cleanupErrors.push(
        new Error('Failed to access the scenario video recording.', { cause: error }),
      );
      logger.error('Scenario video access failed', {
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }

  const closeResource = async (name, close) => {
    try {
      await close();
      return true;
    } catch (error) {
      cleanupErrors.push(new Error(`Failed to close the scenario ${name}.`, { cause: error }));
      logger.error('Failed to close scenario resource', {
        resource: name,
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      return false;
    }
  };

  await closeResource('API request context', () => this.requestContext?.dispose());
  contextClosed = await closeResource('browser context', () => this.context?.close());

  if (video && contextClosed) {
    const retainVideo = this.config.video.mode === 'on' || (failed && this.config.video.onFailure);
    try {
      const videoPath = await video.path();
      if (retainVideo) {
        const savedVideoPath = evidencePath(this, 'video.webm');
        await mkdir(path.dirname(savedVideoPath), { recursive: true });
        await video.saveAs(savedVideoPath);
        await this.attach(await readFile(savedVideoPath), 'video/webm');
        logger.info('Scenario video saved and attached');
        if (videoPath !== savedVideoPath) {
          await unlink(videoPath);
        }
      } else {
        await unlink(videoPath);
      }
    } catch (error) {
      cleanupErrors.push(
        new Error('Failed to save or discard the scenario video.', { cause: error }),
      );
      logger.error('Scenario video handling failed', {
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }

  if (this.__videoDirectory) {
    try {
      await rmdir(this.__videoDirectory);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        cleanupErrors.push(
          new Error('Failed to remove the temporary video directory.', { cause: error }),
        );
        logger.error('Temporary video directory cleanup failed', {
          errorType: error instanceof Error ? error.name : 'UnknownError',
        });
      }
    }
  }

  await closeResource('browser', () => this.browser?.close());

  if (this.__retryDemoMarkerPath && !willBeRetried) {
    try {
      await unlink(this.__retryDemoMarkerPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        cleanupErrors.push(new Error('Failed to remove the retry demo marker.', { cause: error }));
        logger.error('Failed to remove retry demonstration marker', {
          errorType: error instanceof Error ? error.name : 'UnknownError',
        });
      }
    }
  }

  logger.info('Scenario completed', { status, attempt: this.__attemptNumber, willBeRetried });
  if (failed) {
    try {
      await this.attach(logger.getScenarioLogs(), 'text/plain');
    } catch (error) {
      cleanupErrors.push(new Error('Failed to attach the scenario log excerpt.', { cause: error }));
      logger.error('Failed to attach scenario log excerpt', {
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }

  // Clear references so this World cannot accidentally retain scenario state.
  this.__retryDemoMarkerPath = undefined;
  this.__videoDirectory = undefined;
  this.__traceStarted = false;
  this.requestContext = undefined;
  this.apiClient = undefined;
  this.apiResponse = undefined;
  this.apiUser = undefined;
  this.apiUserCreated = false;
  this.apiAction = undefined;
  this.searchTerm = undefined;
  this.integrationProductName = undefined;
  this.uiProductName = undefined;
  this.cartPage = undefined;
  this.productDetailsPage = undefined;
  this.productsPage = undefined;
  this.homePage = undefined;
  this.loginPage = undefined;
  this.registrationPage = undefined;
  this.page = undefined;
  this.context = undefined;
  this.browser = undefined;
  this.__attemptNumber = undefined;
  logger.endScenario();

  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, 'Scenario teardown or evidence collection failed.');
  }
});
