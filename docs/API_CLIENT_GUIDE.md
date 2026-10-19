# API Client Guide

This guide demonstrates the `ApiClient` methods in `support/api-client.js`, explains their request options, and shows how to validate response status and data.

## What the API Client Does

The API client wraps Playwright's `APIRequestContext` and provides four methods:

| Client method                     | HTTP method | Typical use                                       |
| --------------------------------- | ----------- | ------------------------------------------------- |
| `apiClient.get(path, options)`    | GET         | Read a resource or search using query parameters. |
| `apiClient.post(path, options)`   | POST        | Submit data or create a resource.                 |
| `apiClient.put(path, options)`    | PUT         | Replace or update a resource.                     |
| `apiClient.delete(path, options)` | DELETE      | Delete a resource.                                |

The `options` argument is optional. The client adds `Accept: application/json` by default, copies any custom headers, and forwards the supported Playwright request settings. The returned value is an `APIResponse`; the client does not parse the response body automatically.

## How It Fits This Framework

For an `@api` scenario, the `Before` hook creates a Playwright API request context using the configured API base URL and timeout. It then creates an `ApiClient` and stores it on the Cucumber World as `this.apiClient`. API scenarios do not start an unused browser. Steps can use the World client and store the response on `this.apiResponse`. The `After` hook disposes of the request context and removes any temporary account created by that scenario.

The default application API URL is `https://automationexercise.com/api`. The endpoint paths used by the scenarios are stored in `config/api-endpoints.json`. The scenarios exercise only the operations published in the AutomationExercise API list, including product search and user account creation, update, and deletion. Their request fixtures are stored in `test-data/api-test-data.json`. Valid login credentials come from `VALID_USERNAME` and `VALID_PASSWORD` in `.env`; do not commit credential values.

## Request Options

Pass options as the second argument to any client method:

```js
await apiClient.get('productsList', {
  headers: { 'X-Test-Run': 'catalog-check' },
  params: { page: 2 },
  timeout: 10_000,
});
```

| Option              | Type                                                | Purpose                                                                                                    |
| ------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `headers`           | `Record<string, string>`                            | Adds or overrides HTTP headers. `Accept: application/json` is the default.                                 |
| `data`              | `unknown`                                           | Sends a request body, commonly a JSON object.                                                              |
| `form`              | `Record<string, string\|number\|boolean>`           | Sends URL-encoded form fields.                                                                             |
| `multipart`         | `unknown`                                           | Sends multipart form data, often used for file uploads.                                                    |
| `params`            | `Record<string, string\|number\|boolean\|string[]>` | Adds query-string parameters to the URL.                                                                   |
| `timeout`           | `number`                                            | Sets the request timeout in milliseconds.                                                                  |
| `failOnStatusCode`  | `boolean`                                           | Makes Playwright reject non-success status codes when enabled.                                             |
| `ignoreHTTPSErrors` | `boolean`                                           | Allows invalid HTTPS certificates for this request. Use only when needed in a controlled test environment. |

The client explicitly maps these fields to the Playwright request options. When adding another supported option, update both the `ApiRequestOptions` typedef and the mapping in `ApiClient.request()`.

### Choosing `data` or `form`

Use `data` for JSON request bodies:

```js
await apiClient.post('resource', {
  data: { name: 'Sample item', active: true },
});
```

Use `form` for URL-encoded form fields:

```js
await apiClient.post('login', {
  form: { email: 'person@example.com', remember: true },
});
```

Choose the format required by the endpoint; do not send `data` and `form` for the same request unless the endpoint explicitly requires that combination.

## Complete Four-Verb Walkthrough

The following standalone example sends each supported HTTP method twice: once with no request options and once with options. It validates both the HTTP status and selected response data. HTTPBin echoes request information, so the example can check how query parameters and JSON bodies were received.

The example requires an internet connection and uses only non-sensitive sample data. It creates and disposes its own API request context; it does not use the Cucumber hooks or the AutomationExercise API base URL.

