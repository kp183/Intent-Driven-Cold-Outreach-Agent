/**
 * Property-based tests for OutputAssembler
 * Tests universal properties that should hold across all valid inputs
 */

import fc from 'fast-check';
import { OutputAssembler } from '../OutputAssembler';
import { MessageGenerator } from '../../message-generator/MessageGenerator';
import {
  ConfidenceLevel,
  FollowUpTiming,
  ProcessingMetadata,
  StrategyType,
  CallToActionLevel,
  MessageStrategy,
  IntentHypothesis,
  ProspectData,
  CompanySize,
  SignalType,
  AuditLogEntry,
} from '../../types';

describe('OutputAssembler Property Tests', () => {
  let outputAssembler: OutputAssembler;
  let messageGenerator: MessageGenerator;

  beforeEach(() => {
    messageGenerator = new MessageGenerator();
    outputAssembler = new OutputAssembler(messageGenerator);
  });

  /**
   * **Feature: intent-driven-cold-outreach-agent, Property 26: Structured Output Completeness**
   * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
   * 
   * For any processing request, the output should include intent_confidence, 
   * reasoning_summary, recommended_message, exactly 2 alternatives, and follow-up timing
   */
  test('Property 26: Structured Output Completeness', () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length >= 10),
          confidence: fc.constantFrom(
            ConfidenceLevel.HIGH,
            ConfidenceLevel.MEDIUM,
            ConfidenceLevel.LOW
          ),
          reasoning: fc.oneof(
            // Business-focused reasoning that should be preserved
            fc.constantFrom(
              'Based on the prospect\'s recent funding and technology adoption signals, this outreach timing appears optimal for engagement.',
              'The combination of job change and company growth indicators suggests strong relevance for this approach.',
              'Recent market activity and role transitions indicate this is an appropriate time for outreach.',
              'Current business context and timing factors support this engagement strategy.',
              'Available signals suggest this prospect may be receptive to relevant business discussions.',
              'The prospect\'s recent role change and company expansion create a compelling opportunity for engagement.',
              'Market conditions and the prospect\'s current initiatives align well with our value proposition.',
              'Recent industry developments and the prospect\'s strategic focus suggest strong timing for outreach.'
            ),
            // Technical reasoning that should be concealed (to test concealment)
            fc.constantFrom(
              'Step 1: Input validation completed. Step 2: Signal interpretation using weighted algorithm.',
              'Processing: workflow step execution in progress. Debug: signal weighting algorithm applied.',
              'Reasoning chain: signal interpretation → hypothesis formation → confidence scoring.'
            )
          ),
          alternatives: fc.tuple(
            fc.string({ minLength: 15, maxLength: 200 }).filter(s => s.trim().length >= 15),
            fc.string({ minLength: 15, maxLength: 200 }).filter(s => s.trim().length >= 15)
          ).filter(([alt1, alt2]) => alt1.trim() !== alt2.trim()), // Ensure alternatives are different
          metadata: fc.record({
            workflowSteps: fc.array(
              fc.constantFrom(
                'input_validation',
                'signal_interpretation', 
                'hypothesis_formation',
                'confidence_scoring',
                'strategy_selection',
                'message_generation'
              ),
              { minLength: 2, maxLength: 6 }
            ),
            executionTime: fc.integer({ min: 10, max: 5000 }),
            auditLog: fc.array(
              fc.record({
                step: fc.constantFrom(
                  'input_validation',
                  'signal_interpretation',
                  'hypothesis_formation',
                  'confidence_scoring'
                ),
                timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
                status: fc.constantFrom('completed', 'started')
              }),
              { minLength: 1, maxLength: 4 }
            ),
            version: fc.constantFrom('1.0.0', '1.1.0', '2.0.0', '1.2.0')
          })
        }),
        (input) => {
          const result = outputAssembler.assembleOutput(
            input.message,
            input.confidence,
            input.reasoning,
            input.alternatives,
            input.metadata as ProcessingMetadata
          );

          // Requirement 8.1: Should include intent_confidence level
          expect(result.intentConfidence).toBeDefined();
          expect(Object.values(ConfidenceLevel)).toContain(result.intentConfidence);

          // Requirement 8.2: Should provide reasoning_summary (1-2 sentences)
          expect(result.reasoningSummary).toBeDefined();
          expect(typeof result.reasoningSummary).toBe('string');
          expect(result.reasoningSummary.trim().length).toBeGreaterThan(10);
          
          // Check it's 1-2 sentences (count periods, exclamation marks, question marks)
          const sentenceCount = (result.reasoningSummary.match(/[.!?]+/g) || []).length;
          expect(sentenceCount).toBeGreaterThanOrEqual(1);
          expect(sentenceCount).toBeLessThanOrEqual(2);

          // Reasoning summary should be business-focused, not technical
          const lowerReasoning = result.reasoningSummary.toLowerCase();
          expect(lowerReasoning).not.toContain('step 1');
          expect(lowerReasoning).not.toContain('algorithm');
          expect(lowerReasoning).not.toContain('processing');

          // Requirement 8.3: Should generate recommended_message
          expect(result.recommendedMessage).toBeDefined();
          expect(typeof result.recommendedMessage).toBe('string');
          expect(result.recommendedMessage.length).toBeGreaterThan(0);
          expect(result.recommendedMessage.trim()).toBe(input.message.trim());

          // Requirement 8.4: Should provide exactly 2 alternative messages
          expect(result.alternativeMessages).toBeDefined();
          expect(Array.isArray(result.alternativeMessages)).toBe(true);
          expect(result.alternativeMessages).toHaveLength(2);
          expect(typeof result.alternativeMessages[0]).toBe('string');
          expect(typeof result.alternativeMessages[1]).toBe('string');
          expect(result.alternativeMessages[0].length).toBeGreaterThan(0);
          expect(result.alternativeMessages[1].length).toBeGreaterThan(0);
          
          // Alternatives should be different from each other and from the main message
          expect(result.alternativeMessages[0]).not.toBe(result.alternativeMessages[1]);
          expect(result.alternativeMessages[0]).not.toBe(result.recommendedMessage);
          expect(result.alternativeMessages[1]).not.toBe(result.recommendedMessage);

          // Requirement 8.5: Should suggest appropriate follow-up timing
          expect(result.suggestedFollowUpTiming).toBeDefined();
          expect(Object.values(FollowUpTiming)).toContain(result.suggestedFollowUpTiming);

          // Should include processing metadata
          expect(result.processingMetadata).toBeDefined();
          expect(result.processingMetadata.workflowSteps).toBeDefined();
          expect(Array.isArray(result.processingMetadata.workflowSteps)).toBe(true);
          expect(result.processingMetadata.workflowSteps.length).toBeGreaterThan(0);
          expect(result.processingMetadata.executionTime).toBeDefined();
          expect(typeof result.processingMetadata.executionTime).toBe('number');
          expect(result.processingMetadata.executionTime).toBeGreaterThan(0);
          expect(result.processingMetadata.auditLog).toBeDefined();
          expect(Array.isArray(result.processingMetadata.auditLog)).toBe(true);
          expect(result.processingMetadata.version).toBeDefined();
          expect(typeof result.processingMetadata.version).toBe('string');
          expect(result.processingMetadata.version.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 25 } // Increased runs to catch edge cases
    );
  });

  /**
   * Test that follow-up timing is correctly mapped to confidence levels
   */
  test('Follow-up timing should be appropriate for confidence level', () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.constantFrom('Test message', 'Sample message'),
          reasoning: fc.constantFrom(
            'Based on available signals, this approach is recommended.',
            'Current context suggests this timing is appropriate.'
          ),
          alternatives: fc.constantFrom(
            ['Alt 1', 'Alt 2'],
            ['Option A', 'Option B']
          ),
          metadata: fc.record({
            workflowSteps: fc.constantFrom(['input_validation'], ['signal_interpretation']),
            executionTime: fc.constantFrom(100, 200),
            auditLog: fc.constantFrom([{
              step: 'test_step',
              timestamp: new Date('2024-01-01'),
              status: 'completed' as const
            }]),
            version: fc.constantFrom('1.0.0')
          })
        }),
        (input) => {
          // Test High confidence
          const highResult = outputAssembler.assembleOutput(
            input.message,
            ConfidenceLevel.HIGH,
            input.reasoning,
            input.alternatives as [string, string],
            input.metadata as ProcessingMetadata
          );
          expect(highResult.suggestedFollowUpTiming).toBe(FollowUpTiming.ONE_WEEK);

          // Test Medium confidence
          const mediumResult = outputAssembler.assembleOutput(
            input.message,
            ConfidenceLevel.MEDIUM,
            input.reasoning,
            input.alternatives as [string, string],
            input.metadata as ProcessingMetadata
          );
          expect(mediumResult.suggestedFollowUpTiming).toBe(FollowUpTiming.TWO_WEEKS);

          // Test Low confidence
          const lowResult = outputAssembler.assembleOutput(
            input.message,
            ConfidenceLevel.LOW,
            input.reasoning,
            input.alternatives as [string, string],
            input.metadata as ProcessingMetadata
          );
          expect(lowResult.suggestedFollowUpTiming).toBe(FollowUpTiming.ONE_MONTH);
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Test that alternative message generation produces exactly 2 different messages
   */
  test('Alternative message generation should produce exactly 2 different messages', () => {
    fc.assert(
      fc.property(
        fc.record({
          strategy: fc.record({
            type: fc.constantFrom(
              StrategyType.DIRECT_VALUE_ALIGNMENT,
              StrategyType.INSIGHT_LED_OBSERVATION,
              StrategyType.SOFT_CURIOSITY
            ),
            toneGuidelines: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
            contentFocus: fc.string({ minLength: 10, maxLength: 100 }),
            callToActionLevel: fc.constantFrom(
              CallToActionLevel.NONE,
              CallToActionLevel.SOFT,
              CallToActionLevel.DIRECT
            )
          }),
          hypothesis: fc.record({
            primaryReason: fc.string({ minLength: 20, maxLength: 200 }),
            supportingEvidence: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
            confidenceFactors: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
            conservativeAssumptions: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 0, maxLength: 3 })
          }),
          prospectData: fc.record({
            role: fc.string({ minLength: 5, maxLength: 50 }),
            companyContext: fc.record({
              name: fc.string({ minLength: 2, maxLength: 50 }),
              industry: fc.string({ minLength: 5, maxLength: 30 }),
              size: fc.constantFrom(...Object.values(CompanySize)),
              recentEvents: fc.option(fc.array(fc.string({ minLength: 10, maxLength: 100 }), { maxLength: 3 }))
            }),
            contactDetails: fc.record({
              email: fc.emailAddress(),
              name: fc.string({ minLength: 2, maxLength: 50 }),
              linkedinUrl: fc.option(fc.webUrl()),
              phoneNumber: fc.option(fc.string({ minLength: 10, maxLength: 15 }))
            }),
            additionalContext: fc.option(fc.record({}))
          }),
          confidence: fc.constantFrom(
            ConfidenceLevel.HIGH,
            ConfidenceLevel.MEDIUM,
            ConfidenceLevel.LOW
          )
        }),
        (input) => {
          const alternatives = outputAssembler.generateAlternativeMessages(
            input.strategy as MessageStrategy,
            input.hypothesis as IntentHypothesis,
            input.prospectData as ProspectData,
            input.confidence
          );

          // Should return exactly 2 alternatives
          expect(alternatives).toHaveLength(2);
          expect(typeof alternatives[0]).toBe('string');
          expect(typeof alternatives[1]).toBe('string');
          
          // Both should be non-empty
          expect(alternatives[0].length).toBeGreaterThan(0);
          expect(alternatives[1].length).toBeGreaterThan(0);
          
          // They should be different from each other
          expect(alternatives[0]).not.toBe(alternatives[1]);
        }
      ),
      { numRuns: 15 } // Reduced runs due to complexity of message generation
    );
  });

  /**
   * **Feature: intent-driven-cold-outreach-agent, Property 27: Internal Reasoning Concealment**
   * **Validates: Requirements 8.6**
   * 
   * For any generated output, internal chain-of-thought or reasoning steps should not be exposed to end users
   */
  test('Property 27: Internal Reasoning Concealment', () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
          confidence: fc.constantFrom(
            ConfidenceLevel.HIGH,
            ConfidenceLevel.MEDIUM,
            ConfidenceLevel.LOW
          ),
          reasoning: fc.oneof(
            // Technical reasoning with internal details
            fc.constantFrom(
              'Step 1: Input validation completed. Step 2: Signal interpretation using weighted algorithm. Step 3: Hypothesis formation based on processing pipeline. Internal note: confidence scoring applied.',
              'Processing: workflow step execution in progress. Debug: signal weighting algorithm applied. Chain-of-thought: analyzing prospect data through validation result.',
              'Reasoning chain: signal interpretation → hypothesis formation → confidence scoring → strategy selection. Audit log shows successful processing metadata.',
              'Workflow step processing with algorithm validation. Processing metadata indicates successful completion of signal weighting and hypothesis formation.',
              'Debug: confidence scoring algorithm applied. Internal note: authenticity filter validation passed. Processing pipeline completed successfully.'
            ),
            // Business-focused reasoning that should be preserved
            fc.constantFrom(
              'Based on the prospect\'s recent funding and technology adoption signals, this outreach timing appears optimal for engagement.',
              'The combination of job change and company growth indicators suggests strong relevance for this approach.',
              'Recent market activity and role transitions indicate this is an appropriate time for outreach.',
              'Current business context and timing factors support this engagement strategy.',
              'Available signals suggest this prospect may be receptive to relevant business discussions.'
            )
          ),
          alternatives: fc.tuple(
            fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
            fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10)
          ),
          metadata: fc.record({
            workflowSteps: fc.array(
              fc.constantFrom(
                'input_validation',
                'signal_interpretation',
                'hypothesis_formation',
                'confidence_scoring',
                'strategy_selection',
                'message_generation',
                'authenticity_filtering',
                'output_assembly'
              ),
              { minLength: 1, maxLength: 8 }
            ),
            executionTime: fc.integer({ min: 1, max: 10000 }),
            auditLog: fc.array(
              fc.record({
                step: fc.constantFrom(
                  'input_validation',
                  'signal_interpretation',
                  'hypothesis_formation',
                  'confidence_scoring',
                  'strategy_selection',
                  'message_generation',
                  'authenticity_filtering',
                  'output_assembly'
                ),
                timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
                status: fc.constantFrom('started', 'completed', 'failed'),
                details: fc.option(fc.record({
                  processingTime: fc.integer({ min: 1, max: 1000 }),
                  internalState: fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length >= 10)
                }))
              }),
              { minLength: 1, maxLength: 5 }
            ),
            version: fc.string({ minLength: 3, maxLength: 10 }).filter(s => s.trim().length >= 3)
          })
        }),
        (input) => {
          const result = outputAssembler.assembleOutput(
            input.message,
            input.confidence,
            input.reasoning,
            input.alternatives,
            input.metadata as ProcessingMetadata
          );

          // Check that reasoning summary doesn't contain technical workflow terms
          const technicalTerms = [
            'workflow step',
            'signal interpretation',
            'hypothesis formation',
            'confidence scoring',
            'strategy selection',
            'authenticity filter',
            'processing pipeline',
            'algorithm',
            'weighted signal',
            'audit log',
            'validation result',
            'processing metadata'
          ];

          const lowerReasoning = result.reasoningSummary.toLowerCase();
          technicalTerms.forEach(term => {
            expect(lowerReasoning).not.toContain(term.toLowerCase());
          });

          // Check that reasoning summary doesn't contain internal processing markers
          const internalMarkers = [
            'step 1:',
            'step 2:',
            'step 3:',
            'step 4:',
            'step 5:',
            'step 6:',
            'step 7:',
            'internal note:',
            'processing:',
            'debug:',
            'chain-of-thought:',
            'reasoning chain:'
          ];

          internalMarkers.forEach(marker => {
            expect(lowerReasoning).not.toContain(marker.toLowerCase());
          });

          // Check that reasoning summary is 1-2 sentences (Requirement 8.2)
          const sentenceCount = (result.reasoningSummary.match(/[.!?]+/g) || []).length;
          expect(sentenceCount).toBeGreaterThanOrEqual(1);
          expect(sentenceCount).toBeLessThanOrEqual(2);

          // Check that reasoning summary is not empty and has meaningful content
          expect(result.reasoningSummary.trim().length).toBeGreaterThan(10);

          // Check that processing metadata has been cleaned
          expect(result.processingMetadata).toBeDefined();
          
          // Workflow steps should be sanitized (no internal implementation details)
          result.processingMetadata.workflowSteps.forEach(step => {
            expect(step).not.toContain('_'); // No underscores in sanitized step names
            expect(step).not.toMatch(/^[a-z_]+$/); // Should not be raw internal step names
          });

          // Audit log details should be removed
          result.processingMetadata.auditLog.forEach(entry => {
            expect(entry.details).toBeUndefined();
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Test that concealment works correctly for various types of technical reasoning
   */
  test('Concealment should handle different types of technical content', () => {
    const technicalReasoningExamples = [
      'Step 1: Input validation completed successfully. Step 2: Signal interpretation using weighted algorithm. Processing metadata indicates high confidence.',
      'Workflow step execution: hypothesis formation → confidence scoring → strategy selection. Audit log shows processing pipeline completed.',
      'Debug: signal weighting algorithm applied. Chain-of-thought: analyzing prospect data through validation result. Internal note: authenticity filter passed.',
      'Processing: confidence scoring algorithm determined High confidence based on weighted signal analysis and processing metadata validation.'
    ];

    technicalReasoningExamples.forEach(reasoning => {
      const result = outputAssembler.assembleOutput(
        'Test message',
        ConfidenceLevel.HIGH,
        reasoning,
        ['Alternative 1', 'Alternative 2'],
        {
          workflowSteps: ['input_validation', 'signal_interpretation'],
          executionTime: 100,
          auditLog: [{
            step: 'test_step',
            timestamp: new Date(),
            status: 'completed',
            details: { internalData: 'should be removed' }
          }],
          version: '1.0.0'
        } as ProcessingMetadata
      );

      // Should not contain any technical terms
      const lowerReasoning = result.reasoningSummary.toLowerCase();
      expect(lowerReasoning).not.toContain('step 1');
      expect(lowerReasoning).not.toContain('algorithm');
      expect(lowerReasoning).not.toContain('workflow');
      expect(lowerReasoning).not.toContain('processing');
      expect(lowerReasoning).not.toContain('debug');
      expect(lowerReasoning).not.toContain('chain-of-thought');
      expect(lowerReasoning).not.toContain('internal note');
      expect(lowerReasoning).not.toContain('audit log');
      expect(lowerReasoning).not.toContain('metadata');

      // Should have meaningful business-focused content
      expect(result.reasoningSummary.length).toBeGreaterThan(20);
      expect(result.reasoningSummary).toMatch(/[.!?]$/); // Should end with punctuation
    });
  });
});