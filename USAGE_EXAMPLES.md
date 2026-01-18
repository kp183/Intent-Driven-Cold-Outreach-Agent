# Usage Examples - Intent-Driven Cold Outreach Agent

This document provides comprehensive examples of how to use the Intent-Driven Cold Outreach Agent in various scenarios.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Advanced Configuration](#advanced-configuration)
3. [Error Handling](#error-handling)
4. [Real-World Scenarios](#real-world-scenarios)
5. [Integration Patterns](#integration-patterns)
6. [Testing Examples](#testing-examples)

## Basic Usage

### Simple Outreach Generation

```typescript
import { 
  IntentDrivenOutreachAgent, 
  AgentUtils, 
  SignalType, 
  CompanySize 
} from 'intent-driven-cold-outreach-agent';

// Create agent
const agent = new IntentDrivenOutreachAgent();

// Create prospect data using utility function
const prospect = AgentUtils.createProspectData(
  'Alex Chen',
  'alex.chen@techstartup.com',
  'VP of Engineering',
  'TechStartup Inc',
  'Software Development',
  CompanySize.STARTUP
);

// Create intent signals
const signals = [
  AgentUtils.createIntentSignal(
    SignalType.FUNDING_EVENT,
    'Raised $5M Series A funding',
    0.9,
    'TechCrunch',
    7 // 7 days ago
  ),
  AgentUtils.createIntentSignal(
    SignalType.TECHNOLOGY_ADOPTION,
    'Mentioned scaling challenges on LinkedIn',
    0.8,
    'LinkedIn',
    2 // 2 days ago
  )
];

// Process the request
const result = await agent.processOutreachRequest(prospect, signals);

if ('code' in result) {
  console.error('Processing failed:', result.message);
} else {
  console.log('✅ Success!');
  console.log('Confidence:', result.intentConfidence);
  console.log('Message:', result.recommendedMessage);
  console.log('Alternatives:', result.alternativeMessages);
  console.log('Follow-up timing:', result.suggestedFollowUpTiming);
}
```

### Manual Data Creation

```typescript
import { 
  IntentDrivenOutreachAgent,
  ProspectData,
  IntentSignal,
  SignalType,
  CompanySize
} from 'intent-driven-cold-outreach-agent';

const agent = new IntentDrivenOutreachAgent();

// Manually create prospect data
const prospectData: ProspectData = {
  role: 'Chief Technology Officer',
  companyContext: {
    name: 'InnovateCorp',
    industry: 'Financial Technology',
    size: CompanySize.MEDIUM,
    recentEvents: ['Launched new mobile app', 'Expanded to European markets']
  },
  contactDetails: {
    name: 'Maria Rodriguez',
    email: 'maria.rodriguez@innovatecorp.com',
    linkedinUrl: 'https://linkedin.com/in/mariarodriguez'
  },
  additionalContext: {
    previousInteractions: 0,
    referralSource: 'conference_networking'
  }
};

// Manually create intent signals
const intentSignals: IntentSignal[] = [
  {
    type: SignalType.COMPANY_GROWTH,
    description: 'Company doubled engineering team size',
    timestamp: new Date('2024-01-10'),
    relevanceScore: 0.85,
    source: 'Company blog',
    metadata: {
      teamSizeBefore: 15,
      teamSizeAfter: 30
    }
  },
  {
    type: SignalType.TECHNOLOGY_ADOPTION,
    description: 'Migrating legacy systems to microservices',
    timestamp: new Date('2024-01-05'),
    relevanceScore: 0.9,
    source: 'Tech conference presentation'
  }
];

const result = await agent.processOutreachRequest(prospectData, intentSignals);
```

## Advanced Configuration

### Custom Agent Configuration

```typescript
import { IntentDrivenOutreachAgent } from 'intent-driven-cold-outreach-agent';

const agent = new IntentDrivenOutreachAgent({
  enableVerboseLogging: true,
  maxRevisionAttempts: 5,
  customBuzzwords: [
    'synergy', 'paradigm', 'leverage', 'disruptive', 
    'game-changer', 'revolutionary', 'cutting-edge'
  ],
  processingTimeout: 60000 // 1 minute timeout
});

// Update configuration later
agent.updateConfig({
  processingTimeout: 90000, // Increase timeout
  enableVerboseLogging: false
});

// Check current configuration
const config = agent.getConfig();
console.log('Current config:', config);
```

### Health Monitoring

```typescript
// Monitor agent health
const health = agent.getHealthStatus();
console.log('Agent Status:', health.status);
console.log('Version:', health.version);
console.log('Configuration:', health.config);

// In a production environment, you might check health periodically
setInterval(() => {
  const health = agent.getHealthStatus();
  if (health.status !== 'healthy') {
    console.warn('Agent health degraded:', health);
  }
}, 30000); // Check every 30 seconds
```

## Error Handling

### Comprehensive Error Handling

```typescript
import { 
  IntentDrivenOutreachAgent,
  ProcessingError,
  StructuredOutput
} from 'intent-driven-cold-outreach-agent';

async function processWithErrorHandling(
  agent: IntentDrivenOutreachAgent,
  prospectData: any,
  intentSignals: any[]
): Promise<StructuredOutput | null> {
  try {
    // First, validate inputs
    const validation = agent.validateInputs(prospectData, intentSignals);
    
    if (!validation.isValid) {
      console.error('❌ Input validation failed:');
      validation.errors.forEach(error => {
        console.error(`  - ${error.field}: ${error.message}`);
      });
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Warnings:');
        validation.warnings.forEach(warning => {
          console.warn(`  - ${warning.field}: ${warning.message} (${warning.impact} impact)`);
        });
      }
      return null;
    }

    // Process the request
    const result = await agent.processOutreachRequest(prospectData, intentSignals);

    if ('code' in result) {
      // Handle processing errors
      console.error(`❌ Processing failed at step: ${result.step}`);
      console.error(`Error code: ${result.code}`);
      console.error(`Message: ${result.message}`);
      
      if (result.remediation) {
        console.log(`💡 Suggested fix: ${result.remediation}`);
      }
      
      if (result.context) {
        console.log('Additional context:', result.context);
      }
      
      return null;
    }

    return result;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return null;
  }
}

// Usage
const result = await processWithErrorHandling(agent, prospectData, intentSignals);
if (result) {
  console.log('✅ Success:', result.recommendedMessage);
}
```

### Retry Logic

```typescript
async function processWithRetry(
  agent: IntentDrivenOutreachAgent,
  prospectData: any,
  intentSignals: any[],
  maxRetries: number = 3
): Promise<StructuredOutput | null> {
  let lastError: ProcessingError | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}`);
      
      const result = await agent.processOutreachRequest(prospectData, intentSignals);
      
      if ('code' in result) {
        lastError = result;
        
        // Don't retry validation errors
        if (result.code === 'VALIDATION_FAILED') {
          break;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        continue;
      }
      
      console.log(`✅ Success on attempt ${attempt}`);
      return result;
      
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
  
  console.error('❌ All retry attempts failed');
  if (lastError) {
    console.error('Last error:', lastError.message);
  }
  
  return null;
}
```

## Real-World Scenarios

### Scenario 1: SaaS Sales to Growing Startup

```typescript
import { AgentUtils, SignalType, CompanySize } from 'intent-driven-cold-outreach-agent';

// Target: Fast-growing startup that just raised funding
const prospect = AgentUtils.createProspectData(
  'David Kim',
  'david@growthstartup.io',
  'Head of Engineering',
  'GrowthStartup',
  'E-commerce',
  CompanySize.STARTUP
);

const signals = [
  AgentUtils.createIntentSignal(
    SignalType.FUNDING_EVENT,
    'Raised $10M Series A to scale engineering team',
    0.95,
    'VentureBeat',
    5
  ),
  AgentUtils.createIntentSignal(
    SignalType.COMPANY_GROWTH,
    'Posted 15 new engineering job openings',
    0.9,
    'Company careers page',
    3
  ),
  AgentUtils.createIntentSignal(
    SignalType.TECHNOLOGY_ADOPTION,
    'Mentioned infrastructure scaling challenges in podcast',
    0.85,
    'Tech podcast',
    10
  )
];

const result = await agent.processOutreachRequest(prospect, signals);
// Expected: High confidence, direct value alignment strategy
```

### Scenario 2: Enterprise Sales to Established Company

```typescript
// Target: Large enterprise with recent technology initiatives
const enterpriseProspect = AgentUtils.createProspectData(
  'Jennifer Walsh',
  'j.walsh@megacorp.com',
  'VP of Digital Transformation',
  'MegaCorp Industries',
  'Manufacturing',
  CompanySize.ENTERPRISE
);

const enterpriseSignals = [
  AgentUtils.createIntentSignal(
    SignalType.TECHNOLOGY_ADOPTION,
    'Announced digital transformation initiative',
    0.8,
    'Company press release',
    20
  ),
  AgentUtils.createIntentSignal(
    SignalType.INDUSTRY_TREND,
    'Industry report mentions need for automation',
    0.6,
    'Industry analysis',
    30
  )
];

const result = await agent.processOutreachRequest(enterpriseProspect, enterpriseSignals);
// Expected: Medium confidence, insight-led observation strategy
```

### Scenario 3: Weak Signals - Conservative Approach

```typescript
// Target: Prospect with limited, weak signals
const uncertainProspect = AgentUtils.createProspectData(
  'Robert Chen',
  'robert@stablecorp.com',
  'IT Director',
  'StableCorp',
  'Healthcare',
  CompanySize.LARGE
);

const weakSignals = [
  AgentUtils.createIntentSignal(
    SignalType.INDUSTRY_TREND,
    'Healthcare industry moving toward cloud solutions',
    0.4,
    'Industry report',
    60
  ),
  AgentUtils.createIntentSignal(
    SignalType.COMPANY_GROWTH,
    'Company mentioned in healthcare innovation list',
    0.3,
    'Industry publication',
    90
  )
];

const result = await agent.processOutreachRequest(uncertainProspect, weakSignals);
// Expected: Low confidence, soft curiosity strategy
```

## Integration Patterns

### Express.js API Integration

```typescript
import express from 'express';
import { IntentDrivenOutreachAgent, ProspectData, IntentSignal } from 'intent-driven-cold-outreach-agent';

const app = express();
app.use(express.json());

const agent = new IntentDrivenOutreachAgent({
  enableVerboseLogging: process.env.NODE_ENV === 'development',
  processingTimeout: 30000
});

app.post('/api/outreach/generate', async (req, res) => {
  try {
    const { prospectData, intentSignals }: {
      prospectData: ProspectData;
      intentSignals: IntentSignal[];
    } = req.body;

    // Validate inputs
    const validation = agent.validateInputs(prospectData, intentSignals);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    // Process request
    const result = await agent.processOutreachRequest(prospectData, intentSignals);

    if ('code' in result) {
      return res.status(500).json({
        error: 'Processing failed',
        code: result.code,
        message: result.message,
        remediation: result.remediation
      });
    }

    res.json({
      success: true,
      data: {
        confidence: result.intentConfidence,
        message: result.recommendedMessage,
        alternatives: result.alternativeMessages,
        followUpTiming: result.suggestedFollowUpTiming,
        reasoning: result.reasoningSummary
      }
    });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/outreach/health', (req, res) => {
  const health = agent.getHealthStatus();
  res.json(health);
});

app.listen(3000, () => {
  console.log('Outreach API server running on port 3000');
});
```

### Batch Processing

```typescript
import { IntentDrivenOutreachAgent, ProspectData, IntentSignal } from 'intent-driven-cold-outreach-agent';

class BatchOutreachProcessor {
  private agent: IntentDrivenOutreachAgent;
  private concurrencyLimit: number;

  constructor(concurrencyLimit: number = 5) {
    this.agent = new IntentDrivenOutreachAgent({
      processingTimeout: 45000
    });
    this.concurrencyLimit = concurrencyLimit;
  }

  async processBatch(requests: Array<{
    id: string;
    prospectData: ProspectData;
    intentSignals: IntentSignal[];
  }>) {
    const results = [];
    
    // Process in chunks to respect concurrency limit
    for (let i = 0; i < requests.length; i += this.concurrencyLimit) {
      const chunk = requests.slice(i, i + this.concurrencyLimit);
      
      const chunkPromises = chunk.map(async (request) => {
        try {
          const result = await this.agent.processOutreachRequest(
            request.prospectData,
            request.intentSignals
          );
          
          return {
            id: request.id,
            success: !('code' in result),
            result
          };
        } catch (error) {
          return {
            id: request.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
      
      // Log progress
      console.log(`Processed ${Math.min(i + this.concurrencyLimit, requests.length)}/${requests.length} requests`);
    }
    
    return results;
  }
}

// Usage
const processor = new BatchOutreachProcessor(3); // Process 3 at a time

const batchRequests = [
  { id: 'req1', prospectData: prospect1, intentSignals: signals1 },
  { id: 'req2', prospectData: prospect2, intentSignals: signals2 },
  // ... more requests
];

const results = await processor.processBatch(batchRequests);

// Analyze results
const successful = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

console.log(`✅ Successful: ${successful.length}`);
console.log(`❌ Failed: ${failed.length}`);
```

### Database Integration

```typescript
import { IntentDrivenOutreachAgent } from 'intent-driven-cold-outreach-agent';

class OutreachService {
  private agent: IntentDrivenOutreachAgent;
  private db: any; // Your database connection

  constructor(db: any) {
    this.agent = new IntentDrivenOutreachAgent();
    this.db = db;
  }

  async generateAndSaveOutreach(prospectId: string) {
    try {
      // Fetch prospect data from database
      const prospect = await this.db.prospects.findById(prospectId);
      const signals = await this.db.intentSignals.findByProspectId(prospectId);

      if (!prospect || signals.length < 2) {
        throw new Error('Insufficient data for outreach generation');
      }

      // Generate outreach
      const result = await this.agent.processOutreachRequest(
        prospect.data,
        signals.map(s => s.data)
      );

      if ('code' in result) {
        // Save error to database
        await this.db.outreachAttempts.create({
          prospectId,
          status: 'failed',
          error: result.message,
          errorCode: result.code,
          timestamp: new Date()
        });
        throw new Error(`Outreach generation failed: ${result.message}`);
      }

      // Save successful result
      const outreachRecord = await this.db.outreachAttempts.create({
        prospectId,
        status: 'success',
        confidence: result.intentConfidence,
        message: result.recommendedMessage,
        alternatives: result.alternativeMessages,
        followUpTiming: result.suggestedFollowUpTiming,
        reasoning: result.reasoningSummary,
        processingTime: result.processingMetadata.executionTime,
        timestamp: new Date()
      });

      return outreachRecord;

    } catch (error) {
      console.error(`Failed to generate outreach for prospect ${prospectId}:`, error);
      throw error;
    }
  }
}
```

## Testing Examples

### Unit Testing with Jest

```typescript
import { IntentDrivenOutreachAgent, AgentUtils, SignalType, CompanySize } from 'intent-driven-cold-outreach-agent';

describe('IntentDrivenOutreachAgent', () => {
  let agent: IntentDrivenOutreachAgent;

  beforeEach(() => {
    agent = new IntentDrivenOutreachAgent({
      processingTimeout: 10000 // Shorter timeout for tests
    });
  });

  test('should generate high confidence outreach for strong signals', async () => {
    const prospect = AgentUtils.createProspectData(
      'Test User',
      'test@example.com',
      'CTO',
      'Test Company',
      'Technology',
      CompanySize.STARTUP
    );

    const signals = [
      AgentUtils.createIntentSignal(SignalType.FUNDING_EVENT, 'Raised funding', 0.9, 'Source', 1),
      AgentUtils.createIntentSignal(SignalType.COMPANY_GROWTH, 'Hiring engineers', 0.85, 'Source', 2)
    ];

    const result = await agent.processOutreachRequest(prospect, signals);

    expect('code' in result).toBe(false);
    if (!('code' in result)) {
      expect(result.intentConfidence).toBe('High');
      expect(result.recommendedMessage).toBeTruthy();
      expect(result.alternativeMessages).toHaveLength(2);
    }
  });

  test('should handle validation errors gracefully', async () => {
    const invalidProspect = {
      role: '', // Invalid: empty role
      companyContext: {
        name: 'Test Company',
        industry: 'Technology',
        size: CompanySize.STARTUP
      },
      contactDetails: {
        name: 'Test User',
        email: 'invalid-email' // Invalid email format
      }
    };

    const signals = []; // Invalid: no signals

    const result = await agent.processOutreachRequest(invalidProspect as any, signals);

    expect('code' in result).toBe(true);
    if ('code' in result) {
      expect(result.code).toBe('VALIDATION_FAILED');
      expect(result.message).toContain('validation failed');
    }
  });

  test('should respect processing timeout', async () => {
    const shortTimeoutAgent = new IntentDrivenOutreachAgent({
      processingTimeout: 1 // Very short timeout
    });

    const prospect = AgentUtils.createProspectData(
      'Test User',
      'test@example.com',
      'CTO',
      'Test Company',
      'Technology',
      CompanySize.STARTUP
    );

    const signals = [
      AgentUtils.createIntentSignal(SignalType.FUNDING_EVENT, 'Test signal', 0.8, 'Source', 1),
      AgentUtils.createIntentSignal(SignalType.COMPANY_GROWTH, 'Test signal 2', 0.7, 'Source', 2)
    ];

    const result = await shortTimeoutAgent.processOutreachRequest(prospect, signals);

    expect('code' in result).toBe(true);
    if ('code' in result) {
      expect(result.code).toBe('PROCESSING_TIMEOUT');
    }
  });
});
```

### Integration Testing

```typescript
describe('Integration Tests', () => {
  test('end-to-end workflow with real-world data', async () => {
    const agent = new IntentDrivenOutreachAgent({
      enableVerboseLogging: true
    });

    // Real-world scenario data
    const prospect = {
      role: 'VP of Engineering',
      companyContext: {
        name: 'FastGrow Tech',
        industry: 'SaaS',
        size: CompanySize.MEDIUM,
        recentEvents: ['Launched new product line', 'Expanded to EMEA']
      },
      contactDetails: {
        name: 'Alice Johnson',
        email: 'alice.johnson@fastgrow.tech',
        linkedinUrl: 'https://linkedin.com/in/alicejohnson'
      }
    };

    const signals = [
      {
        type: SignalType.FUNDING_EVENT,
        description: 'Completed $25M Series B funding round',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        relevanceScore: 0.92,
        source: 'TechCrunch'
      },
      {
        type: SignalType.COMPANY_GROWTH,
        description: 'Engineering team grew from 20 to 35 people',
        timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        relevanceScore: 0.88,
        source: 'LinkedIn'
      },
      {
        type: SignalType.TECHNOLOGY_ADOPTION,
        description: 'Migrating from monolith to microservices architecture',
        timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 days ago
        relevanceScore: 0.85,
        source: 'Engineering blog'
      }
    ];

    const result = await agent.processOutreachRequest(prospect, signals);

    // Assertions
    expect('code' in result).toBe(false);
    
    if (!('code' in result)) {
      expect(result.intentConfidence).toBe('High');
      expect(result.recommendedMessage.length).toBeGreaterThan(50);
      expect(result.recommendedMessage.length).toBeLessThanOrEqual(120 * 6); // Rough word count
      expect(result.alternativeMessages).toHaveLength(2);
      expect(result.suggestedFollowUpTiming).toBeTruthy();
      expect(result.processingMetadata.executionTime).toBeGreaterThan(0);
      expect(result.processingMetadata.workflowSteps.length).toBeGreaterThan(0);
    }
  });
});
```

This comprehensive set of examples demonstrates the flexibility and robustness of the Intent-Driven Cold Outreach Agent across various use cases, from simple implementations to complex production integrations.