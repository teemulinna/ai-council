# BDD Feature: LLM Council Workflow

Feature: LLM Council Decision Making
  As a user seeking high-quality AI responses
  I want multiple LLMs to collaborate and review each other
  So that I get the best possible answer through consensus

  Background:
    Given the council has at least 3 working models
    And the OpenRouter API is accessible
    And caching is enabled

  Scenario: Successful council consultation
    Given I have a question "What is the capital of France?"
    When I submit the question to the council
    Then Stage 1 should collect responses from all models
    And Stage 2 should rank the responses anonymously
    And Stage 3 should synthesize a final answer
    And the final response should mention "Paris"
    And the total cost should be less than $0.50

  Scenario: Handling partial model failures
    Given 2 out of 5 models are unavailable
    When I submit a question to the council
    Then the system should use fallback models
    And Stage 1 should have at least 3 responses
    And the council should complete successfully
    And a warning should be logged about failed models

  Scenario: Caching reduces costs
    Given I submit the question "Explain photosynthesis"
    When I submit the same question again
    Then the cached response should be returned
    And the second query should cost $0.00
    And the response time should be under 100ms

  Scenario: Budget protection
    Given my budget limit is set to $1.00
    And I have already spent $0.95
    When I try to submit an expensive query
    Then the system should reject the request
    And return a "budget exceeded" error
    And suggest using cheaper models

  Scenario: Quality assurance on disagreement
    Given I ask a controversial question
    When the models strongly disagree (agreement < 30%)
    Then the system should flag low consensus
    And include confidence scores in the response
    And suggest human review may be needed

  Scenario: Smart model selection
    Given I ask a simple factual question
    Then the system should detect query complexity
    And select appropriate models for the task
    And prefer cheaper models for simple queries
    And use premium models only when necessary