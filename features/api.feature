@api
Feature: AutomationExercise products API

  @positive
  @parallel
  Scenario: Verify the products endpoint returns the product catalog
    When I request the products list
    Then the API response status is 200
    And the API response code is 200
    And the API response contains products

  @positive
  Scenario: Verify product search returns matching products
    When I search products using configured "matching" product data
    Then the API response status is 200
    And the API response code is 200
    And the product results include the configured search term

  @negative
  Scenario: Validate product search rejects a missing search term
    When I search for products without a search term
    Then the API response status is 200
    And the API response code is 400
    And the API response message is "Bad request, search_product parameter is missing in POST request."

  @edge
  Scenario: Validate product search returns no results for an unknown product
    When I search products using configured "noMatch" product data
    Then the API response status is 200
    And the API response code is 200
    And the API response contains exactly 0 "products"

  @positive
  @configuredLogin
  @requiresCredentials
  Scenario: Verify login accepts the configured valid credentials
    When I verify login using the configured valid credentials
    Then the API response status is 200
    And the API response code is 200
    And the API response message is "User exists!"

  @negative
  Scenario: Validate login reports missing credentials
    When I verify login without a password
    Then the API response status is 200
    And the API response code is 400
    And the API response message is "Bad request, email or password parameter is missing in POST request."

  @positive
  Scenario: Verify a new user account can be created
    Given I prepare a unique API user
    When I create the API user
    Then the API response status is 200
    And the API response code is 201
    And the API response message is "User created!"

  @positive
  Scenario: Verify a newly created user can log in
    Given I prepare a unique API user
    When I create the API user
    Then the API response code is 201
    When I verify login using the newly created API user
    Then the API response status is 200
    And the API response code is 200
    And the API response message is "User exists!"

  @negative
  Scenario: Validate an existing email cannot create a duplicate account
    Given I prepare a unique API user
    When I create the API user
    Then the API response code is 201
    When I create the API user
    Then the API response status is 200
    And the API response code is 400
    And the API response message is "Email already exists!"

  @positive
  Scenario: Verify an existing user account can be updated
    Given I prepare a unique API user
    When I create the API user
    Then the API response code is 201
    When I update the API user
    Then the API response status is 200
    And the API response code is 200
    And the API response message is "User updated!"

  @negative
  Scenario: Validate an unknown user account cannot be updated
    Given I prepare a unique API user
    When I update the API user
    Then the API response status is 200
    And the API response code is 404
    And the API response message is "Account not found!"

  @positive
  Scenario: Verify an existing user account can be deleted
    Given I prepare a unique API user
    When I create the API user
    Then the API response code is 201
    When I delete the API user
    Then the API response status is 200
    And the API response code is 200
    And the API response message is "Account deleted!"

  @negative
  Scenario: Validate an unknown user account cannot be deleted
    Given I prepare a unique API user
    When I delete the API user
    Then the API response status is 200
    And the API response code is 404
    And the API response message is "Account not found!"

    