```js
import assert from 'node:assert/strict';
import { request } from 'playwright';
import { ApiClient } from '../support/api-client.js';

const requestContext = await request.newContext({
  baseURL: 'https://httpbin.org/',
  timeout: 10_000,
});
const apiClient = new ApiClient(requestContext);

try {
  // GET without options: request the endpoint with no query parameters.
  const getWithoutOptions = await apiClient.get('get');
  apiClient.assertStatus(getWithoutOptions, 200);
  const getWithoutOptionsBody = await getWithoutOptions.json();
  assert.deepEqual(getWithoutOptionsBody.args, {});
  assert.ok(getWithoutOptionsBody.url.endsWith('/get'));

  // GET with options: send query parameters, a custom header, and a timeout.
  const getWithOptions = await apiClient.get('get', {
    headers: { 'X-Guide-Example': 'get-with-options' },
    params: { category: 'books', page: 2 },
    timeout: 10_000,
  });
  apiClient.assertStatus(getWithOptions, 200);
  const getWithOptionsBody = await getWithOptions.json();
  assert.deepEqual(getWithOptionsBody.args, { category: 'books', page: '2' });

  // POST without options: send no body.
  const postWithoutOptions = await apiClient.post('post');
  apiClient.assertStatus(postWithoutOptions, 200);
  const postWithoutOptionsBody = await postWithoutOptions.json();
  assert.equal(postWithoutOptionsBody.json, null);
  assert.ok(postWithoutOptionsBody.url.endsWith('/post'));

  // POST with options: send and validate a JSON body.
  const postData = { name: 'Sample item', active: true };
  const postWithOptions = await apiClient.post('post', {
    data: postData,
    headers: { 'X-Guide-Example': 'post-with-options' },
  });
  apiClient.assertStatus(postWithOptions, 200);
  const postWithOptionsBody = await postWithOptions.json();
  assert.deepEqual(postWithOptionsBody.json, postData);

  // PUT without options: send no body.
  const putWithoutOptions = await apiClient.put('put');
  apiClient.assertStatus(putWithoutOptions, 200);
  const putWithoutOptionsBody = await putWithoutOptions.json();
  assert.equal(putWithoutOptionsBody.json, null);
  assert.ok(putWithoutOptionsBody.url.endsWith('/put'));

  // PUT with options: send and validate a JSON body.
  const putData = { name: 'Updated item', active: false };
  const putWithOptions = await apiClient.put('put', {
    data: putData,
    timeout: 10_000,
  });
  apiClient.assertStatus(putWithOptions, 200);
  const putWithOptionsBody = await putWithOptions.json();
  assert.deepEqual(putWithOptionsBody.json, putData);

  // DELETE without options: call the endpoint without query parameters or a body.
  const deleteWithoutOptions = await apiClient.delete('delete');
  apiClient.assertStatus(deleteWithoutOptions, 200);
  const deleteWithoutOptionsBody = await deleteWithoutOptions.json();
  assert.deepEqual(deleteWithoutOptionsBody.args, {});
  assert.ok(deleteWithoutOptionsBody.url.endsWith('/delete'));

  // DELETE with options: send a query parameter and validate the echoed value.
  const deleteWithOptions = await apiClient.delete('delete', {
    headers: { 'X-Guide-Example': 'delete-with-options' },
    params: { id: 'sample-123' },
  });
  apiClient.assertStatus(deleteWithOptions, 200);
  const deleteWithOptionsBody = await deleteWithOptions.json();
  assert.deepEqual(deleteWithOptionsBody.args, { id: 'sample-123' });
} finally {
  await requestContext.dispose();
}
```

### What Each Check Verifies

Each call is awaited so the response is available before the next line runs. `assertStatus(response, 200)` checks the HTTP status. The AutomationExercise API also puts its application-level result in the JSON `responseCode` field, so use `assertResponseCode()` for that value. `assertResponseMessage()` checks the API message, and `assertArrayProperty()` verifies that a named JSON property is an array (and optionally checks its exact length).

The no-options examples show that the second argument can be omitted. The options examples show that query parameters are echoed in `args`, and JSON request bodies are echoed in `json`. HTTPBin returns query parameter values as strings, which is why `page: 2` is checked as `'2'` in the response.

## Cucumber Flow Against the Configured API

This is the same pattern used by the existing API scenario. The feature expresses the behavior, a step calls the API client, and later steps validate the response:

```gherkin
@api
Feature: Products API

  Scenario: Get all products
    When I request the products list
    Then the API response status is 200
    And the API response contains products
```

```js
import { Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';

When('I request the products list', async function () {
  this.apiResponse = await this.apiClient.get('productsList');
});

Then('the API response status is {int}', function (expectedStatus) {
  this.apiClient.assertStatus(this.apiResponse, expectedStatus);
});

Then('the API response contains products', async function () {
  const body = await this.apiResponse.json();

  expect(body.responseCode).toBe(200);
  expect(body.products).toEqual(expect.arrayContaining([expect.any(Object)]));
});
```

Run the repository's API scenario with:

```powershell
npm run test:api
```

The API client returns an HTTP response even for many non-2xx statuses by default. This allows a scenario to assert an expected error status with `assertStatus()`. If `failOnStatusCode: true` is set, Playwright rejects a non-success response; the client replaces that transport-level error with its generic sanitized message, so do not enable it when the test needs to inspect an error response body or status.

## Common Pitfalls

- Pass an API-relative path such as `productsList`. The client removes leading slashes, and the hook configures the API base URL with a trailing slash.
- Await the client call before using the response.
- Parse the response body with `response.json()` (or another response parser) before checking its data.
- Validate both status and useful response fields. A successful status alone does not prove the response contains the expected data.
- Use request options that match the endpoint contract. A query parameter is not the same as a JSON body.
- Do not assume a request changed server state just because an echo service returned `200`; HTTPBin reflects request details and is not a persistent CRUD database.
- Avoid sending credentials or private data to public echo services.
- Keep API request contexts scoped to the scenario and dispose of them when finished.
