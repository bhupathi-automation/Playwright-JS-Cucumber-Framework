@ui @cart
Feature: Shopping cart

  @positive
  Scenario: Verify user can add a product to the shopping cart
    Given User is on the AutomationExercise products page
    When User adds the configured product to the cart
    And User opens the cart from the confirmation dialog
    Then User sees the configured product in the cart