# Testing Guide: Intent-Driven Cold Outreach Agent

This guide shows you how to test the Intent-Driven Cold Outreach Agent yourself to confirm it's working correctly.

## Quick Test Commands

### 1. Run All Tests
```bash
npm test
```
This runs all 116 tests including 36 property-based tests. You should see:
- ✅ 116 tests passing
- ✅ All test suites passing
- ✅ No failures or errors

### 2. Run Specific Test Categories
```bash
# Test confidence scoring
npm test -- --testPathPattern="confidence-scorer"

# Test message generation
npm test -- --testPathPattern="message-generator"

# Test integration scenarios
npm test -- --testPathPattern="integration"

# Test property-based tests only
npm test -- --testPathPattern="property.test"
```

## Manual Testing Examples

### Example 1: High Confidence Scenario
Create a file `test-high-confidence.js`:

```javascript
const { IntentDrivenOutreachAgent, AgentUtils, SignalType, CompanySize } = require('./dist');

async function testHighConfidence() {
  const agent = new IntentDrivenOutreachAgent({
    enableVerboseLogging: true
  });

  // Strong, recent signals
  const prospect = AgentUtils.createProspectData(
    'Sarah Johnson',
    'sarah@techcorp.com',
    'VP of Engineering',
    'TechCorp Solutions',
    'Software',
    CompanySize.MEDIUM
  );

  const signals = [
    AgentUtils.createIntentSignal(
      SignalType.FUNDING_EVENT,
      'Company raised $10M Series B funding',
      0.95,
      'TechCrunch',
      5 // 5 days ago
    ),
    AgentUtils.createIntentSignal(
      SignalType.JOB_CHANGE,
      'New VP of Engineering hired to scale team',
      0.9,
      'LinkedIn',
      3 // 3 days ago
    )
  ];

  console.log('Testing HIGH confidence scenario...');
  const result = await agent.processOutreachRequest(prospect, signals);

  if ('code' in result) {
    console.error('❌ Test failed:', result.message);
    return false;
  }

  console.log('✅ Result:', {
    confidence: result.intentConfidence,
    messageLength: result.recommendedMessage.length,
    hasAlternatives: result.alternativeMessages.length === 2,
    followUpTiming: result.suggestedFollowUpTiming
  });

  // Verify expectations
  const success = result.intentConfidence === 'High' && 
                  result.recommendedMessage.length <= 600 && // 120 words ≈ 600 chars
                  result.alternativeMessages.length === 2;

  console.log(success ? '✅ HIGH confidence test PASSED' : '❌ HIGH confidence test FAILED');
  return success;
}

testHighConfidence().catch(console.error);
```

### Example 2: Medium Confidence Scenario
Create a file `test-medium-confidence.js`:

```javascript
const { IntentDrivenOutreachAgent, AgentUtils, SignalType, CompanySize } = require('./dist');

async function testMediumConfidence() {
  const agent = new IntentDrivenOutreachAgent();

  // Mixed signal strength
  const prospect = AgentUtils.createProspectData(
    'Mike Chen',
    'mike@startup.io',
    'CTO',
    'Startup Inc',
    'Technology',
    CompanySize.STARTUP
  );

  const signals = [
    AgentUtils.createIntentSignal(
      SignalType.TECHNOLOGY_ADOPTION,
      'Posted about cloud migration challenges',
      0.6,
      'LinkedIn',
      15 // 15 days ago
    ),
    AgentUtils.createIntentSignal(
      SignalType.INDUSTRY_TREND,
      'Industry moving towards microservices',
      0.5,
      'Industry Report',
      30 // 30 days ago
    )
  ];

  console.log('Testing MEDIUM confidence scenario...');
  const result = await agent.processOutreachRequest(prospect, signals);

  if ('code' in result) {
    console.error('❌ Test failed:', result.message);
    return false;
  }

  console.log('✅ Result:', {
    confidence: result.intentConfidence,
    messageLength: result.recommendedMessage.length,
    hasAlternatives: result.alternativeMessages.length === 2
  });

  const success = result.intentConfidence === 'Medium';
  console.log(success ? '✅ MEDIUM confidence test PASSED' : '❌ MEDIUM confidence test FAILED');
  return success;
}

testMediumConfidence().catch(console.error);
```

