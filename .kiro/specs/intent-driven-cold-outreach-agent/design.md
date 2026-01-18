# Design Document: Intent-Driven Cold Outreach Agent

## Overview

The Intent-Driven Cold Outreach Agent is a production-ready AI system that generates personalized, human-sounding outreach messages through a structured 7-step reasoning workflow. The system prioritizes quality and relevance over persuasion or scale, ensuring predictable, explainable, and business-safe behavior for professional AI marketplaces.

The agent processes structured prospect data and intent signals to determine whether a prospect should care, why they might care now, and what message strategy is appropriate. It maintains strict workflow enforcement while producing authentic, non-spammy communication that sounds personally written.

## Architecture

The system follows a pipeline architecture with seven sequential processing stages, each with specific responsibilities and validation checkpoints:

```mermaid
graph TD
    A[Input Validation] --> B[Signal Interpretation]
    B --> C[Intent Hypothesis Formation]
    C --> D[Intent Confidence Scoring]
    D --> E[Message Strategy Selection]
    E --> F[Message Generation]
    F --> G[Authenticity & Spam Self-Evaluation]
    G --> H[Output Assembly]
    
    I[Prospect Data] --> A
    J[Intent Signals] --> A
    
    H --> K[Structured Output]
    
    G --> F : Revision Required
```

The architecture ensures that each step builds upon the previous one, with no step able to proceed without successful completion of its predecessor. This creates a deterministic, auditable process that maintains consistency across all inputs.

## Components and Interfaces

### Core Components

**ReasoningAgent**
- Primary orchestrator that manages the 7-step workflow
- Maintains execution state and audit logs
- Enforces sequential processing and error handling
- Interface: `processOutreachRequest(prospectData, intentSignals) -> StructuredOutput`

**InputValidator**
- Validates prospect data completeness and quality
- Verifies presence of required fields (role, company context, 2+ intent signals)
- Automatically reduces confidence for weak signals
- Interface: `validateInput(prospectData, intentSignals) -> ValidationResult`

**SignalInterpreter**
- Processes each intent signal independently
- Applies relevance and freshness weighting
- Maintains signal interpretation audit trail
- Interface: `interpretSignals(intentSignals) -> WeightedSignals`

**HypothesisFormer**
- Creates single primary hypothesis from weighted signals
- Ensures grounding in provided evidence only
- Generates conservative hypotheses for weak signals
- Interface: `formHypothesis(weightedSignals) -> IntentHypothesis`

**ConfidenceScorer**
- Assigns High/Medium/Low confidence levels
- Uses deterministic scoring rules based on signal strength
- Controls downstream tone and strategy selection
- Interface: `scoreConfidence(hypothesis, signals) -> ConfidenceLevel`

**StrategySelector**
- Maps confidence levels to message strategies
- Ensures consistent strategy selection
- Provides strategy-specific guidance for message generation
- Interface: `selectStrategy(confidenceLevel) -> MessageStrategy`

**MessageGenerator**
- Creates human-sounding outreach messages
- Enforces 120-word limit and tone requirements
- Avoids buzzwords and sales clichés
- Interface: `generateMessage(strategy, hypothesis) -> Message`

**AuthenticityFilter**
- Evaluates message authenticity and spam characteristics
- Detects templated or robotic language patterns
- Triggers revision when issues are detected
- Interface: `evaluateAuthenticity(message, confidenceLevel) -> AuthenticityResult`

**OutputAssembler**
- Compiles structured output with all required components
- Generates alternative messages and follow-up timing
- Hides internal reasoning from end users
- Interface: `assembleOutput(message, confidence, reasoning) -> StructuredOutput`

### Data Models

**ProspectData**
```typescript
interface ProspectData {
  role: string;
  companyContext: CompanyContext;
  contactDetails: ContactDetails;
  additionalContext?: Record<string, any>;
}

interface CompanyContext {
  name: string;
  industry: string;
  size: CompanySize;
  recentEvents?: string[];
}
```

**IntentSignal**
```typescript
interface IntentSignal {
  type: SignalType;
  description: string;
  timestamp: Date;
  relevanceScore: number;
  source: string;
  metadata?: Record<string, any>;
}

enum SignalType {
  JOB_CHANGE = "job_change",
  FUNDING_EVENT = "funding_event",
  TECHNOLOGY_ADOPTION = "technology_adoption",
  COMPANY_GROWTH = "company_growth",
  INDUSTRY_TREND = "industry_trend"
}
```

