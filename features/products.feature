@ui @products
Feature: Product search

  @positive
  Scenario: Verify user can search for an existing product
    Given User is on the AutomationExercise products page
    When User searches for the configured product
    Then User sees the configured product in the results

  @negative
  Scenario: Validate user sees no results for an unknown product
    Given User is on the AutomationExercise products page
    When User searches for the configured missing product
    Then User sees no products in the results