### Example 3: Low Confidence Scenario
Create a file `test-low-confidence.js`:

```javascript
const { IntentDrivenOutreachAgent, AgentUtils, SignalType, CompanySize } = require('./dist');

async function testLowConfidence() {
  const agent = new IntentDrivenOutreachAgent();

  // Weak, old signals
  const prospect = AgentUtils.createProspectData(
    'Jane Doe',
    'jane@company.com',
    'Manager',
    'Generic Company',
    'Business',
    CompanySize.SMALL
  );

  const signals = [
    AgentUtils.createIntentSignal(
      SignalType.INDUSTRY_TREND,
      'General industry activity',
      0.2,
      'News',
      90 // 90 days ago
    ),
    AgentUtils.createIntentSignal(
      SignalType.COMPANY_GROWTH,
      'Some company updates',
      0.3,
      'Website',
      60 // 60 days ago
    )
  ];

  console.log('Testing LOW confidence scenario...');
  const result = await agent.processOutreachRequest(prospect, signals);

  if ('code' in result) {
    console.error('❌ Test failed:', result.message);
    return false;
  }

  console.log('✅ Result:', {
    confidence: result.intentConfidence,
    messageLength: result.recommendedMessage.length,
    hasAlternatives: result.alternativeMessages.length === 2
  });

  const success = result.intentConfidence === 'Low';
  console.log(success ? '✅ LOW confidence test PASSED' : '❌ LOW confidence test FAILED');
  return success;
}

testLowConfidence().catch(console.error);
```

### Example 4: Error Handling Test
Create a file `test-error-handling.js`:

```javascript
const { IntentDrivenOutreachAgent } = require('./dist');

async function testErrorHandling() {
  const agent = new IntentDrivenOutreachAgent();

  console.log('Testing error handling...');

  // Test with invalid input (missing required fields)
  const invalidProspect = {
    role: '', // Empty role should fail validation
    companyContext: {
      name: 'Test Company',
      industry: 'Tech',
      size: 'medium'
    },
    contactDetails: {
      name: 'Test User',
      email: 'invalid-email' // Invalid email format
    }
  };

  const signals = []; // Empty signals should fail validation

  const result = await agent.processOutreachRequest(invalidProspect, signals);

  if ('code' in result) {
    console.log('✅ Error handling working correctly:', result.code);
    console.log('✅ Error message:', result.message);
    console.log('✅ Remediation:', result.remediation);
    return true;
  } else {
    console.log('❌ Error handling test FAILED - should have returned error');
    return false;
  }
}

testErrorHandling().catch(console.error);
```

## Comprehensive Test Suite

Create a file `run-all-manual-tests.js`:

```javascript
const { IntentDrivenOutreachAgent, AgentUtils, SignalType, CompanySize } = require('./dist');

async function runAllTests() {
  console.log('🚀 Starting comprehensive manual tests...\n');

  const tests = [
    testHighConfidence,
    testMediumConfidence, 
    testLowConfidence,
    testErrorHandling,
    testPerformance,
    testMessageQuality
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Test ${test.name} threw error:`, error.message);
      failed++;
    }
    console.log(''); // Add spacing between tests
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '🎉 All manual tests PASSED!' : '⚠️  Some tests FAILED');

  return failed === 0;
}

