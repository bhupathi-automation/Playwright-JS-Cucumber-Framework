import config from './config/config.js';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const htmlReport = process.env.CUCUMBER_HTML_REPORT || 'reports/cucumber/cucumber-report.html';
mkdirSync(path.dirname(path.resolve(htmlReport)), { recursive: true });
mkdirSync('allure-results', { recursive: true });

export default {
  paths:
    process.env.CUCUMBER_RETRY_DEMO === 'true'
      ? ['retry-demo/retry-demo.feature']
      : ['features/**/*.feature'],
  import: [
    'support/world.js',
    'support/hooks.js',
    'support/api-client.js',
    'step-definitions/ui/common-steps.js',
    'step-definitions/ui/home-steps.js',
    'step-definitions/ui/login-steps.js',
    'step-definitions/ui/products-steps.js',
    'step-definitions/ui/product-details-steps.js',
    'step-definitions/ui/cart-steps.js',
    'step-definitions/api/api-steps.js',
    'step-definitions/integration/integration-steps.js',
    'step-definitions/retry-demo-steps.js',
  ],
  format: ['progress', `html:${htmlReport}`, 'allure-cucumberjs/reporter'],
  formatOptions: {
    resultsDir: 'allure-results',
  },
  publishQuiet: true,
  retry: config.cucumber.retries,
  parallel: 1,
  worldParameters: {
    config,
  },
};
