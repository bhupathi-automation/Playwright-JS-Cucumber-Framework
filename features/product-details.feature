@ui @product-details
Feature: Product details

  @positive
  Scenario: Verify the product details are displayed correctly
    Given User is on the configured product details page
    Then User sees the configured product details

  @positive
  Scenario: Verify the product quantity can be modified
    Given User is on the configured product details page
    When User changes the quantity to 3
    Then User sees the product quantity set to 3

  @positive
  Scenario: Verify adding a product to the cart from its details page
    Given User is on the configured product details page
    When User adds the product to the cart from its details page
    Then User sees the add-to-cart confirmation
    When User opens the cart from the product details confirmation
    Then User sees the configured product in the cart

  @positive
  Scenario: Verify the fields displayed to write a product review
    Given User is on the configured product details page
    Then User sees the required product review fields

  @positive
  Scenario Outline: Verify a product review can be submitted
    Given User is on the configured product details page
    When User submits a review with name "<name>", email "<email>", and message "<review>"
    Then User sees the successful review submission message

    Examples:
      | name               | email                    | review                                      |
      | Automation Reviewer | reviewer@example.com     | The product details and review form work.   |