async function testHighConfidence() {
  console.log('🔍 Testing HIGH confidence scenario...');
  const agent = new IntentDrivenOutreachAgent();

  const prospect = AgentUtils.createProspectData(
    'Sarah Johnson', 'sarah@techcorp.com', 'VP of Engineering',
    'TechCorp Solutions', 'Software', CompanySize.MEDIUM
  );

  const signals = [
    AgentUtils.createIntentSignal(SignalType.FUNDING_EVENT, 'Raised $10M Series B', 0.95, 'TechCrunch', 5),
    AgentUtils.createIntentSignal(SignalType.JOB_CHANGE, 'New VP hired to scale team', 0.9, 'LinkedIn', 3)
  ];

  const result = await agent.processOutreachRequest(prospect, signals);
  
  if ('code' in result) {
    console.log('❌ HIGH confidence test failed:', result.message);
    return false;
  }

  const success = result.intentConfidence === 'High';
  console.log(success ? '✅ HIGH confidence test PASSED' : '❌ HIGH confidence test FAILED');
  console.log(`   Confidence: ${result.intentConfidence}, Message length: ${result.recommendedMessage.length}`);
  return success;
}

async function testMediumConfidence() {
  console.log('🔍 Testing MEDIUM confidence scenario...');
  const agent = new IntentDrivenOutreachAgent();

  const prospect = AgentUtils.createProspectData(
    'Mike Chen', 'mike@startup.io', 'CTO',
    'Startup Inc', 'Technology', CompanySize.STARTUP
  );

  const signals = [
    AgentUtils.createIntentSignal(SignalType.TECHNOLOGY_ADOPTION, 'Cloud migration challenges', 0.6, 'LinkedIn', 15),
    AgentUtils.createIntentSignal(SignalType.INDUSTRY_TREND, 'Microservices adoption', 0.5, 'Report', 30)
  ];

  const result = await agent.processOutreachRequest(prospect, signals);
  
  if ('code' in result) {
    console.log('❌ MEDIUM confidence test failed:', result.message);
    return false;
  }

  const success = result.intentConfidence === 'Medium';
  console.log(success ? '✅ MEDIUM confidence test PASSED' : '❌ MEDIUM confidence test FAILED');
  console.log(`   Confidence: ${result.intentConfidence}, Message length: ${result.recommendedMessage.length}`);
  return success;
}

async function testLowConfidence() {
  console.log('🔍 Testing LOW confidence scenario...');
  const agent = new IntentDrivenOutreachAgent();

  const prospect = AgentUtils.createProspectData(
    'Jane Doe', 'jane@company.com', 'Manager',
    'Generic Company', 'Business', CompanySize.SMALL
  );

  const signals = [
    AgentUtils.createIntentSignal(SignalType.INDUSTRY_TREND, 'General activity', 0.2, 'News', 90),
    AgentUtils.createIntentSignal(SignalType.COMPANY_GROWTH, 'Some updates', 0.3, 'Website', 60)
  ];

  const result = await agent.processOutreachRequest(prospect, signals);
  
  if ('code' in result) {
    console.log('❌ LOW confidence test failed:', result.message);
    return false;
  }

  const success = result.intentConfidence === 'Low';
  console.log(success ? '✅ LOW confidence test PASSED' : '❌ LOW confidence test FAILED');
  console.log(`   Confidence: ${result.intentConfidence}, Message length: ${result.recommendedMessage.length}`);
  return success;
}

async function testErrorHandling() {
  console.log('🔍 Testing error handling...');
  const agent = new IntentDrivenOutreachAgent();

  const invalidProspect = {
    role: '', // Invalid empty role
    companyContext: { name: 'Test', industry: 'Tech', size: 'medium' },
    contactDetails: { name: 'Test', email: 'invalid-email' }
  };

  const result = await agent.processOutreachRequest(invalidProspect, []);

  if ('code' in result) {
    console.log('✅ Error handling test PASSED');
    console.log(`   Error code: ${result.code}, Message: ${result.message}`);
    return true;
  } else {
    console.log('❌ Error handling test FAILED - should have returned error');
    return false;
  }
}

