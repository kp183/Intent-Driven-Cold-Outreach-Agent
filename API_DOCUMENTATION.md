# Intent-Driven Cold Outreach Agent - API Documentation

## Overview

The Intent-Driven Cold Outreach Agent is a production-ready AI system that generates personalized, human-sounding outreach messages through a structured 7-step reasoning workflow. The system prioritizes quality and relevance over persuasion or scale, ensuring predictable, explainable, and business-safe behavior.

## Installation

```bash
npm install intent-driven-cold-outreach-agent
```

## Quick Start

```typescript
import { 
  IntentDrivenOutreachAgent, 
  ProspectData, 
  IntentSignal, 
  SignalType, 
  CompanySize 
} from 'intent-driven-cold-outreach-agent';

// Create agent instance
const agent = new IntentDrivenOutreachAgent();

// Define prospect data
const prospectData: ProspectData = {
  role: 'VP of Engineering',
  companyContext: {
    name: 'TechCorp Inc',
    industry: 'Software',
    size: CompanySize.MEDIUM
  },
  contactDetails: {
    name: 'John Smith',
    email: 'john.smith@techcorp.com'
  }
};

// Define intent signals
const intentSignals: IntentSignal[] = [
  {
    type: SignalType.FUNDING_EVENT,
    description: 'Company raised Series B funding',
    timestamp: new Date('2024-01-15'),
    relevanceScore: 0.9,
    source: 'TechCrunch'
  },
  {
    type: SignalType.TECHNOLOGY_ADOPTION,
    description: 'Migrating to cloud infrastructure',
    timestamp: new Date('2024-01-10'),
    relevanceScore: 0.8,
    source: 'LinkedIn'
  }
];

// Process outreach request
const result = await agent.processOutreachRequest(prospectData, intentSignals);

if ('code' in result) {
  console.error('Processing failed:', result.message);
  console.log('Remediation:', result.remediation);
} else {
  console.log('Recommended message:', result.recommendedMessage);
  console.log('Confidence level:', result.intentConfidence);
  console.log('Alternative messages:', result.alternativeMessages);
  console.log('Follow-up timing:', result.suggestedFollowUpTiming);
}
```

## API Reference

### IntentDrivenOutreachAgent

The main class for processing outreach requests.

#### Constructor

```typescript
new IntentDrivenOutreachAgent(config?: AgentConfig)
```

**Parameters:**
- `config` (optional): Configuration options for the agent

**AgentConfig Interface:**
```typescript
interface AgentConfig {
  enableVerboseLogging?: boolean;     // Enable detailed logging
  maxRevisionAttempts?: number;       // Max authenticity revision attempts (default: 3)
  customBuzzwords?: string[];         // Custom buzzwords to avoid
  processingTimeout?: number;         // Timeout in milliseconds (default: 30000)
}
```

#### Methods

##### processOutreachRequest()

Processes an outreach request through the complete 7-step workflow.

```typescript
async processOutreachRequest(
  prospectData: ProspectData,
  intentSignals: IntentSignal[]
): Promise<StructuredOutput | ProcessingError>
```

**Parameters:**
- `prospectData`: Information about the target prospect
- `intentSignals`: Array of intent signals indicating prospect interest

**Returns:**
- `StructuredOutput`: Successful processing result
- `ProcessingError`: Error information if processing fails

##### validateInputs()

Validates prospect data and intent signals before processing.

```typescript
validateInputs(
  prospectData: ProspectData,
  intentSignals: IntentSignal[]
): ValidationResult
```

##### getConfig()

Gets the current configuration of the agent.

```typescript
getConfig(): Readonly<Required<AgentConfig>>
```

##### updateConfig()

Updates the agent configuration.

```typescript
updateConfig(newConfig: Partial<AgentConfig>): void
```

##### getHealthStatus()

Gets processing statistics and health information.

```typescript
getHealthStatus(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  config: Readonly<Required<AgentConfig>>;
  lastProcessingTime?: number;
}
```

## Data Models

### ProspectData

```typescript
interface ProspectData {
  role: string;                           // Prospect's job role
  companyContext: CompanyContext;         // Company information
  contactDetails: ContactDetails;         // Contact information
  additionalContext?: Record<string, unknown>; // Optional additional data
}

interface CompanyContext {
  name: string;                          // Company name
  industry: string;                      // Industry sector
  size: CompanySize;                     // Company size category
  recentEvents?: string[];               // Recent company events
}

interface ContactDetails {
  email: string;                         // Email address
  name: string;                          // Full name
  linkedinUrl?: string;                  // LinkedIn profile URL
  phoneNumber?: string;                  // Phone number
}
```

