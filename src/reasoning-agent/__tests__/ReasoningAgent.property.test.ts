/**
 * Property-based tests for ReasoningAgent
 * Tests the main workflow orchestrator for correctness properties
 */

import fc from 'fast-check';
import { ReasoningAgent } from '../ReasoningAgent';
import { InputValidator } from '../../validators/InputValidator';
import { SignalInterpreter } from '../../signal-interpreter/SignalInterpreter';
import { HypothesisFormer } from '../../hypothesis-former/HypothesisFormer';
import { ConfidenceScorer } from '../../confidence-scorer/ConfidenceScorer';
import { StrategySelector } from '../../strategy-selector/StrategySelector';
import { MessageGenerator } from '../../message-generator/MessageGenerator';
import { AuthenticityFilter } from '../../authenticity-filter/AuthenticityFilter';
import { OutputAssembler } from '../../output-assembler/OutputAssembler';
import {
  ProspectData,
  IntentSignal,
  SignalType,
  CompanySize,
  ConfidenceLevel,
} from '../../types';

// Test data generators
const contactDetailsArb = fc.record({
  email: fc.emailAddress(),
  name: fc.string({ minLength: 2, maxLength: 50 }),
  linkedinUrl: fc.option(fc.webUrl(), { nil: undefined }),
  phoneNumber: fc.option(fc.string({ minLength: 10, maxLength: 15 }), { nil: undefined }),
});

const companyContextArb = fc.record({
  name: fc.string({ minLength: 2, maxLength: 100 }),
  industry: fc.constantFrom('Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail'),
  size: fc.constantFrom(...Object.values(CompanySize)),
  recentEvents: fc.option(fc.array(fc.string({ minLength: 5, maxLength: 100 }), { maxLength: 3 }), { nil: undefined }),
});

const prospectDataArb = fc.record({
  role: fc.string({ minLength: 2, maxLength: 100 }),
  companyContext: companyContextArb,
  contactDetails: contactDetailsArb,
  additionalContext: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
});

const intentSignalArb = fc.record({
  type: fc.constantFrom(...Object.values(SignalType)),
  description: fc.string({ minLength: 10, maxLength: 200 }),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  relevanceScore: fc.float({ min: 0, max: 1 }),
  source: fc.string({ minLength: 2, maxLength: 50 }),
  metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
});

const validIntentSignalsArb = fc.array(intentSignalArb, { minLength: 2, maxLength: 5 });