**StructuredOutput**
```typescript
interface StructuredOutput {
  intentConfidence: ConfidenceLevel;
  reasoningSummary: string; // 1-2 sentences
  recommendedMessage: string;
  alternativeMessages: [string, string]; // exactly 2 alternatives
  suggestedFollowUpTiming: FollowUpTiming;
  processingMetadata: ProcessingMetadata;
}

enum ConfidenceLevel {
  HIGH = "High",
  MEDIUM = "Medium", 
  LOW = "Low"
}
```

**MessageStrategy**
```typescript
interface MessageStrategy {
  type: StrategyType;
  toneGuidelines: string[];
  contentFocus: string;
  callToActionLevel: CallToActionLevel;
}

enum StrategyType {
  DIRECT_VALUE_ALIGNMENT = "direct_value_alignment",
  INSIGHT_LED_OBSERVATION = "insight_led_observation",
  SOFT_CURIOSITY = "soft_curiosity"
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Input Validation Completeness
*For any* prospect data input, the validation should accept only inputs containing role, company context, and at least two intent signals
**Validates: Requirements 1.1**

### Property 2: Confidence Reduction for Weak Signals
*For any* set of weak or insufficient intent signals, the confidence scoring should be lower than for strong signals
**Validates: Requirements 1.2**

### Property 3: Required Field Validation
*For any* prospect data missing required fields, the system should reject the input and return a validation error
**Validates: Requirements 1.3**

### Property 4: Timestamp Validation
*For any* intent signal, the system should validate that timestamp information is present for freshness evaluation
**Validates: Requirements 1.4**

### Property 5: Signal Independence
*For any* set of intent signals, interpreting one signal should not affect the interpretation of other signals
**Validates: Requirements 2.1**

### Property 6: Signal Weighting by Relevance and Freshness
*For any* multiple intent signals, the system should weight signals based on their relevance and freshness rather than treating them equally
**Validates: Requirements 2.2, 2.3**

### Property 7: Recent Signal Prioritization
*For any* conflicting signals with different timestamps, the system should prioritize more recent and direct signals
**Validates: Requirements 2.4**

### Property 8: Single Hypothesis Formation
*For any* set of weighted signals, the system should form exactly one primary hypothesis
**Validates: Requirements 3.1**

### Property 9: Evidence-Grounded Hypotheses
*For any* generated hypothesis, all content should be grounded only in provided signals without inventing facts
**Validates: Requirements 3.2**

### Property 10: Conservative Hypothesis for Insufficient Signals
*For any* insufficient signal set, the system should form a conservative hypothesis or decline to proceed
**Validates: Requirements 3.3**

### Property 11: Confidence Level Assignment
*For any* input scenario, the system should assign exactly one confidence level from High, Medium, or Low
**Validates: Requirements 4.1**

### Property 12: High Confidence for Strong Signals
*For any* set of multiple strong, recent signals, the system should assign High confidence
**Validates: Requirements 4.2**

### Property 13: Medium Confidence for Mixed Signals
*For any* set of mixed or indirect signals, the system should assign Medium confidence
**Validates: Requirements 4.3**

### Property 14: Low Confidence for Weak Signals
*For any* set of weak or assumed signals, the system should assign Low confidence
**Validates: Requirements 4.4**

### Property 15: Strategy Selection Mapping
*For any* confidence level, the system should select the appropriate strategy: High→Direct, Medium→Insight-led, Low→Soft curiosity
**Validates: Requirements 5.1, 5.2, 5.3**

### Property 16: Single Strategy Selection
*For any* outreach request, the system should choose exactly one message strategy
**Validates: Requirements 5.4**

### Property 17: Deterministic Strategy Selection
*For any* identical confidence level scenarios, the system should consistently select the same strategy
**Validates: Requirements 5.5**

### Property 18: Message Word Limit
*For any* generated message, the word count should not exceed 120 words
**Validates: Requirements 6.1**

### Property 19: Hypothesis-Based Relevance
*For any* generated message, it should include content that references the intent hypothesis
**Validates: Requirements 6.3**

### Property 20: Buzzword Avoidance
*For any* generated message, it should not contain known buzzwords or sales clichés
**Validates: Requirements 6.4**

### Property 21: Call-to-Action Restriction
*For any* non-High confidence scenario, the generated message should not push for a call
**Validates: Requirements 6.5**

### Property 22: Template Detection
*For any* message evaluated by the authenticity filter, templated messages should be correctly identified
**Validates: Requirements 7.1**

### Property 23: Artificial Language Detection
*For any* message with robotic or artificial language patterns, the authenticity filter should detect them
**Validates: Requirements 7.2**

### Property 24: Salesiness Appropriateness
*For any* overly salesy content, the authenticity filter should flag it as inappropriate for the confidence level
**Validates: Requirements 7.3**

### Property 25: Revision Trigger
*For any* message with detected authenticity issues, the system should trigger message revision
**Validates: Requirements 7.4**

### Property 26: Structured Output Completeness
*For any* processing request, the output should include intent_confidence, reasoning_summary, recommended_message, exactly 2 alternatives, and follow-up timing
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

### Property 27: Internal Reasoning Concealment
*For any* generated output, internal chain-of-thought or reasoning steps should not be exposed to end users
**Validates: Requirements 8.6**

### Property 28: Workflow Step Execution
*For any* processing request, all 7 workflow steps should be executed in the specified order without skipping
**Validates: Requirements 9.1, 9.2**

### Property 29: Audit Log Maintenance
*For any* workflow execution, step execution logs should be maintained for audit purposes
**Validates: Requirements 9.3**

### Property 30: Error Handling on Step Failure
*For any* step failure during execution, the system should halt processing and return an error
**Validates: Requirements 9.4**

### Property 31: Deterministic Execution
*For any* identical inputs, the workflow execution should produce identical outputs
**Validates: Requirements 9.5**

### Property 32: Conservative Interpretation
*For any* unclear intent evidence, the system should choose conservative interpretations
**Validates: Requirements 10.1**

### Property 33: Evidence-Based Intent
*For any* intent determination, it should never be assumed without supporting evidence
**Validates: Requirements 10.2**

### Property 34: Grounded Value Propositions
*For any* generated content, value propositions should not be exaggerated and data should not be fabricated
**Validates: Requirements 10.3**

### Property 35: Uncertainty Acknowledgment
*For any* low confidence scenario, the messaging should acknowledge uncertainty
**Validates: Requirements 10.4**

### Property 36: Safety Over Persuasiveness
*For any* scenario where business safety conflicts with message persuasiveness, safety should be prioritized
**Validates: Requirements 10.5**

## Error Handling

The system implements comprehensive error handling at each workflow step:

**Input Validation Errors**
- Missing required fields: Return structured error with specific missing field information
- Invalid signal formats: Return validation error with format requirements
- Insufficient signals: Return error indicating minimum signal requirements

**Processing Errors**
- Signal interpretation failures: Log error and attempt conservative interpretation
- Hypothesis formation failures: Return error indicating insufficient evidence
- Confidence scoring errors: Default to Low confidence with error logging

**Message Generation Errors**
- Word limit exceeded: Automatically trim and regenerate within limits
- Authenticity filter failures: Trigger up to 3 revision attempts before error
- Strategy selection errors: Default to Soft curiosity approach

**System Errors**
- Workflow step failures: Halt processing and return detailed error information
- Audit logging failures: Continue processing but flag logging issues
- Output assembly errors: Return partial output with error indicators

All errors include:
- Error code and category
- Human-readable error message
- Suggested remediation steps
- Processing context for debugging

## Testing Strategy

The system employs a dual testing approach combining unit tests for specific scenarios and property-based tests for comprehensive coverage:

**Unit Testing**
- Specific examples demonstrating correct behavior for each workflow step
- Edge cases including empty inputs, boundary conditions, and error scenarios
- Integration points between workflow components
- Mock data scenarios for consistent testing environments

**Property-Based Testing**
- Universal properties verified across randomized inputs using Hypothesis (Python)
- Minimum 100 iterations per property test to ensure statistical confidence
- Each property test tagged with format: **Feature: intent-driven-cold-outreach-agent, Property {number}: {property_text}**
- Comprehensive input space coverage through intelligent test data generation

**Test Configuration**
- Property tests run with 100+ iterations to catch edge cases
- Unit tests focus on specific examples and integration scenarios
- Both test types are complementary and required for full coverage
- Continuous integration ensures all tests pass before deployment

**Test Data Generation**
- Smart generators create realistic prospect data and intent signals
- Signal generators vary relevance, freshness, and strength parameters
- Message generators test various confidence levels and strategies
- Error scenario generators test failure conditions and recovery

The testing strategy ensures that both concrete examples work correctly (unit tests) and universal properties hold across all possible inputs (property tests), providing comprehensive validation of system correctness.