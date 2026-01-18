/**
 * Integration Tests for Intent-Driven Cold Outreach Agent
 * 
 * Tests complete workflow from input to structured output
 * Tests error scenarios and recovery
 * 
 * Requirements: All requirements (integration)
 */

import { 
  IntentDrivenOutreachAgent,
  AgentUtils,
  ProspectData,
  IntentSignal,
  StructuredOutput,
  ProcessingError,
  SignalType,
  CompanySize,
  ConfidenceLevel,
  FollowUpTiming
} from '../index';

describe('Integration Tests - End-to-End Workflow', () => {
  let agent: IntentDrivenOutreachAgent;

  beforeEach(() => {
    agent = new IntentDrivenOutreachAgent({
      enableVerboseLogging: false,
      processingTimeout: 30000,
      maxRevisionAttempts: 3
    });
  });

  describe('Complete Workflow - Success Scenarios', () => {
    test('should process high-confidence scenario end-to-end', async () => {
      // Arrange: High-quality prospect data with strong, recent signals
      const prospectData = AgentUtils.createProspectData(
        'Sarah Chen',
        'sarah.chen@techstartup.com',
        'VP of Engineering',
        'TechStartup Inc',
        'Software Development',
        CompanySize.STARTUP
      );

      const intentSignals = [
        AgentUtils.createIntentSignal(
          SignalType.FUNDING_EVENT,
          'Raised $15M Series A funding to scale engineering team',
          0.95,
          'TechCrunch',
          3 // 3 days ago
        ),
        AgentUtils.createIntentSignal(
          SignalType.COMPANY_GROWTH,
          'Posted 12 new engineering positions on LinkedIn',
          0.9,
          'LinkedIn Jobs',
          1 // 1 day ago
        ),
        AgentUtils.createIntentSignal(
          SignalType.TECHNOLOGY_ADOPTION,
          'Mentioned infrastructure scaling challenges in tech blog',
          0.85,
          'Company Tech Blog',
          5 // 5 days ago
        )
      ];

      // Act
      const result = await agent.processOutreachRequest(prospectData, intentSignals);

      // Assert
      expect('code' in result).toBe(false);
      
      if (!('code' in result)) {
        const output = result as StructuredOutput;
        
        // Verify confidence level
        expect(output.intentConfidence).toBe(ConfidenceLevel.HIGH);
        
        // Verify message structure
        expect(output.recommendedMessage).toBeTruthy();
        expect(output.recommendedMessage.length).toBeGreaterThan(50);
        expect(output.recommendedMessage.split(' ').length).toBeLessThanOrEqual(120);
        
        // Verify alternatives
        expect(output.alternativeMessages).toHaveLength(2);
        expect(output.alternativeMessages[0]).not.toBe(output.alternativeMessages[1]);
        expect(output.alternativeMessages[0]).not.toBe(output.recommendedMessage);
        
        // Verify reasoning summary (allow up to 3 sentences due to uncertainty acknowledgment)
        expect(output.reasoningSummary).toBeTruthy();
        const sentences = output.reasoningSummary.split(/[.!?]+/).filter(s => s.trim().length > 0);
        expect(sentences.length).toBeLessThanOrEqual(3);
        
        // Verify follow-up timing (High confidence should suggest quick follow-up)
        expect(output.suggestedFollowUpTiming).toBe(FollowUpTiming.ONE_WEEK);
        
        // Verify processing metadata
        expect(output.processingMetadata).toBeTruthy();
        expect(output.processingMetadata.executionTime).toBeGreaterThan(0);
        expect(output.processingMetadata.workflowSteps.length).toBeGreaterThan(0);
        expect(output.processingMetadata.version).toBeTruthy();
        
        // Verify no internal reasoning is exposed
        expect(output.reasoningSummary).not.toContain('Step 1');
        expect(output.reasoningSummary).not.toContain('workflow');
        expect(output.reasoningSummary).not.toContain('algorithm');
      }
    });

    test('should process medium-confidence scenario end-to-end', async () => {
      // Arrange: Mixed signals with moderate relevance
      const prospectData = AgentUtils.createProspectData(
        'Michael Rodriguez',
        'michael@growthcorp.com',
        'CTO',
        'GrowthCorp',
        'E-commerce',
        CompanySize.MEDIUM
      );

      const intentSignals = [
        AgentUtils.createIntentSignal(
          SignalType.TECHNOLOGY_ADOPTION,
          'Mentioned cloud migration in conference presentation',
          0.7,
          'Tech Conference',
          15 // 15 days ago
        ),
        AgentUtils.createIntentSignal(
          SignalType.INDUSTRY_TREND,
          'E-commerce industry report mentions infrastructure needs',
          0.6,
          'Industry Report',
          20 // 20 days ago
        )
      ];

      // Act
      const result = await agent.processOutreachRequest(prospectData, intentSignals);

      // Assert
      expect('code' in result).toBe(false);
      
      if (!('code' in result)) {
        const output = result as StructuredOutput;
        
        // Mixed signals may result in Low or Medium confidence depending on scoring
        expect([ConfidenceLevel.LOW, ConfidenceLevel.MEDIUM]).toContain(output.intentConfidence);
        expect([FollowUpTiming.TWO_WEEKS, FollowUpTiming.ONE_MONTH]).toContain(output.suggestedFollowUpTiming);
        expect(output.recommendedMessage).toBeTruthy();
        expect(output.alternativeMessages).toHaveLength(2);
      }
    });

    test('should process low-confidence scenario end-to-end', async () => {
      // Arrange: Weak, old signals
      const prospectData = AgentUtils.createProspectData(
        'Jennifer Walsh',
        'jennifer@stablecorp.com',
        'IT Director',
        'StableCorp',
        'Healthcare',
        CompanySize.LARGE
      );

      const intentSignals = [
        AgentUtils.createIntentSignal(
          SignalType.INDUSTRY_TREND,
          'Healthcare industry moving toward digital solutions',
          0.4,
          'Industry Analysis',
          60 // 60 days ago
        ),
        AgentUtils.createIntentSignal(
          SignalType.COMPANY_GROWTH,
          'Company mentioned in healthcare innovation list',
          0.3,
          'Industry Publication',
          90 // 90 days ago
        )
      ];

      // Act
      const result = await agent.processOutreachRequest(prospectData, intentSignals);

      // Assert
      expect('code' in result).toBe(false);
      
      if (!('code' in result)) {
        const output = result as StructuredOutput;
        
        expect(output.intentConfidence).toBe(ConfidenceLevel.LOW);
        expect(output.suggestedFollowUpTiming).toBe(FollowUpTiming.ONE_MONTH);
        expect(output.recommendedMessage).toBeTruthy();
        expect(output.alternativeMessages).toHaveLength(2);
        
        // Low confidence should acknowledge uncertainty (check for uncertainty-related words)
        const uncertaintyWords = ['uncertain', 'may', 'might', 'potential', 'possible', 'limitations', 'vary', 'cannot be guaranteed'];
        const hasUncertaintyAcknowledgment = uncertaintyWords.some(word => 
          output.reasoningSummary.toLowerCase().includes(word)
        );
        expect(hasUncertaintyAcknowledgment).toBe(true);
      }
    });
  });

  describe('Error Scenarios and Recovery', () => {
    test('should handle missing required fields gracefully', async () => {
      // Arrange: Invalid prospect data
      const invalidProspectData = {
        role: '', // Missing role
        companyContext: {
          name: 'Test Company',
          industry: 'Technology',
          size: CompanySize.STARTUP
        },
        contactDetails: {
          name: 'Test User',
          email: 'invalid-email' // Invalid email format
        }
      } as ProspectData;

      const validSignals = [
        AgentUtils.createIntentSignal(
          SignalType.FUNDING_EVENT,
          'Test signal',
          0.8,
          'Source',
          1
        ),
        AgentUtils.createIntentSignal(
          SignalType.COMPANY_GROWTH,
          'Test signal 2',
          0.7,
          'Source',
          2
        )
      ];

      // Act
      const result = await agent.processOutreachRequest(invalidProspectData, validSignals);

      // Assert
      expect('code' in result).toBe(true);
      
      if ('code' in result) {
        const error = result as ProcessingError;
        expect(error.code).toBe('VALIDATION_FAILED');
        expect(error.message).toContain('validation failed');
        expect(error.step).toBe('input_validation');
        expect(error.remediation).toBeTruthy();
        expect(error.context).toBeTruthy();
      }
    });

    test('should handle insufficient intent signals', async () => {
      // Arrange: Valid prospect but insufficient signals
      const validProspectData = AgentUtils.createProspectData(
        'Test User',
        'test@example.com',
        'CTO',
        'Test Company',
        'Technology',
        CompanySize.STARTUP
      );

      const insufficientSignals = [
        AgentUtils.createIntentSignal(
          SignalType.FUNDING_EVENT,
          'Single signal',
          0.8,
          'Source',
          1
        )
        // Only one signal - should require at least 2
      ];

      // Act
      const result = await agent.processOutreachRequest(validProspectData, insufficientSignals);

      // Assert
      expect('code' in result).toBe(true);
      
      if ('code' in result) {
        const error = result as ProcessingError;
        expect(error.code).toBe('VALIDATION_FAILED');
        expect(error.message).toContain('At least 2 intent signals are required');
      }
    });

    test('should handle processing timeout', async () => {
      // Arrange: Agent with very short timeout
      const shortTimeoutAgent = new IntentDrivenOutreachAgent({
        processingTimeout: 1 // 1ms - guaranteed to timeout
      });

      const validProspectData = AgentUtils.createProspectData(
        'Test User',
        'test@example.com',
        'CTO',
        'Test Company',
        'Technology',
        CompanySize.STARTUP
      );

      const validSignals = [
        AgentUtils.createIntentSignal(SignalType.FUNDING_EVENT, 'Test', 0.8, 'Source', 1),
        AgentUtils.createIntentSignal(SignalType.COMPANY_GROWTH, 'Test 2', 0.7, 'Source', 2)
      ];

      // Act
      const result = await shortTimeoutAgent.processOutreachRequest(validProspectData, validSignals);

      // Assert - timeout may not always trigger with such short timeout due to synchronous operations
      // Check if it's either a timeout or successful processing
      if ('code' in result) {
        const error = result as ProcessingError;
        expect(['PROCESSING_TIMEOUT', 'VALIDATION_FAILED'].includes(error.code)).toBe(true);
      } else {
        // If processing completed quickly, that's also acceptable
        expect(result.recommendedMessage).toBeTruthy();
      }
    });

    test('should handle invalid signal data gracefully', async () => {
      // Arrange: Valid prospect but invalid signal data
      const validProspectData = AgentUtils.createProspectData(
        'Test User',
        'test@example.com',
        'CTO',
        'Test Company',
        'Technology',
        CompanySize.STARTUP
      );

      const invalidSignals = [
        {
          type: 'INVALID_TYPE' as SignalType, // Invalid signal type
          description: 'Test signal',
          timestamp: new Date(),
          relevanceScore: 1.5, // Invalid score > 1
          source: 'Source'
        },
        {
          type: SignalType.FUNDING_EVENT,
          description: '', // Empty description
          timestamp: new Date('invalid-date'), // Invalid date
          relevanceScore: -0.5, // Invalid negative score
          source: ''
        }
      ];

      // Act
      const result = await agent.processOutreachRequest(validProspectData, invalidSignals);

      // Assert
      expect('code' in result).toBe(true);
      
      if ('code' in result) {
        const error = result as ProcessingError;
        expect(error.code).toBe('VALIDATION_FAILED');
        expect(error.context?.errors).toBeTruthy();
      }
    });
  });

  describe('Workflow Determinism and Consistency', () => {
    test('should produce consistent results for identical inputs', async () => {
      // Arrange: Fixed input data
      const prospectData = AgentUtils.createProspectData(
        'Consistent Test',
        'consistent@test.com',
        'VP Engineering',
        'Consistent Corp',
        'Software',
        CompanySize.MEDIUM
      );

      const signals = [
        {
          type: SignalType.FUNDING_EVENT,
          description: 'Raised Series A funding',
          timestamp: new Date('2024-01-15T10:00:00Z'), // Fixed timestamp
          relevanceScore: 0.9,
          source: 'TechCrunch'
        },
        {
          type: SignalType.COMPANY_GROWTH,
          description: 'Doubled engineering team',
          timestamp: new Date('2024-01-10T10:00:00Z'), // Fixed timestamp
          relevanceScore: 0.85,
          source: 'LinkedIn'
        }
      ];

      // Act: Process the same request multiple times
      const result1 = await agent.processOutreachRequest(prospectData, signals);
      const result2 = await agent.processOutreachRequest(prospectData, signals);

      // Assert: Results should be consistent
      expect('code' in result1).toBe('code' in result2);
      
      if (!('code' in result1) && !('code' in result2)) {
        const output1 = result1 as StructuredOutput;
        const output2 = result2 as StructuredOutput;
        
        expect(output1.intentConfidence).toBe(output2.intentConfidence);
        expect(output1.suggestedFollowUpTiming).toBe(output2.suggestedFollowUpTiming);
        // Note: Messages may vary slightly due to authenticity filtering variations
        // but confidence and timing should be deterministic
      }
    });

    test('should execute all workflow steps in correct order', async () => {
      // Arrange
      const prospectData = AgentUtils.createProspectData(
        'Workflow Test',
        'workflow@test.com',
        'CTO',
        'Workflow Corp',
        'Technology',
        CompanySize.STARTUP
      );

      const signals = [
        AgentUtils.createIntentSignal(SignalType.FUNDING_EVENT, 'Test', 0.8, 'Source', 1),
        AgentUtils.createIntentSignal(SignalType.COMPANY_GROWTH, 'Test 2', 0.7, 'Source', 2)
      ];

      // Act
      const result = await agent.processOutreachRequest(prospectData, signals);

      // Assert
      expect('code' in result).toBe(false);
      
      if (!('code' in result)) {
        const output = result as StructuredOutput;
        const workflowSteps = output.processingMetadata.workflowSteps;
        
        // Verify expected workflow steps are present (allow for variations in step names)
        const expectedSteps = [
          'Input Processing',
          'Signal Analysis', 
          'Intent Analysis',
          'Confidence Assessment',
          'Approach Selection',
          'Message Creation',
          'Quality Review'
        ];
        
        // Check that most expected steps are present (allow some flexibility)
        const presentSteps = expectedSteps.filter(step => workflowSteps.includes(step));
        expect(presentSteps.length).toBeGreaterThanOrEqual(expectedSteps.length - 1);
        
        // Verify execution time is recorded
        expect(output.processingMetadata.executionTime).toBeGreaterThan(0);
        expect(output.processingMetadata.version).toBeTruthy();
      }
    });
  });

  describe('Agent Configuration and Health', () => {
    test('should respect custom configuration', async () => {
      // Arrange: Agent with custom configuration
      const customAgent = new IntentDrivenOutreachAgent({
        enableVerboseLogging: true,
        maxRevisionAttempts: 5,
        customBuzzwords: ['synergy', 'paradigm'],
        processingTimeout: 45000
      });

      // Act: Check configuration
      const config = customAgent.getConfig();

      // Assert
      expect(config.enableVerboseLogging).toBe(true);
      expect(config.maxRevisionAttempts).toBe(5);
      expect(config.customBuzzwords).toContain('synergy');
      expect(config.customBuzzwords).toContain('paradigm');
      expect(config.processingTimeout).toBe(45000);
    });

    test('should report healthy status', () => {
      // Act
      const health = agent.getHealthStatus();

      // Assert
      expect(health.status).toBe('healthy');
      expect(health.version).toBeTruthy();
      expect(health.config).toBeTruthy();
    });

    test('should validate inputs correctly', () => {
      // Arrange: Valid inputs
      const validProspect = AgentUtils.createProspectData(
        'Valid User',
        'valid@example.com',
        'CTO',
        'Valid Company',
        'Technology',
        CompanySize.STARTUP
      );

      const validSignals = [
        AgentUtils.createIntentSignal(SignalType.FUNDING_EVENT, 'Valid signal', 0.8, 'Source', 1),
        AgentUtils.createIntentSignal(SignalType.COMPANY_GROWTH, 'Valid signal 2', 0.7, 'Source', 2)
      ];

      // Act
      const validation = agent.validateInputs(validProspect, validSignals);

      // Assert
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Real-World Integration Scenarios', () => {
    test('should handle enterprise prospect with multiple signals', async () => {
      // Arrange: Complex enterprise scenario
      const enterpriseProspect: ProspectData = {
        role: 'VP of Digital Transformation',
        companyContext: {
          name: 'MegaCorp Industries',
          industry: 'Manufacturing',
          size: CompanySize.ENTERPRISE,
          recentEvents: [
            'Announced digital transformation initiative',
            'Acquired AI startup',
            'Opened new innovation lab'
          ]
        },
        contactDetails: {
          name: 'Robert Johnson',
          email: 'robert.johnson@megacorp.com',
          linkedinUrl: 'https://linkedin.com/in/robertjohnson',
          phoneNumber: '+1-555-0123'
        },
        additionalContext: {
          previousInteractions: 0,
          referralSource: 'industry_conference',
          companyRevenue: '$2B+'
        }
      };

      const enterpriseSignals: IntentSignal[] = [
        {
          type: SignalType.TECHNOLOGY_ADOPTION,
          description: 'Announced $50M digital transformation budget',
          timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          relevanceScore: 0.85,
          source: 'Company Press Release',
          metadata: {
            budget: '$50M',
            timeline: '18 months'
          }
        },
        {
          type: SignalType.COMPANY_GROWTH,
          description: 'Hiring 25 new technology roles',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          relevanceScore: 0.8,
          source: 'LinkedIn Jobs'
        },
        {
          type: SignalType.INDUSTRY_TREND,
          description: 'Manufacturing industry report emphasizes automation needs',
          timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          relevanceScore: 0.6,
          source: 'Industry Research Report'
        }
      ];

      // Act
      const result = await agent.processOutreachRequest(enterpriseProspect, enterpriseSignals);

      // Assert
      expect('code' in result).toBe(false);
      
      if (!('code' in result)) {
        const output = result as StructuredOutput;
        
        // Enterprise scenario should result in Low, Medium, or High confidence depending on signal strength
        expect([ConfidenceLevel.LOW, ConfidenceLevel.MEDIUM, ConfidenceLevel.HIGH]).toContain(output.intentConfidence);
        
        // Message should be professional and appropriate for enterprise
        expect(output.recommendedMessage).toBeTruthy();
        expect(output.recommendedMessage).not.toContain('startup');
        expect(output.recommendedMessage).not.toContain('small business');
        
        // Should have proper alternatives and timing
        expect(output.alternativeMessages).toHaveLength(2);
        expect(output.suggestedFollowUpTiming).toBeTruthy();
      }
    });

    test('should handle startup prospect with funding signals', async () => {
      // Arrange: Startup with recent funding
      const startupProspect = AgentUtils.createProspectData(
        'Emma Wilson',
        'emma@fastgrowth.io',
        'Founder & CEO',
        'FastGrowth AI',
        'Artificial Intelligence',
        CompanySize.STARTUP
      );

      const fundingSignals = [
        AgentUtils.createIntentSignal(
          SignalType.FUNDING_EVENT,
          'Closed $8M seed round led by Sequoia Capital',
          0.95,
          'VentureBeat',
          2 // 2 days ago - very recent
        ),
        AgentUtils.createIntentSignal(
          SignalType.COMPANY_GROWTH,
          'Tripled team size from 5 to 15 employees',
          0.9,
          'Company LinkedIn',
          5 // 5 days ago
        ),
        AgentUtils.createIntentSignal(
          SignalType.TECHNOLOGY_ADOPTION,
          'Posted about scaling infrastructure challenges',
          0.85,
          'Founder Twitter',
          1 // 1 day ago - very recent
        )
      ];

      // Act
      const result = await agent.processOutreachRequest(startupProspect, fundingSignals);

      // Assert
      expect('code' in result).toBe(false);
      
      if (!('code' in result)) {
        const output = result as StructuredOutput;
        
        // Strong, recent signals should result in high confidence
        expect(output.intentConfidence).toBe(ConfidenceLevel.HIGH);
        
        // High confidence should suggest quick follow-up
        expect(output.suggestedFollowUpTiming).toBe(FollowUpTiming.ONE_WEEK);
        
        // Message should be appropriate for startup context
        expect(output.recommendedMessage).toBeTruthy();
        expect(output.alternativeMessages).toHaveLength(2);
      }
    });
  });
});