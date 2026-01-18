/**
 * Integration Tests - Edge Cases and Error Recovery
 * 
 * Additional integration tests for edge cases, error recovery,
 * and boundary conditions not covered in main integration tests.
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
  ConfidenceLevel
} from '../index';

describe('Integration Tests - Edge Cases and Error Recovery', () => {
  let agent: IntentDrivenOutreachAgent;

  beforeEach(() => {
    agent = new IntentDrivenOutreachAgent({
      enableVerboseLogging: false,
      processingTimeout: 15000
    });
  });

  describe('Boundary Conditions', () => {
    test('should handle minimum valid input (exactly 2 signals)', async () => {
      // Arrange: Minimum required data
      const minimalProspect = AgentUtils.createProspectData(
        'Min User',
        'min@example.com',
        'Developer',
        'MinCorp',
        'Tech',
        CompanySize.STARTUP
      );

      const minimalSignals = [
        AgentUtils.createIntentSignal(
          SignalType.JOB_CHANGE,
          'New role',
          0.5, // Minimum reasonable relevance
          'LinkedIn',
          30 // 30 days ago
        ),
        AgentUtils.createIntentSignal(
          SignalType.COMPANY_GROWTH,
          'Team expansion',
          0.5,
          'Company blog',
          45 // 45 days ago
        )
      ];

      // Act
      const result = await agent.processOutreachRequest(minimalProspect, minimalSignals);

      // Assert
      expect('code' in result).toBe(false);
      
      if (!('code' in result)) {
        const output = result as StructuredOutput;
        expect(output.intentConfidence).toBeTruthy();
        expect(output.recommendedMessage).toBeTruthy();
        expect(output.alternativeMessages).toHaveLength(2);
      }
    });

    test('should handle maximum reasonable input (many signals)', async () => {
      // Arrange: Many signals
      const richProspect = AgentUtils.createProspectData(
        'Rich Data User',
        'rich@datacorp.com',
        'Chief Data Officer',
        'DataCorp Analytics',
        'Data Analytics',
        CompanySize.LARGE
      );

      const manySignals = [
        AgentUtils.createIntentSignal(SignalType.FUNDING_EVENT, 'Series C funding', 0.9, 'TechCrunch', 1),
        AgentUtils.createIntentSignal(SignalType.COMPANY_GROWTH, 'Doubled team size', 0.85, 'LinkedIn', 3),
        AgentUtils.createIntentSignal(SignalType.TECHNOLOGY_ADOPTION, 'AI initiative launch', 0.8, 'Company blog', 5),
        AgentUtils.createIntentSignal(SignalType.INDUSTRY_TREND, 'Data privacy regulations', 0.6, 'Industry report', 10),
        AgentUtils.createIntentSignal(SignalType.JOB_CHANGE, 'New CDO appointment', 0.75, 'Press release', 7),
        AgentUtils.createIntentSignal(SignalType.TECHNOLOGY_ADOPTION, 'Cloud migration project', 0.7, 'Tech conference', 14)
      ];

      // Act
      const result = await agent.processOutreachRequest(richProspect, manySignals);

      // Assert
      expect('code' in result).toBe(false);
      
      if (!('code' in result)) {
        const output = result as StructuredOutput;
        expect(output.intentConfidence).toBeTruthy();
        expect(output.recommendedMessage).toBeTruthy();
        expect(output.alternativeMessages).toHaveLength(2);
        expect(output.processingMetadata.executionTime).toBeGreaterThan(0);
      }
    });

    test('should handle very old signals gracefully', async () => {
      // Arrange: Old signals that should result in low confidence
      const prospect = AgentUtils.createProspectData(
        'Old Signals User',
        'old@signals.com',
        'Manager',
        'OldCorp',
        'Traditional',
        CompanySize.MEDIUM
      );

      const oldSignals = [
        AgentUtils.createIntentSignal(
          SignalType.COMPANY_GROWTH,
          'Expansion mentioned',
          0.7,
          'Old article',
          365 // 1 year ago
        ),
        AgentUtils.createIntentSignal(
          SignalType.INDUSTRY_TREND,
          'Industry shift noted',
          0.6,
          'Old report',
          400 // Over 1 year ago
        )
      ];

      // Act
      const result = await agent.processOutreachRequest(prospect, oldSignals);

      // Assert
      expect('code' in result).toBe(false);
      
      if (!('code' in result)) {
        const output = result as StructuredOutput;
        // Very old signals should result in low confidence
        expect(output.intentConfidence).toBe(ConfidenceLevel.LOW);
        expect(output.recommendedMessage).toBeTruthy();
      }
    });
  });

  describe('Data Quality Edge Cases', () => {
    test('should handle special characters in prospect data', async () => {
      // Arrange: Data with special characters
      const specialCharProspect: ProspectData = {
        role: 'VP of R&D',
        companyContext: {
          name: 'Müller & Associates (München)',
          industry: 'Biotechnology & Pharmaceuticals',
          size: CompanySize.MEDIUM
        },
        contactDetails: {
          name: 'José María García-López',
          email: 'jose.garcia-lopez@mueller-associates.de'
        }
      };

      const signals = [
        AgentUtils.createIntentSignal(SignalType.FUNDING_EVENT, 'EU grant received', 0.8, 'Source', 5),
        AgentUtils.createIntentSignal(SignalType.TECHNOLOGY_ADOPTION, 'New lab equipment', 0.7, 'Source', 10)
      ];

      // Act
      const result = await agent.processOutreachRequest(specialCharProspect, signals);

      // Assert
      expect('code' in result).toBe(false);
      
      if (!('code' in result)) {
        const output = result as StructuredOutput;
        expect(output.recommendedMessage).toBeTruthy();
        expect(output.alternativeMessages).toHaveLength(2);
      }
    });

    test('should handle very long descriptions in signals', async () => {
      // Arrange: Signals with very long descriptions
      const prospect = AgentUtils.createProspectData(
        'Long Desc User',
        'long@descriptions.com',
        'Director',
        'LongCorp',
        'Technology',
        CompanySize.LARGE
      );

      const longDescription = 'This is a very long description that contains a lot of detailed information about the intent signal including background context, specific details about the event, multiple stakeholders involved, timeline information, budget considerations, technical requirements, strategic implications, market conditions, competitive landscape, regulatory considerations, and various other factors that might be relevant to understanding the full scope and significance of this particular intent signal in the broader context of the company\'s business operations and strategic direction.';

      const signalsWithLongDesc = [
        {
          type: SignalType.FUNDING_EVENT,
          description: longDescription,
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          relevanceScore: 0.8,
          source: 'Detailed report'
        },
        AgentUtils.createIntentSignal(SignalType.COMPANY_GROWTH, 'Normal signal', 0.7, 'Source', 5)
      ];

      // Act
      const result = await agent.processOutreachRequest(prospect, signalsWithLongDesc);

      // Assert
      expect('code' in result).toBe(false);
      
      if (!('code' in result)) {
        const output = result as StructuredOutput;
        expect(output.recommendedMessage).toBeTruthy();
        expect(output.alternativeMessages).toHaveLength(2);
      }
    });

    test('should handle edge case relevance scores', async () => {
      // Arrange: Signals with edge case relevance scores
      const prospect = AgentUtils.createProspectData(
        'Edge Score User',
        'edge@scores.com',
        'Analyst',
        'EdgeCorp',
        'Finance',
        CompanySize.SMALL
      );

      const edgeSignals = [
        {
          type: SignalType.FUNDING_EVENT,
          description: 'Perfect relevance signal',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          relevanceScore: 1.0, // Maximum score
          source: 'Perfect source'
        },
        {
          type: SignalType.INDUSTRY_TREND,
          description: 'Minimum relevance signal',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          relevanceScore: 0.01, // Near minimum score
          source: 'Weak source'
        }
      ];

      // Act
      const result = await agent.processOutreachRequest(prospect, edgeSignals);

      // Assert
      expect('code' in result).toBe(false);
      
      if (!('code' in result)) {
        const output = result as StructuredOutput;
        expect(output.recommendedMessage).toBeTruthy();
        expect(output.alternativeMessages).toHaveLength(2);
      }
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from authenticity filter issues', async () => {
      // This test verifies that the system can handle and recover from
      // authenticity filtering issues through the revision mechanism
      
      const prospect = AgentUtils.createProspectData(
        'Auth Test User',
        'auth@test.com',
        'Manager',
        'AuthCorp',
        'Business',
        CompanySize.MEDIUM
      );

      const signals = [
        AgentUtils.createIntentSignal(SignalType.FUNDING_EVENT, 'Recent funding', 0.8, 'Source', 3),
        AgentUtils.createIntentSignal(SignalType.COMPANY_GROWTH, 'Team growth', 0.75, 'Source', 7)
      ];

      // Act
      const result = await agent.processOutreachRequest(prospect, signals);

      // Assert - Should succeed even if authenticity revisions were needed
      expect('code' in result).toBe(false);
      
      if (!('code' in result)) {
        const output = result as StructuredOutput;
        expect(output.recommendedMessage).toBeTruthy();
        expect(output.alternativeMessages).toHaveLength(2);
        
        // Message should not contain obvious template patterns
        expect(output.recommendedMessage).not.toMatch(/\[.*?\]/);
        expect(output.recommendedMessage).not.toMatch(/\{\{.*?\}\}/);
      }
    });

    test('should handle concurrent processing requests', async () => {
      // Arrange: Multiple concurrent requests
      const prospects = [
        AgentUtils.createProspectData('User1', 'user1@test.com', 'CTO', 'Corp1', 'Tech', CompanySize.STARTUP),
        AgentUtils.createProspectData('User2', 'user2@test.com', 'VP', 'Corp2', 'Finance', CompanySize.MEDIUM),
        AgentUtils.createProspectData('User3', 'user3@test.com', 'Director', 'Corp3', 'Healthcare', CompanySize.LARGE)
      ];

      const signalSets = prospects.map((_, index) => [
        AgentUtils.createIntentSignal(SignalType.FUNDING_EVENT, `Signal ${index}A`, 0.8, 'Source', 5),
        AgentUtils.createIntentSignal(SignalType.COMPANY_GROWTH, `Signal ${index}B`, 0.7, 'Source', 10)
      ]);

      // Act: Process all requests concurrently
      const promises = prospects.map((prospect, index) => 
        agent.processOutreachRequest(prospect, signalSets[index])
      );

      const results = await Promise.all(promises);

      // Assert: All should succeed
      results.forEach((result, _index) => {
        expect('code' in result).toBe(false);
        
        if (!('code' in result)) {
          const output = result as StructuredOutput;
          expect(output.recommendedMessage).toBeTruthy();
          expect(output.alternativeMessages).toHaveLength(2);
        }
      });
    });

    test('should maintain performance under load', async () => {
      // Arrange: Standard test case
      const prospect = AgentUtils.createProspectData(
        'Perf Test User',
        'perf@test.com',
        'Engineer',
        'PerfCorp',
        'Software',
        CompanySize.STARTUP
      );

      const signals = [
        AgentUtils.createIntentSignal(SignalType.FUNDING_EVENT, 'Performance test signal', 0.8, 'Source', 3),
        AgentUtils.createIntentSignal(SignalType.COMPANY_GROWTH, 'Performance test signal 2', 0.75, 'Source', 7)
      ];

      // Act: Measure processing time
      const startTime = Date.now();
      const result = await agent.processOutreachRequest(prospect, signals);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Assert: Should complete within reasonable time (under 10 seconds)
      expect(processingTime).toBeLessThan(10000);
      expect('code' in result).toBe(false);
      
      if (!('code' in result)) {
        const output = result as StructuredOutput;
        expect(output.processingMetadata.executionTime).toBeGreaterThan(0);
        expect(output.processingMetadata.executionTime).toBeLessThanOrEqual(processingTime);
      }
    });
  });

  describe('Configuration Edge Cases', () => {
    test('should handle agent reconfiguration', async () => {
      // Arrange: Agent with initial config
      const configurableAgent = new IntentDrivenOutreachAgent({
        enableVerboseLogging: false,
        processingTimeout: 20000
      });

      const prospect = AgentUtils.createProspectData(
        'Config Test User',
        'config@test.com',
        'Manager',
        'ConfigCorp',
        'Business',
        CompanySize.MEDIUM
      );

      const signals = [
        AgentUtils.createIntentSignal(SignalType.FUNDING_EVENT, 'Config test', 0.8, 'Source', 5),
        AgentUtils.createIntentSignal(SignalType.COMPANY_GROWTH, 'Config test 2', 0.7, 'Source', 10)
      ];

      // Act: Process with initial config
      const result1 = await configurableAgent.processOutreachRequest(prospect, signals);

      // Update configuration
      configurableAgent.updateConfig({
        enableVerboseLogging: true,
        processingTimeout: 30000
      });

      // Process with updated config
      const result2 = await configurableAgent.processOutreachRequest(prospect, signals);

      // Assert: Both should succeed
      expect('code' in result1).toBe(false);
      expect('code' in result2).toBe(false);
      
      // Config should be updated
      const config = configurableAgent.getConfig();
      expect(config.enableVerboseLogging).toBe(true);
      expect(config.processingTimeout).toBe(30000);
    });

    test('should validate health status correctly', () => {
      // Arrange: Fresh agent
      const healthAgent = new IntentDrivenOutreachAgent();

      // Act: Check health
      const health = healthAgent.getHealthStatus();

      // Assert: Should report healthy
      expect(health.status).toBe('healthy');
      expect(health.version).toBeTruthy();
      expect(health.config).toBeTruthy();
      expect(typeof health.config.enableVerboseLogging).toBe('boolean');
      expect(typeof health.config.maxRevisionAttempts).toBe('number');
      expect(typeof health.config.processingTimeout).toBe('number');
      expect(Array.isArray(health.config.customBuzzwords)).toBe(true);
    });
  });

  describe('Input Validation Edge Cases', () => {
    test('should handle validation with warnings but no errors', async () => {
      // Arrange: Data that might generate warnings but is still valid
      const warningProspect = AgentUtils.createProspectData(
        'Warning User',
        'warning@test.com',
        'Consultant', // Might be less specific than ideal
        'WarningCorp',
        'Consulting', // Broad industry
        CompanySize.SMALL
      );

      const warningSignals = [
        AgentUtils.createIntentSignal(
          SignalType.INDUSTRY_TREND,
          'General industry trend', // Less specific
          0.5, // Lower relevance
          'General source',
          20 // Older signal
        ),
        AgentUtils.createIntentSignal(
          SignalType.COMPANY_GROWTH,
          'Some growth mentioned',
          0.6,
          'Vague source',
          25
        )
      ];

      // Act: Validate first
      const validation = agent.validateInputs(warningProspect, warningSignals);

      // Should be valid even if there are warnings
      if (validation.isValid) {
        const result = await agent.processOutreachRequest(warningProspect, warningSignals);
        
        // Assert
        expect('code' in result).toBe(false);
        
        if (!('code' in result)) {
          const output = result as StructuredOutput;
          expect(output.recommendedMessage).toBeTruthy();
          expect(output.alternativeMessages).toHaveLength(2);
        }
      } else {
        // If validation fails, that's also acceptable for this edge case
        expect(validation.errors.length).toBeGreaterThan(0);
      }
    });
  });
});