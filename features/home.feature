@ui
@crossBrowser
@home
Feature: AutomationExercise home page

  @parallel
  Scenario: Verify user can open the AutomationExercise home page
    When User opens the AutomationExercise home page
    Then User sees the login navigation link

  @parallel
  Scenario: Verify user receives an isolated browser session for each scenario
    When User opens the AutomationExercise home page
    Then User sees the login navigation link