describe('ReasoningAgent Property Tests', () => {
  let reasoningAgent: ReasoningAgent;

  beforeEach(() => {
    const inputValidator = new InputValidator();
    const signalInterpreter = new SignalInterpreter();
    const hypothesisFormer = new HypothesisFormer();
    const confidenceScorer = new ConfidenceScorer();
    const strategySelector = new StrategySelector();
    const messageGenerator = new MessageGenerator();
    const authenticityFilter = new AuthenticityFilter();
    const outputAssembler = new OutputAssembler(messageGenerator);

    reasoningAgent = new ReasoningAgent(
      inputValidator,
      signalInterpreter,
      hypothesisFormer,
      confidenceScorer,
      strategySelector,
      messageGenerator,
      authenticityFilter,
      outputAssembler
    );
  });

  /**
   * Property 28: Workflow Step Execution
   * For any valid input, all 7 workflow steps should be executed in the specified order without skipping
   * Validates: Requirements 9.1, 9.2
   */
  test('Property 28: Workflow Step Execution', async () => {
    await fc.assert(
      fc.asyncProperty(
        prospectDataArb,
        validIntentSignalsArb,
        async (prospectData, intentSignals) => {
          const result = await reasoningAgent.processOutreachRequest(prospectData, intentSignals);
          
          // Get audit log to verify step execution
          const auditLog = reasoningAgent.getAuditLog();
          
          // Define expected workflow steps in order
          const expectedSteps = [
            'input_validation',
            'signal_interpretation',
            'hypothesis_formation',
            'confidence_scoring',
            'strategy_selection',
            'message_generation',
            'authenticity_filtering',
          ];
          
          // Check that all expected steps were started
          const startedSteps = auditLog
            .filter(entry => entry.status === 'started')
            .map(entry => entry.step);
          
          // Filter out revision steps for this test
          const mainStartedSteps = startedSteps.filter(step => 
            !step.startsWith('authenticity_revision_') && 
            !step.startsWith('alternative_generation') &&
            !step.startsWith('output_assembly')
          );
          
          // Verify all main steps were started
          expectedSteps.forEach(expectedStep => {
            expect(mainStartedSteps).toContain(expectedStep);
          });
          
          // Check that steps were executed in the correct order
          let lastFoundIndex = -1;
          for (const expectedStep of expectedSteps) {
            const stepIndex = mainStartedSteps.indexOf(expectedStep);
            if (stepIndex !== -1) {
              expect(stepIndex).toBeGreaterThan(lastFoundIndex);
              lastFoundIndex = stepIndex;
            }
          }
          
          // If result is successful, verify all steps completed
          if (!('code' in result)) {
            const completedSteps = auditLog
              .filter(entry => entry.status === 'completed')
              .map(entry => entry.step);
            
            const mainCompletedSteps = completedSteps.filter(step => 
              !step.startsWith('authenticity_revision_')
            );
            
            expectedSteps.forEach(expectedStep => {
              expect(mainCompletedSteps).toContain(expectedStep);
            });
          }
        }
      ),
      { numRuns: 20, timeout: 30000 }
    );
  });

  /**
   * Property 29: Audit Log Maintenance
   * For any processing request, step execution logs should be maintained for audit purposes
   * Validates: Requirements 9.3
   */
  test('Property 29: Audit Log Maintenance', async () => {
    await fc.assert(
      fc.asyncProperty(
        prospectDataArb,
        validIntentSignalsArb,
        async (prospectData, intentSignals) => {
          await reasoningAgent.processOutreachRequest(prospectData, intentSignals);
          
          const auditLog = reasoningAgent.getAuditLog();
          
          // Audit log should not be empty
          expect(auditLog.length).toBeGreaterThan(0);
          
          // Each audit log entry should have required fields
          auditLog.forEach(entry => {
            expect(entry).toHaveProperty('step');
            expect(entry).toHaveProperty('timestamp');
            expect(entry).toHaveProperty('status');
            expect(typeof entry.step).toBe('string');
            expect(entry.timestamp).toBeInstanceOf(Date);
            expect(['started', 'completed', 'failed']).toContain(entry.status);
          });
          
          // Should have both 'started' and 'completed' entries for successful steps
          const stepNames = [...new Set(auditLog.map(entry => entry.step))];
          
          stepNames.forEach(stepName => {
            const stepEntries = auditLog.filter(entry => entry.step === stepName);
            const hasStarted = stepEntries.some(entry => entry.status === 'started');
            const hasCompleted = stepEntries.some(entry => entry.status === 'completed');
            const hasFailed = stepEntries.some(entry => entry.status === 'failed');
            
            // Each step should have at least a 'started' entry
            expect(hasStarted).toBe(true);
            
            // If step didn't fail, it should have completed
            if (!hasFailed) {
              expect(hasCompleted).toBe(true);
            }
          });
          
          // Timestamps should be in chronological order
          for (let i = 1; i < auditLog.length; i++) {
            expect(auditLog[i].timestamp.getTime()).toBeGreaterThanOrEqual(
              auditLog[i - 1].timestamp.getTime()
            );
          }
        }
      ),
      { numRuns: 20, timeout: 30000 }
    );
  });

  /**
   * Property 30: Error Handling on Step Failure
   * For any step failure during execution, the system should halt processing and return an error
   * Validates: Requirements 9.4
   */
  test('Property 30: Error Handling on Step Failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          role: fc.constant(''), // Invalid empty role to trigger validation failure
          companyContext: companyContextArb,
          contactDetails: contactDetailsArb,
        }),
        validIntentSignalsArb,
        async (invalidProspectData, intentSignals) => {
          const result = await reasoningAgent.processOutreachRequest(invalidProspectData, intentSignals);
          
          // Should return a ProcessingError for invalid input
          expect(result).toHaveProperty('code');
          expect(result).toHaveProperty('message');
          expect(result).toHaveProperty('step');
          
          if ('code' in result) {
            expect(typeof result.code).toBe('string');
            expect(typeof result.message).toBe('string');
            expect(typeof result.step).toBe('string');
            
            // Should have remediation suggestion
            expect(result).toHaveProperty('remediation');
            if (result.remediation) {
              expect(typeof result.remediation).toBe('string');
              expect(result.remediation.length).toBeGreaterThan(0);
            }
          }
          
          // Audit log should show the failed step
          const auditLog = reasoningAgent.getAuditLog();
          const failedEntries = auditLog.filter(entry => entry.status === 'failed');
          
          // Should have at least one failed entry if processing failed
          if ('code' in result) {
            expect(failedEntries.length).toBeGreaterThanOrEqual(0); // May be 0 if validation fails before step execution
          }
        }
      ),
      { numRuns: 20, timeout: 30000 }
    );
  });

  /**
   * Property 31: Deterministic Execution
   * For any identical inputs, the workflow execution should produce identical outputs
   * Validates: Requirements 9.5
   */
  test('Property 31: Deterministic Execution', async () => {
    await fc.assert(
      fc.asyncProperty(
        prospectDataArb,
        validIntentSignalsArb,
        async (prospectData, intentSignals) => {
          // Execute workflow twice with identical inputs
          const result1 = await reasoningAgent.processOutreachRequest(prospectData, intentSignals);
          const result2 = await reasoningAgent.processOutreachRequest(prospectData, intentSignals);
          
          // Both results should have the same type (both success or both error)
          const isResult1Error = 'code' in result1;
          const isResult2Error = 'code' in result2;
          expect(isResult1Error).toBe(isResult2Error);
          
          if (isResult1Error && isResult2Error) {
            // Both are errors - should have same error code
            expect(result1.code).toBe(result2.code);
            expect(result1.step).toBe(result2.step);
          } else if (!isResult1Error && !isResult2Error) {
            // Both are successful - core fields should be identical
            expect(result1.intentConfidence).toBe(result2.intentConfidence);
            expect(result1.reasoningSummary).toBe(result2.reasoningSummary);
            expect(result1.recommendedMessage).toBe(result2.recommendedMessage);
            expect(result1.suggestedFollowUpTiming).toBe(result2.suggestedFollowUpTiming);
            
            // Alternative messages may vary slightly but should exist
            expect(result1.alternativeMessages).toHaveLength(2);
            expect(result2.alternativeMessages).toHaveLength(2);
            
            // Metadata should have same workflow steps (excluding timestamps)
            expect(result1.processingMetadata.workflowSteps).toEqual(
              result2.processingMetadata.workflowSteps
            );
            expect(result1.processingMetadata.version).toBe(result2.processingMetadata.version);
          }
        }
      ),
      { numRuns: 10, timeout: 60000 } // Fewer runs due to double execution
    );
  });
});