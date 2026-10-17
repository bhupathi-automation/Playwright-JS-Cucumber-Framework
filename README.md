# Playwright JavaScript Cucumber Framework

Beginner-friendly browser and API automation for the AutomationExercise application using
Playwright and Cucumber.js.

## Technology

- JavaScript and Node.js
- Playwright library APIs
- Cucumber.js as the only test runner
- JSDoc for editor type information and API documentation
- ESLint and Prettier
- Cucumber HTML and Allure reporting
- GitHub Actions quality checks

## Setup

Requirements:

- Node.js 20 or newer
- npm 10 or newer

Install dependencies and browsers:

```bash
npm install
npx playwright install chromium firefox webkit
```

On Linux CI or a fresh Linux machine, install the required operating-system packages too:

```bash
npx playwright install --with-deps chromium firefox webkit
```

Copy `.env.example` to `.env` when local configuration overrides are needed. Do not commit
`.env` or credentials. The framework uses one QA environment configuration.

## GitHub Actions CI

The workflow at
[.github/workflows/playwright-cucumber.yml](.github/workflows/playwright-cucumber.yml) runs one
Chromium job against the QA environment for pushes and pull requests, and runs the full suite each
night at 02:00 UTC. It installs locked npm dependencies and Chromium, runs ESLint and Prettier,
then runs Cucumber with HTML and Allure reporting. Screenshots, failure-retained traces and videos,
reports, Allure results, and worker logs are uploaded as a seven-day workflow artifact, including
when tests fail. The standalone Allure ZIP is included in that artifact.

To run it manually, open **Actions → Playwright Cucumber QA → Run workflow**. Select `all`, `ui`,
`api`, or `integration`; headed execution is also available by turning off the `headless` input.
Headed runs install Xvfb and launch the browser in a virtual display. Push, pull request, and
nightly runs use headless Chromium and the full test suite.

Add these repository Actions secrets under **Settings → Secrets and variables → Actions → New
repository secret** for scenarios that exercise the configured QA account:

| Secret           | Used for                        |
| ---------------- | ------------------------------- |
| `VALID_EMAIL`    | Login email                     |
| `VALID_USERNAME` | Expected signed-in display name |
| `VALID_PASSWORD` | Login password                  |

Use credentials for a dedicated QA test account, never put their values in workflow YAML, feature
files, or committed `.env` files. The workflow passes secrets only as environment variables to the
test job; logs do not print their values. Pull-request runs deliberately receive no QA credentials,
including same-repository PRs, so unreviewed changes cannot access the secrets. If any secret is
unavailable, scenarios tagged `@requiresCredentials` are skipped with a warning and the rest of the
selected suite still runs. This also allows pull requests from forks to run safely. Push, nightly,
and manually dispatched runs can use configured secrets. Add and rotate secrets in GitHub rather
than changing test code. No deployment or environment-specific workflow is used.

The nightly trigger is the `schedule` entry in the same workflow. Disable or remove that trigger if
nightly QA traffic is not wanted; scheduled workflows run from the repository's default branch.

## Configuration

The centralized QA configuration is [config/config.js](config/config.js). It is loaded and
validated at startup, then exported as a read-only object. Defaults work locally and GitHub
Actions is detected through `GITHUB_ACTIONS=true`.

Supported environment variable overrides:

| Variable                        | Purpose                                                  | Default                                   |
| ------------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| `BASE_URL`                      | UI base URL                                              | `https://automationexercise.com`          |
| `API_BASE_URL`                  | API base URL                                             | `https://automationexercise.com/api`      |
| `BROWSER`                       | Playwright browser name                                  | `chromium`                                |
| `BROWSER_CHANNEL`               | Optional installed browser channel                       | empty                                     |
| `HEADLESS`                      | Headless browser execution                               | `true`                                    |
| `PLAYWRIGHT_TIMEOUT`            | Default timeout in milliseconds                          | `30000`                                   |
| `PLAYWRIGHT_ACTION_TIMEOUT`     | Action timeout in milliseconds                           | `30000`                                   |
| `PLAYWRIGHT_NAVIGATION_TIMEOUT` | Navigation timeout in milliseconds                       | `30000`                                   |
| `CUCUMBER_RETRY`                | Scenario retry count                                     | `0` locally, `1` in GitHub Actions        |
| `SCREENSHOT_MODE`               | `on` captures passing scenarios; failures always capture | `retain-on-failure`                       |
| `TRACE_MODE`                    | `off`, `on`, or `retain-on-failure`                      | `off` locally, `retain-on-failure` in CI  |
| `VIDEO_MODE`                    | `off`, `on`, or `retain-on-failure`                      | `off`                                     |
| `LOG_LEVEL`                     | Minimum log level: `DEBUG`, `INFO`, `WARN`, or `ERROR`   | `INFO`                                    |
| `LOG_TO_FILE`                   | Also append logs to a worker-specific file               | `false` locally; `true` in GitHub Actions |