async function testPerformance() {
  console.log('🔍 Testing performance...');
  const agent = new IntentDrivenOutreachAgent();

  const prospect = AgentUtils.createProspectData(
    'Test User', 'test@example.com', 'Developer',
    'Test Company', 'Tech', CompanySize.SMALL
  );

  const signals = [
    AgentUtils.createIntentSignal(SignalType.FUNDING_EVENT, 'Funding event', 0.8, 'Source', 10),
    AgentUtils.createIntentSignal(SignalType.TECHNOLOGY_ADOPTION, 'Tech adoption', 0.7, 'Source', 15)
  ];

  const startTime = Date.now();
  const result = await agent.processOutreachRequest(prospect, signals);
  const processingTime = Date.now() - startTime;

  if ('code' in result) {
    console.log('❌ Performance test failed:', result.message);
    return false;
  }

  const success = processingTime < 5000; // Should complete in under 5 seconds
  console.log(success ? '✅ Performance test PASSED' : '❌ Performance test FAILED');
  console.log(`   Processing time: ${processingTime}ms`);
  return success;
}

async function testMessageQuality() {
  console.log('🔍 Testing message quality...');
  const agent = new IntentDrivenOutreachAgent();

  const prospect = AgentUtils.createProspectData(
    'Alex Smith', 'alex@company.com', 'Engineering Manager',
    'Innovation Corp', 'Technology', CompanySize.MEDIUM
  );

  const signals = [
    AgentUtils.createIntentSignal(SignalType.FUNDING_EVENT, 'Series A funding completed', 0.9, 'News', 7),
    AgentUtils.createIntentSignal(SignalType.TECHNOLOGY_ADOPTION, 'Adopting new tech stack', 0.8, 'Blog', 12)
  ];

  const result = await agent.processOutreachRequest(prospect, signals);

  if ('code' in result) {
    console.log('❌ Message quality test failed:', result.message);
    return false;
  }

  // Check message quality criteria
  const message = result.recommendedMessage;
  const wordCount = message.split(/\s+/).length;
  const hasPersonalization = message.includes('Alex') || message.includes('Innovation Corp');
  const hasRelevantContent = message.toLowerCase().includes('funding') || message.toLowerCase().includes('technology');
  const hasAlternatives = result.alternativeMessages.length === 2;

  const success = wordCount <= 120 && hasPersonalization && hasRelevantContent && hasAlternatives;
  
  console.log(success ? '✅ Message quality test PASSED' : '❌ Message quality test FAILED');
  console.log(`   Word count: ${wordCount}/120, Personalized: ${hasPersonalization}, Relevant: ${hasRelevantContent}, Alternatives: ${hasAlternatives}`);
  
  return success;
}

// Run all tests
runAllTests().catch(console.error);
```

## How to Run These Tests

1. **Build the project first:**
   ```bash
   npm run build
   ```

2. **Run individual test files:**
   ```bash
   node test-high-confidence.js
   node test-medium-confidence.js
   node test-low-confidence.js
   node test-error-handling.js
   ```

3. **Run comprehensive test suite:**
   ```bash
   node run-all-manual-tests.js
   ```

4. **Run automated tests:**
   ```bash
   npm test
   ```

## What to Look For

### ✅ Success Indicators:
- All automated tests pass (116/116)
- High confidence scenarios return "High" confidence
- Medium confidence scenarios return "Medium" confidence  
- Low confidence scenarios return "Low" confidence
- Messages are under 120 words
- All outputs include exactly 2 alternative messages
- Error handling works for invalid inputs
- Processing completes in reasonable time (< 5 seconds)

### ❌ Failure Indicators:
- Any automated tests fail
- Wrong confidence levels returned
- Messages exceed 120 words
- Missing alternative messages
- Errors not handled properly
- Processing takes too long
- System crashes or throws unhandled errors

## Troubleshooting

If tests fail:

1. **Check Node.js version:** Ensure you're using Node.js 16+ 
2. **Reinstall dependencies:** `npm install`
3. **Rebuild project:** `npm run build`
4. **Check for TypeScript errors:** `npm run type-check`
5. **Run tests in verbose mode:** `npm test -- --verbose`

The system is working correctly if all tests pass and manual testing confirms expected behavior across different confidence scenarios.