@ui @login
Feature: Login functionality

  @positive @login1
  Scenario: Verify user can open the login form
    Given User is on the AutomationExercise home page
    When User opens the login page
    Then User sees the login form

  @positive @login2 @requiresCredentials
  Scenario: Verify successful login with valid credentials
    Given User is on the AutomationExercise home page
    When User opens the login page
    And User logs in with valid credentials from the environment
    Then User sees the configured user logged in

  @negative  @login3
  Scenario Outline: Verify login error for multiple invalid credentials
    Given User is on the AutomationExercise home page
    When User opens the login page
    And User submits login credentials "<email>" and "<password>"
    Then User sees the invalid login error

    Examples:
      | email                    | password                               |
      | invalid-user@example.com | invalid-password#245                   |
      | another-user@example.com | incorrect-pass3937297927395749759789r9 |

  @negative
  Scenario Outline: Verify login error for an unregistered user
    Given User is on the AutomationExercise home page
    When User opens the login page
    And User submits login credentials "<email>" and "<password>"
    Then User sees the invalid login error

    Examples:
      | email                         | password                 |
      | unregistered.user@example.com | ValidLookingPassword123! |

  @positive @requiresCredentials
  Scenario: Verify logout is successful
    Given User is on the AutomationExercise home page
    When User opens the login page
    And User logs in with valid credentials from the environment
    Then User sees the configured user logged in
    When User logs out
    Then User sees the logged-out state