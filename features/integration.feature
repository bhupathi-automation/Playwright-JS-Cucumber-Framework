@integration @products
Feature: Product search UI and API integration

  @positive
  Scenario: Use an API product search result in the UI
    Given I search the API for configured matching products
    Then the API provides a product for the UI search
    When I search the UI for the product returned by the API
    Then the UI displays the product returned by the API

  @positive
  Scenario: Verify a UI product search result through the API
    Given I search the UI for the configured product
    Then the UI displays the configured product
    When I search the API for the product displayed in the UI
    Then the API results include the product displayed in the UI