### IntentSignal

```typescript
interface IntentSignal {
  type: SignalType;                      // Type of intent signal
  description: string;                   // Human-readable description
  timestamp: Date;                       // When the signal occurred
  relevanceScore: number;                // Relevance score (0-1)
  source: string;                        // Source of the signal
  metadata?: Record<string, unknown>;    // Optional metadata
}
```

### StructuredOutput

```typescript
interface StructuredOutput {
  intentConfidence: ConfidenceLevel;     // High, Medium, or Low
  reasoningSummary: string;              // 1-2 sentence explanation
  recommendedMessage: string;            // Primary outreach message
  alternativeMessages: [string, string]; // Exactly 2 alternatives
  suggestedFollowUpTiming: FollowUpTiming; // When to follow up
  processingMetadata: ProcessingMetadata; // Processing information
}
```

## Enums

### SignalType

```typescript
enum SignalType {
  JOB_CHANGE = 'job_change',
  FUNDING_EVENT = 'funding_event',
  TECHNOLOGY_ADOPTION = 'technology_adoption',
  COMPANY_GROWTH = 'company_growth',
  INDUSTRY_TREND = 'industry_trend'
}
```

### ConfidenceLevel

```typescript
enum ConfidenceLevel {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}
```

### CompanySize

```typescript
enum CompanySize {
  STARTUP = 'startup',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  ENTERPRISE = 'enterprise'
}
```

### FollowUpTiming

```typescript
enum FollowUpTiming {
  IMMEDIATE = 'immediate',
  ONE_WEEK = 'one_week',
  TWO_WEEKS = 'two_weeks',
  ONE_MONTH = 'one_month'
}
```

## Utility Functions

### createAgent()

Convenience function to create a new agent instance.

```typescript
import { createAgent } from 'intent-driven-cold-outreach-agent';

const agent = createAgent({
  enableVerboseLogging: true,
  processingTimeout: 60000
});
```

### AgentUtils

Collection of utility functions for working with the agent.

```typescript
import { AgentUtils, SignalType, CompanySize } from 'intent-driven-cold-outreach-agent';

// Create prospect data
const prospect = AgentUtils.createProspectData(
  'John Smith',
  'john@techcorp.com',
  'VP Engineering',
  'TechCorp Inc',
  'Software',
  CompanySize.MEDIUM
);

// Create intent signal
const signal = AgentUtils.createIntentSignal(
  SignalType.FUNDING_EVENT,
  'Raised Series B funding',
  0.9,
  'TechCrunch',
  5 // 5 days ago
);

// Validate confidence level
if (AgentUtils.isValidConfidenceLevel('High')) {
  console.log('Valid confidence level');
}

// Get follow-up description
const description = AgentUtils.getFollowUpDescription(FollowUpTiming.ONE_WEEK);
console.log(description); // "Follow up in about one week"
```

## Error Handling

The agent returns detailed error information when processing fails:

```typescript
interface ProcessingError {
  code: string;                          // Error code
  message: string;                       // Human-readable message
  step: string;                          // Workflow step where error occurred
  context?: Record<string, unknown>;     // Additional error context
  remediation?: string;                  // Suggested remediation steps
}
```

### Common Error Codes

- `VALIDATION_FAILED`: Input validation failed
- `PROCESSING_TIMEOUT`: Processing exceeded timeout
- `SIGNAL_INTERPRETATION_ERROR`: Error interpreting intent signals
- `HYPOTHESIS_FORMATION_ERROR`: Error forming intent hypothesis
- `CONFIDENCE_SCORING_ERROR`: Error scoring confidence
- `STRATEGY_SELECTION_ERROR`: Error selecting message strategy
- `MESSAGE_GENERATION_ERROR`: Error generating message
- `AUTHENTICITY_FILTER_ERROR`: Error in authenticity filtering
- `OUTPUT_ASSEMBLY_ERROR`: Error assembling output

### Error Handling Example

```typescript
const result = await agent.processOutreachRequest(prospectData, intentSignals);

if ('code' in result) {
  switch (result.code) {
    case 'VALIDATION_FAILED':
      console.error('Input validation failed:', result.context?.errors);
      break;
    case 'PROCESSING_TIMEOUT':
      console.error('Processing took too long, try with simpler inputs');
      break;
    default:
      console.error('Processing error:', result.message);
      console.log('Suggested fix:', result.remediation);
  }
} else {
  // Success - use the result
  console.log('Success:', result.recommendedMessage);
}
```

## Advanced Usage

### Custom Configuration

