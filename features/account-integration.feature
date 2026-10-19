@integration @account
Feature: API-created account can log in through the UI

  @positive 
  Scenario: Create an account through the API, log in through the UI, and delete it through the API
    Given I prepare a unique API user
    When I create the API user
    Then the API response status is 200
    And the API response code is 201
    And the API response message is "User created!"
    Given User is on the AutomationExercise home page
    When User opens the login page
    And I log in through the UI using the API-created account
    Then the API-created user is logged in through the UI
    When I delete the API user
    Then the API response status is 200
    And the API response code is 200
    And the API response message is "Account deleted!"