Validate the configuration with:

```bash
npm run config:validate
```

### Logging

The logger in [utils/logger.js](utils/logger.js) uses Winston's console and file transports
without adding another logging abstraction. Node.js built-ins provide path and lifecycle support.
Every entry includes an ISO timestamp, severity, process ID, Cucumber worker ID, and (during a
scenario) its name. `INFO` is the default minimum level. Page navigation and important UI actions are logged at `DEBUG`, so they appear only when `LOG_LEVEL=DEBUG`. Scenario lifecycle, selected browser, and API status/duration are logged at `INFO`. Credentials, request headers, and request/response bodies are not logged.

On PowerShell, enable debug output and a log file for a run with:

```powershell
$env:LOG_LEVEL = 'DEBUG'
$env:LOG_TO_FILE = 'true'
npm run test:ui
```

For a one-command cross-platform run, use the existing `cross-env` dependency:

```bash
npx cross-env LOG_LEVEL=DEBUG LOG_TO_FILE=true npm run test:ui
```

### Reports and failure artifacts

Every standard Cucumber run writes a Cucumber HTML report to
[`reports/cucumber/cucumber-report.html`](reports/cucumber/cucumber-report.html) and Allure result
files to [`allure-results/`](allure-results/). The configuration creates these directories when
needed. The npm test commands clear prior Allure result files before each run, so the generated
report describes that run. Browser-specific scripts and the retry demo write their own Cucumber
HTML file while continuing to produce Allure results.

Generate and open the interactive Allure report after a run:

```bash
npm run allure:generate
npm run allure:open
```

The Cucumber report can be opened directly in a browser (for example,
`start reports\cucumber\cucumber-report.html` in PowerShell). The Allure report is served locally
by `allure:open`; do not open its generated `index.html` as a `file:` URL.

To export a standalone Allure report for sharing, run:

```bash
npm run allure:share
```

This creates [`reports/allure-report-share.zip`](reports/allure-report-share.zip). Share the ZIP
with teammates; they can extract it and open `report.html` in a modern browser without installing
Node.js, Allure, or this framework. The archive includes a `README.txt` with the same instructions.
Re-run the command after tests to export the latest Allure results. The generated report is a
snapshot and does not update when later tests run.

The existing `After` hook always captures a screenshot when a scenario fails, saves it under
`reports/evidence/`, and attaches it to the Cucumber and Allure results. `TRACE_MODE=retain-on-failure`
records Playwright actions and DOM snapshots, saving a `.zip` trace only for failures;
`TRACE_MODE=on` saves one for every UI scenario. Tracing defaults to off locally and is retained
on failures in GitHub Actions; retained traces are also attached to both reports. Videos are opt-in
to avoid unnecessary disk and upload use:
`VIDEO_MODE=retain-on-failure` keeps only failing scenario videos, while `VIDEO_MODE=on` keeps all
videos. Screenshots and videos are attached to the reports as well as saved under `reports/evidence/`.

To investigate a failure:

1. Start with the failed step and its error in the Cucumber or Allure report; compare expected and
   actual behavior.
2. Open the attached screenshot to see the page at teardown. Read the attached scenario log for
   setup, browser, navigation, and cleanup messages.
3. If a trace was retained, open it with `npx playwright show-trace <path-to-trace.zip>`. Use its
   timeline to find the first action that diverged, then inspect the DOM snapshot and network
   activity around it.
4. Re-run only the failing scenario or tag with `LOG_LEVEL=DEBUG`. Check whether the failure is
   repeatable before changing selectors or timeouts; retries do not fix a deterministic defect.

Treat reports, screenshots, traces, videos, and logs as potentially sensitive: browser captures can
contain account data and traces can include page/network content. Use test accounts, do not put
secrets in feature text or scenario names, never log credentials or request bodies, keep generated
artifacts out of source control, and share/upload artifacts only to trusted locations. GitHub
Actions artifacts expire after seven days.

The logs are always written to the console. When `LOG_TO_FILE=true`, they are also appended to
`artifacts/logs/cucumber-<worker>-pid<PID>.log`. The Cucumber worker ID and process ID prevent
parallel workers from writing to the same file. Generated log files are ignored by Git. In CI,
the workflow enables `DEBUG` file logging and uploads `artifacts/logs/` alongside reports and
evidence, including when a test run fails.

