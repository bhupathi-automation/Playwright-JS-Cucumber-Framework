import dotenv from 'dotenv';

// Load values from the .env file into process.env.
dotenv.config();

// Default values are used when the matching environment variable is not set.
const DEFAULT_UI_BASE_URL = 'https://automationexercise.com';
const DEFAULT_API_BASE_URL = `${DEFAULT_UI_BASE_URL}/api`;
const DEFAULT_TIMEOUT = 30_000;

/**
 * @typedef {object} FrameworkConfig
 * @property {'qa'} environment
 * @property {{baseUrl: string, apiBaseUrl: string}} application
 * @property {{name: 'chromium'|'firefox'|'webkit', headless: boolean, channel?: string}} browser
 * @property {{default: number, action: number, navigation: number}} timeout
 * @property {{retries: number}} cucumber
 * @property {{onFailure: boolean, mode: 'off'|'on'|'retain-on-failure'}} screenshot
 * @property {{onFailure: boolean, mode: 'off'|'on'|'retain-on-failure'}} trace
 * @property {{onFailure: boolean, mode: 'off'|'on'|'retain-on-failure'}} video
 * @property {{isGitHubActions: boolean}} execution
 */

// GitHub Actions sets this variable when the tests run in CI.
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

/**
 * @param {string|undefined} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
function readBoolean(value, fallback) {
  // Use the fallback when the environment variable is missing.
  if (value === undefined) return fallback;
  // Accept common text and numeric representations of true and false.
  if (['true', '1', 'yes'].includes(value.toLowerCase())) return true;
  if (['false', '0', 'no'].includes(value.toLowerCase())) return false;
  // Fail early so configuration mistakes are easy to find.
  throw new Error(`Expected a boolean value but received: ${value}`);
}

/**
 * @param {string|undefined} value
 * @param {number} fallback
 * @returns {number}
 */
function readPositiveInteger(value, fallback) {
  // Use the fallback when no value was provided.
  if (value === undefined) return fallback;
  const parsedValue = Number(value);
  // Timeouts and retry counts must be whole numbers and cannot be negative.
  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new Error(`Expected a non-negative integer but received: ${value}`);
  }
  return parsedValue;
}

/**
 * @param {string|undefined} value
 * @param {string} fallback
 * @returns {string}
 */
function readString(value, fallback) {
  // Trim whitespace and use the fallback for empty or missing values.
  return value?.trim() || fallback;
}

// Read the main configurable browser and artifact settings.
const browserName = readString(process.env.BROWSER, 'chromium');
const screenshotMode = readString(process.env.SCREENSHOT_MODE, 'retain-on-failure');
const traceMode = readString(process.env.TRACE_MODE, isGitHubActions ? 'retain-on-failure' : 'off');
const videoMode = readString(process.env.VIDEO_MODE, 'off');

// Build one configuration object for the test framework to use everywhere.
/** @type {FrameworkConfig} */
const config = {
  environment: 'qa',
  application: {
    baseUrl: readString(process.env.BASE_URL, DEFAULT_UI_BASE_URL),
    apiBaseUrl: readString(process.env.API_BASE_URL, DEFAULT_API_BASE_URL),
  },
  // Browser settings control which browser Playwright starts and how it runs.
  browser: {
    name: browserName,
    headless: readBoolean(process.env.HEADLESS, true),
    ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}),
  },
  // Timeout values are expressed in milliseconds.
  timeout: {
    default: readPositiveInteger(process.env.PLAYWRIGHT_TIMEOUT, DEFAULT_TIMEOUT),
    action: readPositiveInteger(process.env.PLAYWRIGHT_ACTION_TIMEOUT, DEFAULT_TIMEOUT),
    navigation: readPositiveInteger(process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT, DEFAULT_TIMEOUT),
  },
  // Cucumber retries failed scenarios once in CI, but not locally by default.
  cucumber: {
    retries: readPositiveInteger(process.env.CUCUMBER_RETRY, isGitHubActions ? 1 : 0),
  },
  // Failure screenshots are required; "on" also captures successful scenarios.
  screenshot: {
    onFailure: true,
    mode: screenshotMode,
  },
  // Traces contain debugging information about a test run.
  trace: {
    onFailure: traceMode === 'retain-on-failure',
    mode: traceMode,
  },
  // Video recording is opt-in because it can consume significant disk space.
  video: {
    onFailure: videoMode === 'retain-on-failure',
    mode: videoMode,
  },
  execution: {
    isGitHubActions,
  },
};

/**
 * @param {FrameworkConfig} frameworkConfig
 * @returns {void}
 */
function validateConfig(frameworkConfig) {
  // Check that both application endpoints can be parsed as URLs.
  const urlProperties = [
    ['BASE_URL', frameworkConfig.application.baseUrl],
    ['API_BASE_URL', frameworkConfig.application.apiBaseUrl],
  ];

  for (const [name, value] of urlProperties) {
    try {
      new URL(value);
    } catch {
      throw new Error(`${name} must be a valid URL: ${value}`);
    }
  }

  // Playwright supports only these browser names through this configuration.
  if (!['chromium', 'firefox', 'webkit'].includes(frameworkConfig.browser.name)) {
    throw new Error('BROWSER must be one of: chromium, firefox, webkit');
  }

  // Screenshots and traces share the same set of allowed collection modes.
  const validModes = ['off', 'on', 'retain-on-failure'];
  if (!validModes.includes(frameworkConfig.screenshot.mode)) {
    throw new Error('SCREENSHOT_MODE must be one of: off, on, retain-on-failure');
  }
  if (!validModes.includes(frameworkConfig.trace.mode)) {
    throw new Error('TRACE_MODE must be one of: off, on, retain-on-failure');
  }
  if (!validModes.includes(frameworkConfig.video.mode)) {
    throw new Error('VIDEO_MODE must be one of: off, on, retain-on-failure');
  }
}

// Validate before exporting so invalid settings fail during startup.
validateConfig(config);

// Prevent accidental changes to the top-level configuration object.
export default Object.freeze(config);
