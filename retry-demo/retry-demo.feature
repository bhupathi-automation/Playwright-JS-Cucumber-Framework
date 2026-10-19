@retryDemo
Feature: Cucumber scenario retry demonstration

  @ui
  Scenario: Retry a failed UI scenario with a fresh browser context
    Given I demonstrate a first-attempt failure with "UI" resources

  @api
  Scenario: Retry a failed API scenario with a fresh request context
    Given I demonstrate a first-attempt failure with "API" resources

  @integration
  Scenario: Retry a failed integration scenario with fresh UI and API resources
    Given I demonstrate a first-attempt failure with "integration" resources