For failed scenarios, the `After` hook attaches the bounded log excerpt for that scenario as
`text/plain` to the Cucumber result. Winston's file transport is flushed when the Cucumber worker
finishes. Open the scenario in the Cucumber HTML report to read its attachment; download the
`cucumber-reports-<browser>` artifact from the GitHub Actions run for worker log files. Allure
output can include the Cucumber attachment when its reporter is enabled.

Good logging describes an action or result without disclosing its data:

```js
logger.debug('Submitting login form');
logger.info('API response received', { method: 'POST', endpoint: 'verifyLogin', status: 200 });
```

Avoid logging secrets or whole request/response objects:

```js
logger.info('Logging in with password', { password }); // Never log credentials
logger.debug('API request', { headers, body }); // May expose tokens and personal information
```

### Cucumber scenario retries

The installed Cucumber.js version is 13.2.1 and supports the `retry` configuration option. This
framework sets it from `CUCUMBER_RETRY`; Cucumber reruns a failed scenario as a whole rather than
retrying individual Playwright actions. `npm run test:no-retry` explicitly disables retries, and
`npm run test:retry` enables two retries:

```bash
npm run test:no-retry
npm run test:retry
```

Two retries means **up to three total executions**: one initial attempt plus two retry attempts.
Set `CUCUMBER_RETRY` to another non-negative integer to configure a different count. The default
is zero locally and one in GitHub Actions, preserving the existing CI behavior.

Every retry gets a fresh Custom World from Cucumber. The `Before` hook recreates its browser,
context, page, Page Objects, and API request resources as applicable. The `After` hook captures a
failure screenshot, saves a uniquely named trace when configured, disposes all resources, and
preserves the original attempt's Cucumber failure details. Cucumber's report records retry attempts
and the final scenario result; the framework does not run the formatter once per attempt.

Run the opt-in retry demonstration:

```bash
npm run test:retry:demo
```

The scenarios in [retry-demo/retry-demo.feature](retry-demo/retry-demo.feature) deliberately fail
once and pass on retry for UI, API, and integration resource types. The demo uses a uniquely named
temporary marker, which the `After` hook removes after the final attempt. It is kept outside the
normal `features/` search path so standard suites never intentionally fail. The demonstration run
writes one HTML report to `reports/cucumber/retry-demo-report.html`.

Retries are useful for diagnosing or temporarily tolerating intermittent infrastructure failures
such as a transient network interruption. They are not a fix for application defects, unstable
locators, missing waits, shared state, or a test that consistently fails. Review intermediate
attempt failures and their attachments; track and stabilize flaky scenarios instead of treating a
passing retry as proof the first failure can be ignored.

Select a browser with the cross-platform npm scripts:

```bash
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

For example, run the same feature in all three browsers:

```bash
npm run test:chromium -- --tags "@crossBrowser"
npm run test:firefox -- --tags "@crossBrowser"
npm run test:webkit -- --tags "@crossBrowser"
```

These scripts set `BROWSER` to `chromium`, `firefox`, or `webkit`; direct commands can also set
`BROWSER` in the shell environment. Browser selection is read independently by each Cucumber
process, so it works with normal and parallel Cucumber runs without shared mutable browser state.
In GitHub Actions, the single QA workflow runs Chromium on pushes, pull requests, and a nightly
schedule. Use `workflow_dispatch` to select all scenarios or a UI, API, or integration tag, and to
choose headless or headed browser execution. Headed mode installs and uses Xvfb on the Linux runner.

The local browser scripts write separate HTML reports to `reports/cucumber/<browser>-report.html`.
The Before hook also attaches the selected browser name to every UI scenario result, making it
visible as scenario metadata in the Cucumber HTML and Allure reports. GitHub Actions currently
tests Chromium and uploads one artifact for each workflow run.

Cross-browser failures can come from differences in font rendering, layout metrics, native form
controls, and browser-specific timing or support. Prefer accessible locators and Playwright's
auto-waiting over pixel assumptions or fixed sleeps. If a failure appears in only one browser,
rerun that browser and feature on its own, inspect the attached browser name and failure evidence,
and check browser-specific console or trace details before changing a shared Page Object.

The scenario-scoped Custom World is implemented in [support/world.js](support/world.js). The
Before hook in [support/hooks.js](support/hooks.js) launches a browser, creates a new context and
page, then creates the core page objects with that page. Each scenario therefore gets fresh state;
there are no global pages, fixtures, services, or dependency injection frameworks.

Steps access framework objects through `this`, which is the current Cucumber World:

```js
When('User opens the home page', async function () {
  await this.homePage.open();
});
```

The API client is created only for scenarios tagged `@api`. The hooks close the request context,
browser context, and browser in `After`. Failure screenshots are saved and attached to the Cucumber
result; configured traces are saved under `reports/evidence` and attached to the reports. Creating
all core page objects in `Before` is a deliberate beginner-friendly trade-off: construction is
cheap, references remain easy to discover, and every object still shares only the scenario's page.

### Parallel scenario execution

Playwright Test workers belong to Playwright Test's test runner and are not used by this project.
Cucumber.js is the runner here, so parallel work is configured with Cucumber's `--parallel`
option. `cucumber.js` defaults to one worker; `test:parallel` starts three Cucumber workers, and
`test:parallel:demo` runs the `@parallel` examples with two workers:

```bash
npm run test:cucumber
npm run test:parallel
npm run test:parallel:demo
```

To choose a different worker count, run Cucumber directly with its supported option:

```bash
npx cucumber-js --parallel 5
npx cucumber-js --parallel 2 --tags "@ui"
```

Alternatively, change the worker count in the `test:parallel` script in `package.json`. Start with
two or three workers and reduce the count if the shared QA application, network, or local machine
becomes unreliable or rate-limited. More workers are not always faster.

Each scenario gets a new Custom World. Its `Before` hook creates the API request context when
needed and creates a browser, context, page, and Page Objects for UI scenarios. Its `After` hook
handles account cleanup and evidence collection, then attempts to close every scenario resource
even if one close operation fails. There are no shared browser objects or `BeforeAll`/`AfterAll`
browser lifecycle hooks. Scenarios must not rely on order or reuse mutable World values.

Screenshots are attached to their Cucumber scenario result instead of written to a shared filename.
Trace paths include the scenario's Cucumber pickle ID, keeping simultaneous traces distinct. The
Cucumber formatter collects scenario results for one run; avoid launching multiple report-producing
runs at the same time into the same output directory. The `@parallel` tag is applied to two
independent home-page scenarios and a read-only products API scenario. They can run concurrently
because they do not depend on each other's state or modify shared application data.

### API usage

API scenarios use the scenario-scoped `this.apiClient`, a thin wrapper around Playwright's
`APIRequestContext`. Configure the API root with `API_BASE_URL` (default:
`https://automationexercise.com/api`). The Before hook adds a trailing slash so API-relative paths
resolve beneath `/api`; pass paths such as `productsList` without a leading slash. The client
supports `get`, `post`, `put`, `patch`, and `delete`, and each method accepts Playwright request
options such as `headers`, `data`, or `form`. Responses remain Playwright `APIResponse` objects, so
steps can validate status and read JSON or text. Transport errors omit URLs, headers, and bodies to
avoid exposing credentials.

Run the API smoke test with:

```bash
npm run test:api
```

The example scenario calls AutomationExercise's documented `GET /api/productsList` endpoint and
checks both the HTTP status and the API response body. See [features/api.feature](features/api.feature)
and [step-definitions/api/api-steps.js](step-definitions/api/api-steps.js).

### Test data and reusable utilities

Keep stable, non-sensitive values in the JSON files under [test-data/](test-data/). Treat imported
JSON objects as read-only; steps should not mutate shared module data. For values that must be
unique at runtime, use a factory that returns a fresh object. [test-data/test-data.js](test-data/test-data.js)
creates an API account from the profile in `api-test-data.json` with a unique email and password.
The step stores that generated account on `this.apiUser`, so it belongs only to the current
scenario. The existing [features/account-integration.feature](features/account-integration.feature)
scenario demonstrates creating, using, and deleting the account.

[support/common-utils.js](support/common-utils.js) provides
`getConfiguredCredentials()` for the shared `VALID_USERNAME` and `VALID_PASSWORD` environment
lookup used by UI and API login steps. It trims the username, preserves the password, and reports
missing configuration without exposing credential values. Use this helper for configured login
credentials; keep unrelated validation close to the step that needs it. Use the shared logger for
bounded diagnostic messages and never include credential values in log fields or messages.

## Commands