```typescript
const agent = new IntentDrivenOutreachAgent({
  enableVerboseLogging: true,
  maxRevisionAttempts: 5,
  customBuzzwords: ['synergy', 'paradigm', 'leverage'],
  processingTimeout: 60000 // 1 minute
});
```

### Input Validation

```typescript
// Validate inputs before processing
const validation = agent.validateInputs(prospectData, intentSignals);

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
  console.warn('Validation warnings:', validation.warnings);
  return;
}

// Proceed with processing
const result = await agent.processOutreachRequest(prospectData, intentSignals);
```

### Health Monitoring

```typescript
const health = agent.getHealthStatus();
console.log('Agent status:', health.status);
console.log('Version:', health.version);
console.log('Configuration:', health.config);
```

## Best Practices

### Input Quality

1. **Provide complete prospect data**: Include role, company context, and contact details
2. **Use high-quality intent signals**: Ensure signals have accurate timestamps and relevance scores
3. **Include at least 2 intent signals**: The system requires minimum 2 signals for processing
4. **Use recent signals**: More recent signals (within 30 days) are weighted higher

### Signal Relevance Scoring

- **0.9-1.0**: Highly relevant, direct indicators of intent
- **0.7-0.8**: Moderately relevant, indirect indicators
- **0.5-0.6**: Somewhat relevant, contextual indicators
- **Below 0.5**: Low relevance, may reduce confidence

### Error Recovery

1. **Validate inputs first**: Use `validateInputs()` before processing
2. **Handle timeouts gracefully**: Increase timeout for complex scenarios
3. **Retry with simpler inputs**: If processing fails, try with fewer signals
4. **Monitor health status**: Check agent health periodically

### Performance Optimization

1. **Use appropriate timeouts**: Balance between thoroughness and responsiveness
2. **Cache agent instances**: Reuse agent instances for multiple requests
3. **Batch similar requests**: Process similar prospects together when possible
4. **Monitor processing times**: Use verbose logging to identify bottlenecks

## Examples

### Basic Example

```typescript
import { IntentDrivenOutreachAgent, AgentUtils, SignalType, CompanySize } from 'intent-driven-cold-outreach-agent';

const agent = new IntentDrivenOutreachAgent();

const prospect = AgentUtils.createProspectData(
  'Sarah Johnson',
  'sarah@innovate.com',
  'CTO',
  'Innovate Solutions',
  'Technology',
  CompanySize.STARTUP
);

const signals = [
  AgentUtils.createIntentSignal(
    SignalType.FUNDING_EVENT,
    'Completed seed funding round',
    0.95,
    'Crunchbase',
    3
  ),
  AgentUtils.createIntentSignal(
    SignalType.TECHNOLOGY_ADOPTION,
    'Posted about cloud migration challenges',
    0.8,
    'LinkedIn',
    1
  )
];

const result = await agent.processOutreachRequest(prospect, signals);

if ('code' in result) {
  console.error('Failed:', result.message);
} else {
  console.log('Message:', result.recommendedMessage);
  console.log('Confidence:', result.intentConfidence);
}
```

### Advanced Example with Error Handling

```typescript
import { 
  IntentDrivenOutreachAgent, 
  ProspectData, 
  IntentSignal, 
  SignalType, 
  CompanySize,
  ConfidenceLevel 
} from 'intent-driven-cold-outreach-agent';

class OutreachService {
  private agent: IntentDrivenOutreachAgent;

  constructor() {
    this.agent = new IntentDrivenOutreachAgent({
      enableVerboseLogging: process.env.NODE_ENV === 'development',
      processingTimeout: 45000,
      customBuzzwords: ['revolutionary', 'game-changer', 'disruptive']
    });
  }

  async generateOutreach(
    prospect: ProspectData, 
    signals: IntentSignal[]
  ): Promise<{
    success: boolean;
    message?: string;
    alternatives?: [string, string];
    confidence?: ConfidenceLevel;
    error?: string;
  }> {
    try {
      // Validate inputs first
      const validation = this.agent.validateInputs(prospect, signals);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      // Process the request
      const result = await this.agent.processOutreachRequest(prospect, signals);

      if ('code' in result) {
        return {
          success: false,
          error: `${result.code}: ${result.message}`
        };
      }

      return {
        success: true,
        message: result.recommendedMessage,
        alternatives: result.alternativeMessages,
        confidence: result.intentConfidence
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  getAgentHealth() {
    return this.agent.getHealthStatus();
  }
}

// Usage
const service = new OutreachService();
const result = await service.generateOutreach(prospectData, intentSignals);

if (result.success) {
  console.log('Generated message:', result.message);
} else {
  console.error('Generation failed:', result.error);
}
```

## Support

For issues, questions, or feature requests, please refer to the project documentation or contact the development team.