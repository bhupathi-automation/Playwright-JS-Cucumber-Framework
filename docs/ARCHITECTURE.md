# Playwright BDD Framework Architecture

## 1. Purpose and Scope

This framework automates the [AutomationExercise](https://automationexercise.com/) ecommerce application using:

- JavaScript on Node.js
- Cucumber.js as the only test runner
- Playwright for browser and API capabilities
- Page Object Model for UI workflows
- A custom Cucumber World for scenario state
- JSDoc for type information and editor support
- ESLint and Prettier for code quality
- Cucumber HTML and Allure for reporting
- GitHub Actions for continuous integration

The design intentionally supports one QA environment and keeps the object flow visible to beginners.

### Explicitly excluded

This framework does not contain:

- A Playwright Test runner setup
- A fixtures layer
- A services layer
- A schemas layer
- Multiple environment configuration files
- Generic base page or base service classes unless a later, concrete duplication problem justifies one

## 2. Design Principles

1. Cucumber.js owns test execution, hooks, retries, and scenario lifecycle.
2. Hooks create objects; step definitions use them.
3. The World owns scenario state, not application behavior.
4. Page Objects own UI locators and actions.
5. The API client owns HTTP request construction and response handling.
6. Step definitions translate Gherkin into calls to framework objects.
7. Test data is explicit and easy to locate.
8. Each UI scenario receives a new browser context and page; API contexts are isolated per API
   scenario.
9. Selectors and assertions should describe user-visible behavior.
10. The smallest useful abstraction is preferred.

## 3. Folder Structure

Keep the project structure flat enough that a new contributor can follow each scenario from
Gherkin to its step definition and the object it calls. The following is the project layout and
the recommended home for new files:

```text
playwright-js-cucumber-framework/
|
+-- .github/
|   +-- workflows/
|       +-- playwright-cucumber.yml
|
+-- config/
|   +-- config.js                   # One QA configuration
|   +-- api-endpoints.json          # API paths, not environment profiles
|
+-- docs/
|   +-- ARCHITECTURE.md
|   +-- API_CLIENT_GUIDE.md
|
+-- features/
|   +-- login.feature
|   +-- products.feature
|   +-- cart.feature
|   +-- api.feature
|
+-- page-objects/
|   +-- home-page.js
|   +-- login-page.js
|   +-- products-page.js
|   +-- product-details-page.js
|   +-- cart-page.js
|   +-- registration-page.js
|
+-- step-definitions/
|   +-- ui/
|   +-- api/
|   +-- integration/
|
+-- support/
|   +-- world.js                    # Custom Cucumber World
|   +-- hooks.js                    # Per-scenario setup and teardown
|   +-- api-client.js               # Thin APIRequestContext wrapper
|   +-- common-utils.js             # Small shared framework helpers
|
+-- utils/
|   +-- logger.js                   # Console and optional worker-specific file logs
|
+-- test-data/
|   +-- ui-test-data.json
|   +-- api-test-data.json
|   +-- test-data.js                # Fresh scenario data, when needed
|
+-- reports/
|   +-- cucumber/
|   +-- evidence/
|
+-- allure-results/
+-- cucumber.js
+-- eslint.config.js
+-- prettier.config.js
+-- package.json
+-- .gitignore
+-- README.md
```

Reports, traces, and other generated output are runtime artifacts, not source folders to grow by
hand. Keep helpers small: add one only when a repeated, framework-neutral operation is clearer as
a named function. Do not create `src/`, fixtures, services, schemas, or speculative layers.

## 4. Component Responsibility Matrix

| Component        | Owns                                                                                                                    | Does not own                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Custom World     | Scenario-scoped references: browser resources, page objects, API client/response, and data needed by later steps        | Setup/teardown decisions, application workflows, or shared global state |
| Before hook      | Creating the resources needed for the scenario, then storing references on the World                                    | Feature actions or behavior assertions                                  |
| After hook       | Failure evidence, scenario-owned data cleanup, and disposal of every resource created for that scenario                 | Business workflows or suppressing cleanup errors                        |
| Page Object      | UI locators and intent-based actions for one page or cohesive page area                                                 | Cucumber steps, API calls, or scenario state                            |
| API client       | Common HTTP request setup and straightforward methods over `APIRequestContext`; small shared response checks            | Browser actions, endpoint workflows, or Gherkin wording                 |
| Step definitions | Translating feature language into calls on the World, coordinating a few actions, and asserting the scenario outcome    | Browser startup, direct selector construction, or low-level HTTP setup  |
| Utilities        | Small shared operations and structured logging; logger redacts sensitive-looking values and does not inspect API bodies | Hidden state, feature workflows, or speculative abstraction             |
| Feature files    | Business-readable behavior, examples, and acceptance intent                                                             | Implementation details, selectors, or test-runner setup                 |
| Configuration    | One QA application/API address and stable runtime settings                                                              | Environment profiles, scenario state, or committed secrets              |
| Reporters        | Readable scenario results, attachments, and diagnostics                                                                 | Test execution or application behavior                                  |

## 5. Object Initialization and Data Flow

### Before hook flow

1. Cucumber starts a scenario and creates a new Custom World instance.
2. The Before hook reads the single QA configuration and identifies scenario needs from its tags.
3. A UI scenario gets a browser, fresh context, and page. The hook creates the framework's core
   Page Objects with that page and stores them on the World.
4. An `@api` scenario gets an `APIRequestContext` and `ApiClient`; it does not start an unused
   browser.
5. An `@integration` scenario gets both browser and API resources.
6. The hook stores each created reference on the World. The World is the scenario's shared
   context, not a dependency injection framework.
7. Step definitions use regular `function` callbacks when accessing Cucumber's `this`, then call
   the appropriate Page Object or API client method.

### Scenario data flow

```text
Feature step
    -> Step definition
        -> World reference
            -> Page Object or API client
                -> Playwright page or APIRequestContext
                    -> AutomationExercise
                <- UI state or API response
            <- Business-readable result
        <- Cucumber assertion
    -> Cucumber report
```

Step definitions may store response data or generated test values on the World when a later step needs them. This keeps data scoped to the scenario and avoids global variables.

### After hook flow

1. Cucumber provides the scenario result to the After hook.
2. The hook saves and attaches a screenshot for every failed UI scenario. Trace and video collection
   follow their explicit modes so large artifacts are not collected unnecessarily.
3. The hook performs required scenario cleanup, such as removing test data if the application supports it.
4. The hook disposes of the API request context, if created.
5. The hook closes the browser context and browser, if created. Closing the context also releases
   its pages. Cleanup attempts should continue if disposing one resource fails, and cleanup
   failures must remain visible in the scenario result.

## 6. Scenario Isolation

- Every scenario gets a new World instance.
- Every UI scenario gets a new browser context and page.
- Cookies, local storage, permissions, and other browser state do not cross scenario boundaries.
- API request context state is created per scenario when API scenarios need isolated headers or storage.
- Mutable response values, IDs, and generated data are stored on the current World only.
- No module-level variables may hold scenario state.
- Scenarios should create or select their own test data and must not depend on execution order.
- Cleanup belongs in the After hook only when the application supports a reliable cleanup action.
- Parallel execution should be introduced only after test data and reporting have been proven independent.

Isolation protects against browser-state leakage, but it cannot prevent two scenarios from changing the same server-side account or product. Those scenarios need unique data or controlled sequencing.

## 7. Logging

`utils/logger.js` is a small Winston-based utility. It writes timestamped `DEBUG`, `INFO`, `WARN`,
and `ERROR` entries to the console and optionally to
`artifacts/logs/cucumber-<worker>-pid<PID>.log`. `LOG_LEVEL` selects the minimum level and defaults
to `INFO`; `LOG_TO_FILE=true` enables file output. The Cucumber worker ID and process ID keep
parallel workers from sharing a log file.

Hooks log run and scenario lifecycle, tags, browser selection, failures, and retry attempts.
Page Objects log navigation and important actions at `DEBUG`; the API client logs method,
endpoint, HTTP status, and duration without logging request or response bodies or headers.
Failed scenarios attach a bounded text excerpt of their scenario's logs to Cucumber. CI enables
file output and uploads the logs with the reports. Never pass credentials, headers, cookies, or
personal data to the logger; log action descriptions and safe metadata instead.

## 8. Page Object Model Standards

Each Page Object represents one navigable page or cohesive page area. It owns locator definitions
and exposes intent-based actions such as opening a page, logging in, searching for a product, or
adding an item to the cart. Step definitions may use the Page Object's locator objects with
Playwright's web-first `expect` assertions, but should not build selectors themselves.

Page Objects should:

- Receive a Playwright Page through their constructor.
- Keep locators private to the Page Object where practical.
- Use stable user-facing locators first: role, label, text, and test ID when available.
- Use CSS selectors only when a stable semantic locator is unavailable.
- Avoid XPath unless no maintainable alternative exists.
- Wait through Playwright locator actions and assertions instead of arbitrary timeouts.
- Return only values that a later step genuinely needs.
- Keep scenario outcome assertions in the step definitions. A Page Object may expose a locator or
  a small state-reading method, but should not import Cucumber or hide scenario assertions.

A Page Object should not contain API calls, Cucumber-specific code, or scenario setup.

## 9. API Client Standards

`support/api-client.js` is a small reusable wrapper around Playwright `APIRequestContext`.

It should:

- Accept the single QA API base URL and request context.
- Provide straightforward methods for the API endpoints used by features.
- Centralize common headers and request options.
- Return the response or a small response representation needed by steps.
- Keep endpoint-specific expectations in steps; shared HTTP status or application response-code
  checks may stay in the client when they reduce repeated low-level response handling.
- Provide useful error context when a request fails.

The API client is not a services layer. It should remain a thin HTTP client. Do not create one class per endpoint unless the API surface becomes large enough to make the single client unreadable.

## 10. Hooks and Custom World

### Custom World

The World is the typed scenario context. JSDoc should describe optional properties because different scenarios may initialize different objects. Typical properties include:

- Browser context and page
- Page Object references
- API client
- Last API response or parsed response data
- Generated user or product data
- Evidence-related metadata

The World should be easy to inspect while debugging. It must not become a general-purpose application container.

### Hooks

The Before hook is the composition root for scenario objects. It creates objects in a predictable order and stores them on the World. The After hook is responsible for evidence and resource cleanup. Keep feature-specific hooks rare; prefer tags only when a scenario truly needs different setup or evidence behavior.

## 11. Locator and Assertion Standards

### Locator priority

1. Accessible role and accessible name
2. Label or placeholder
3. Stable `data-testid` or equivalent test attribute
4. Visible text for stable user-facing content
5. CSS selector based on a stable attribute
6. XPath only as a last resort

Do not use generated class names, positional selectors, or long selector chains when a stable alternative exists.

### Assertion standards

- Assert observable outcomes, not implementation details.
- Prefer Playwright web-first `expect` assertions because they wait for the expected state. Using
  Playwright's assertion library does not make Playwright Test a runner; Cucumber.js owns scenario
  discovery, execution, hooks, and reporting.
- Assert one meaningful outcome per step where practical.
- Include useful expected values in failure messages when a custom assertion is necessary.
- Use API status and response-body assertions for API scenarios.
- Do not use arbitrary sleeps to make assertions pass.
- Keep assertions close to the step that expresses the behavior, while page-specific state access remains in the Page Object.

## 12. Coding Standards

- Use modern JavaScript supported by the selected Node.js version.
- Use JSDoc for World properties, constructor parameters, return values, API response shapes, and non-obvious data objects.
- Use `const` by default and `let` only for reassignment.
- Prefer `async`/`await` for Playwright and Cucumber operations.
- Use named `function` callbacks for Cucumber steps and hooks that access World values through
  `this`; arrow functions do not receive Cucumber's World as `this`.
- Avoid callbacks when a promise-based API is available.
- Keep functions small and named after intent.
- Use explicit error messages for setup and API failures.
- Do not hide waits, retries, or assertions inside generic helpers.
- Keep feature steps readable and business-oriented.
- Run ESLint and Prettier in local development and CI.
- Keep generated reports and screenshots out of source control.
- Do not commit credentials. Use GitHub Actions secrets or environment variables for sensitive runtime values, while retaining one QA environment definition.

## 13. Naming Conventions

- Feature files: `lower-kebab-case.feature`, for example `product-details.feature`.
- Step files: `<domain>-steps.js`, grouped under `step-definitions/ui`, `api`, or `integration`.
- Page Objects: `<page>-page.js`, with a class named `<Page>Page`, for example `LoginPage`.
- API client: `api-client.js`, with a class named `ApiClient`.
- World: `world.js`, with a class named `CustomWorld`.
- Hooks: `hooks.js`.
- Functions and variables: `camelCase`.
- Classes: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE` only for true constants.
- Tags: lowercase, short, and meaningful, such as `@ui`, `@api`, or `@smoke`.
- Test data keys should describe business meaning, not control flow.

## 14. Reporting and CI

Cucumber.js remains the test runner. The reporting setup may produce:

- Cucumber HTML output for readable scenario results.
- Allure results and an Allure report for history, attachments, and trend analysis.
- Failure screenshots saved under `reports/evidence/` and attached to both reports.
- Traces and optional videos retained according to `TRACE_MODE` and `VIDEO_MODE`.

The Cucumber HTML report and Allure results are enabled for every run. Generate and open Allure
with `npm run allure:generate` and `npm run allure:open`. Keep traces and videos disabled unless
they are needed because they can contain page or network data and consume additional storage.

GitHub Actions should run the same package scripts used locally, in this order:

1. Install dependencies with a locked dependency file.
2. Install the required Playwright browser.
3. Run formatting and lint checks.
4. Run Cucumber scenarios against the single QA environment.
5. Publish Cucumber, Allure, screenshots, and other diagnostics as artifacts even when tests fail.

CI should fail on test or quality-check failure while preserving reports for diagnosis.

## 15. Development Roadmap

### Phase 1: Project foundation

- Initialize Node.js project and package scripts.
- Add Cucumber.js, Playwright, ESLint, Prettier, and reporting dependencies.
- Establish the single QA configuration.
- Add `.gitignore`, README, and basic CI workflow.

### Phase 2: Framework core

- Define Custom World with JSDoc.
- Implement Before and After hook responsibilities.
- Validate context, page, evidence, and cleanup behavior with one small scenario.

### Phase 3: UI automation

- Add the first Page Object for the home or login flow.
- Add one feature and step definition set.
- Standardize locator and assertion patterns.
- Add failure screenshot attachment.

### Phase 4: API automation

- Add the thin API client using `APIRequestContext`.
- Add one API feature covering a meaningful endpoint and response assertion.
- Store only required API results on World.

### Phase 5: Reporting and quality gates

- Configure Cucumber HTML and Allure outputs.
- Add ESLint and Prettier scripts.
- Add CI artifact publication and verify failure diagnostics.

### Phase 6: Coverage and maintainability

- Add product, cart, and checkout flows incrementally.
- Add tags for focused local runs and CI suites.
- Review duplicated code before introducing any helper.
- Validate scenario independence and prepare for controlled parallel execution.

## 16. Limitations and Future Scalability

This simplified design is intentionally transparent, but it has boundaries:

- The World can become crowded as coverage grows. Split related Page Object references into clearly named groups only when navigation becomes difficult to follow.
- A single API client can become large. Separate endpoint modules only when the client is demonstrably difficult to maintain; keep them as API clients, not a hidden services layer.
- Creating all common objects in Before can add setup cost. Optimize only after measuring runtime and only if object creation is no longer understandable.
- One QA environment limits testing across deployments and makes environment-specific defects harder to compare.
- Server-side data collisions remain possible even with isolated browser contexts.
- Cucumber parallelism can expose shared-account and reporting-order problems.
- Cucumber HTML and Allure duplicate some reporting information and increase artifact maintenance.
- Without schemas, API response shape checks rely on focused assertions and JSDoc rather than formal contract validation.
- Without a fixtures layer, setup is explicit but may become repetitive for advanced suites.

Future growth should be driven by a measured maintenance problem. Possible later additions are environment selection, dedicated test-data management, API modules, contract validation, or a fixture-like composition mechanism. None is required for the beginner framework.

## 17. Approval Gate

Implementation should begin only after this architecture is approved. The first implementation slice should be the project foundation, Custom World, hooks, one UI Page Object, one feature, and one focused Cucumber run. No additional architectural layer should be added during that slice without a concrete requirement.

## 18. Hybrid UI and API Scenarios

Scenarios tagged `@integration` receive both the scenario's browser/Page Objects
and an `ApiClient` from the `Before` hook. API-only scenarios tagged `@api`
continue to skip browser startup, and ordinary UI scenarios do not create an API request context.

The integration features demonstrate three data flows:

1. An API product search returns a product name. The scenario stores that name
   on the World, searches for it with the existing `ProductsPage`, and asserts
   that the matching product card is visible.
2. A UI product search displays a product card. The existing `ProductsPage`
   reads the displayed name, the scenario stores it on the World, and the
   `ApiClient` searches for that name. The scenario asserts the API returns the
   same product.
3. An API account-creation step generates unique credentials and stores the
   account on the World. The existing `LoginPage` uses those credentials to
   sign in through the browser, and the scenario deletes the account through
   the `ApiClient`. The After hook also deletes a successfully created account
   if an earlier step fails before the explicit deletion.

The World values belong to one scenario and are cleared during teardown. The
product-search scenarios do not create or modify application data, so cleanup
consists of disposing the scenario's API request context and browser context.
The account scenario deletes its temporary account through the API and also
disposes both contexts. Run the integration slice with `npm run
test:integration`; the existing Cucumber HTML and Allure report commands can
also be combined with the `@integration` tag.