| Command                      | Purpose                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `npm test`                   | Run all Cucumber scenarios                               |
| `npm run test:cucumber`      | Run all Cucumber scenarios                               |
| `npm run test:no-retry`      | Run scenarios without retrying failures                  |
| `npm run test:retry`         | Run scenarios with two retries per failed scenario       |
| `npm run test:retry:demo`    | Demonstrate UI, API, and integration scenario retries    |
| `npm run test:parallel`      | Run all scenarios with three Cucumber workers            |
| `npm run test:parallel:demo` | Run `@parallel` examples with two Cucumber workers       |
| `npm run test:ui`            | Run scenarios tagged `@ui`                               |
| `npm run test:api`           | Run scenarios tagged `@api`                              |
| `npm run test:integration`   | Run scenarios tagged `@integration`                      |
| `npm run test:headed`        | Pass headed execution parameters to the Cucumber World   |
| `npm run test:debug`         | Start Cucumber with the Node inspector paused at startup |
| `npm run report:cucumber`    | Run scenarios and write Cucumber HTML and Allure results |
| `npm run report:allure`      | Run scenarios with both configured reporters             |
| `npm run allure:generate`    | Build an Allure HTML report from result files            |
| `npm run allure:open`        | Open the generated Allure report                         |
| `npm run lint`               | Check JavaScript with ESLint                             |
| `npm run lint:fix`           | Apply safe ESLint fixes                                  |
| `npm run format`             | Format project files with Prettier                       |
| `npm run format:check`       | Check formatting without changing files                  |

## Project conventions

Feature files will contain business-readable Gherkin. Step definitions will access scenario
objects through the Custom Cucumber World. The Before hook will create the browser context,
page objects, and API client needed by each scenario; the After hook will capture configured
failure evidence and close the context.

Page objects own UI locators and page behavior. The API client owns reusable HTTP request
methods. Assertions remain in step definitions. There are intentionally no fixtures, services,
schemas, or Playwright Test as a runner.

UI step definitions are grouped under `step-definitions/ui`, with one feature-specific file for
home, login, products, and cart. Shared UI navigation steps live in `common-steps.js` to avoid
duplicate step logic. API step definitions belong under `step-definitions/api`. Step assertions use
Playwright's `expect` APIs, while Cucumber.js remains the test runner.

### Page Object Model standards

The initial UI page objects are:

- `HomePage`
- `LoginPage`
- `ProductsPage`
- `ProductDetailsPage`
- `CartPage`
- `RegistrationPage`

Each page object receives the scenario's Playwright `Page` in its constructor. Selectors stay
inside the owning page object, and methods describe user actions such as `openProductsPage()` or
`search(productName)`. Page objects use Playwright's auto-waiting through locators and actions;
steps must not add hardcoded waits such as `waitForTimeout()`.

Prefer accessible locators such as `getByRole`, `getByLabel`, and `getByPlaceholder`. Use stable
application attributes such as AutomationExercise's `data-qa` only when an accessible locator is
not available. Keep assertions in step definitions so page objects remain focused on locating and
interacting with the UI. API calls belong in `ApiClient`, not in page objects.

### JSDoc conventions

Use JSDoc for exported classes and functions, constructor properties, parameters, and return
values. Document non-obvious object shapes with `@typedef`. Keep descriptions concise and use
specific types, for example:

```js
/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<void>}
 */
async function login(email, password) {}
```

## Sample scenario

Run the minimal Cucumber scenario with:

```bash
npm run test:cucumber -- --tags "@ui"
```

The sample feature is [features/home.feature](features/home.feature), and its steps show the
normal World access pattern. Cucumber.js remains the only test runner; Playwright Test is not used.

The UI suite is organized into [home.feature](features/home.feature), [login.feature](features/login.feature),
[products.feature](features/products.feature), and [cart.feature](features/cart.feature). Run the
complete UI suite with:

```bash
npm run test:ui
```

Run a focused area with `--tags`, for example `npm run test:cucumber -- --tags "@login"`. The
`@ui`, `@login`, `@products`, `@cart`, `@positive`, and `@negative` tags support focused execution
and reporting. Shared scenario data is kept in [test-data/ui-test-data.json](test-data/ui-test-data.json),
while UI actions remain in Page Objects and assertions remain in step definitions.

### UI execution flow

1. Cucumber loads a feature and creates a scenario-scoped Custom World.
2. The `Before` hook launches the browser, context, and page, then constructs every Page Object
   with that page and stores them on the World.
3. Step definitions call meaningful methods or locator properties through `this`, such as
   `this.productsPage.search(...)`.
4. Page Objects perform UI interactions through Playwright locators and auto-waiting.
5. The `After` hook captures failure evidence according to the configured artifact modes and closes
   all scenario resources.

Every run writes Cucumber HTML and Allure results. Failure screenshots are saved and attached;
traces and optional videos are retained according to `TRACE_MODE` and `VIDEO_MODE`.
