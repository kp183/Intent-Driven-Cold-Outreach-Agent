/**
 * ReasoningAgent - Main orchestrator for the 7-step workflow
 * 
 * Implements the complete Intent-Driven Cold Outreach Agent workflow:
 * 1. Input Validation
 * 2. Signal Interpretation  
 * 3. Hypothesis Formation
 * 4. Confidence Scoring
 * 5. Strategy Selection
 * 6. Message Generation
 * 7. Authenticity & Spam Self-Evaluation + Output Assembly
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import {
  IReasoningAgent,
  IInputValidator,
  ISignalInterpreter,
  IHypothesisFormer,
  IConfidenceScorer,
  IStrategySelector,
  IMessageGenerator,
  IAuthenticityFilter,
  IOutputAssembler,
} from '../interfaces';
import {
  ProspectData,
  IntentSignal,
  StructuredOutput,
  ProcessingError,
  ProcessingMetadata,
  AuditLogEntry,
  WeightedSignal,
  IntentHypothesis,
  ConfidenceLevel,
  MessageStrategy,
  AuthenticityResult,
} from '../types';

export class ReasoningAgent implements IReasoningAgent {
  private auditLog: AuditLogEntry[] = [];
  private readonly MAX_REVISION_ATTEMPTS = 3;
  private readonly WORKFLOW_VERSION = '1.0.0';

  constructor(
    private inputValidator: IInputValidator,
    private signalInterpreter: ISignalInterpreter,
    private hypothesisFormer: IHypothesisFormer,
    private confidenceScorer: IConfidenceScorer,
    private strategySelector: IStrategySelector,
    private messageGenerator: IMessageGenerator,
    private authenticityFilter: IAuthenticityFilter,
    private outputAssembler: IOutputAssembler
  ) {}

  /**
   * Processes outreach request through the complete 7-step workflow
   * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
   */
  async processOutreachRequest(
    prospectData: ProspectData,
    intentSignals: IntentSignal[]
  ): Promise<StructuredOutput | ProcessingError> {
    const startTime = Date.now();
    this.clearAuditLog();

    try {
      // Step 1: Input Validation (Requirement 9.1, 9.2)
      const validationResult = await this.executeStep(
        'input_validation',
        () => this.inputValidator.validateInput(prospectData, intentSignals)
      );

      if (!validationResult.isValid) {
        return this.createProcessingError(
          'VALIDATION_FAILED',
          'Input validation failed',
          'input_validation',
          { errors: validationResult.errors, warnings: validationResult.warnings }
        );
      }

      // Step 2: Signal Interpretation (Requirement 9.1, 9.2)
      const weightedSignals = await this.executeStep(
        'signal_interpretation',
        () => this.signalInterpreter.interpretSignals(intentSignals)
      );

      // Step 3: Hypothesis Formation (Requirement 9.1, 9.2)
      const hypothesis = await this.executeStep(
        'hypothesis_formation',
        () => this.hypothesisFormer.formHypothesis(weightedSignals)
      );

      // Step 4: Confidence Scoring (Requirement 9.1, 9.2)
      const confidence = await this.executeStep(
        'confidence_scoring',
        () => this.confidenceScorer.scoreConfidence(hypothesis, weightedSignals)
      );

      // Step 5: Strategy Selection (Requirement 9.1, 9.2)
      const strategy = await this.executeStep(
        'strategy_selection',
        () => this.strategySelector.selectStrategy(confidence)
      );

      // Step 6: Message Generation (Requirement 9.1, 9.2)
      const message = await this.executeStep(
        'message_generation',
        () => this.messageGenerator.generateMessage(strategy, hypothesis, prospectData)
      );

      // Step 7: Authenticity & Spam Self-Evaluation + Output Assembly (Requirement 9.1, 9.2)
      const finalMessage = await this.executeStep(
        'authenticity_filtering',
        () => this.processMessageWithAuthenticity(message, confidence, strategy, hypothesis, prospectData)
      );

      // Generate alternative messages
      const alternatives = await this.executeStep(
        'alternative_generation',
        () => this.outputAssembler.generateAlternativeMessages(strategy, hypothesis, prospectData, confidence)
      );

      // Assemble final output
      const output = await this.executeStep(
        'output_assembly',
        () => {
          const executionTime = Date.now() - startTime;
          const metadata = this.createProcessingMetadata(executionTime);
          const reasoningSummary = this.generateReasoningSummary(hypothesis, confidence);
          
          return this.outputAssembler.assembleOutput(
            finalMessage,
            confidence,
            reasoningSummary,
            alternatives,
            metadata
          );
        }
      );

      return output;

    } catch (error) {
      // Requirement 9.4: Halt processing and return error on step failure
      return this.handleWorkflowError(error, startTime);
    }
  }

  /**
   * Executes a workflow step with audit logging and error handling
   * Requirements: 9.2, 9.3, 9.4
   */
  private async executeStep<T>(
    stepName: string,
    stepFunction: () => T | Promise<T>
  ): Promise<T> {
    this.logStepStart(stepName);

    try {
      const result = await stepFunction();
      this.logStepComplete(stepName, { success: true });
      return result;
    } catch (error) {
      this.logStepFailed(stepName, error);
      throw error; // Re-throw to trigger workflow halt (Requirement 9.4)
    }
  }

  /**
   * Processes message through authenticity filter with revision attempts
   * Requirements: 7.4 (revision trigger mechanism)
   */
  private async processMessageWithAuthenticity(
    message: string,
    confidence: ConfidenceLevel,
    strategy: MessageStrategy,
    hypothesis: IntentHypothesis,
    prospectData: ProspectData
  ): Promise<string> {
    let currentMessage = message;
    let revisionAttempts = 0;

    while (revisionAttempts < this.MAX_REVISION_ATTEMPTS) {
      const authenticityResult = this.authenticityFilter.evaluateAuthenticity(
        currentMessage,
        confidence
      );

      if (authenticityResult.isAuthentic && !authenticityResult.revisionRequired) {
        return currentMessage;
      }

      // If revision is required and we haven't exceeded max attempts
      if (authenticityResult.revisionRequired && revisionAttempts < this.MAX_REVISION_ATTEMPTS - 1) {
        revisionAttempts++;
        this.logStepStart(`authenticity_revision_${revisionAttempts}`);
        
        // Generate a new message with slight variations to address authenticity issues
        currentMessage = this.messageGenerator.generateMessage(strategy, hypothesis, prospectData);
        
        this.logStepComplete(`authenticity_revision_${revisionAttempts}`, {
          attempt: revisionAttempts,
          issues: authenticityResult.issues.length
        });
      } else {
        // Max attempts reached or other issue
        break;
      }
    }

    // If we still have authenticity issues after max attempts, log but continue
    if (revisionAttempts >= this.MAX_REVISION_ATTEMPTS) {
      this.logStepComplete('authenticity_filtering', {
        maxAttemptsReached: true,
        finalScore: this.authenticityFilter.evaluateAuthenticity(currentMessage, confidence).score
      });
    }

    return currentMessage;
  }

  /**
   * Generates reasoning summary for output
   */
  private generateReasoningSummary(
    hypothesis: IntentHypothesis,
    confidence: ConfidenceLevel
  ): string {
    const confidenceText = confidence.toLowerCase();
    const primaryReason = hypothesis.primaryReason;
    
    return `${confidenceText} confidence assessment based on available signals. ${primaryReason}`;
  }

  /**
   * Creates processing metadata with audit log
   * Requirements: 9.3
   */
  private createProcessingMetadata(executionTime: number): ProcessingMetadata {
    return {
      workflowSteps: this.getExecutedSteps(),
      executionTime,
      auditLog: [...this.auditLog], // Create copy to prevent mutation
      version: this.WORKFLOW_VERSION,
    };
  }

  /**
   * Gets list of executed workflow steps
   */
  private getExecutedSteps(): string[] {
    return this.auditLog
      .filter(entry => entry.status === 'completed')
      .map(entry => entry.step)
      .filter((step, index, array) => array.indexOf(step) === index); // Remove duplicates
  }

  /**
   * Logs the start of a workflow step
   * Requirements: 9.3
   */
  private logStepStart(step: string): void {
    this.auditLog.push({
      step,
      timestamp: new Date(),
      status: 'started',
    });
  }

  /**
   * Logs successful completion of a workflow step
   * Requirements: 9.3
   */
  private logStepComplete(step: string, details?: Record<string, unknown>): void {
    this.auditLog.push({
      step,
      timestamp: new Date(),
      status: 'completed',
      details,
    });
  }

  /**
   * Logs failure of a workflow step
   * Requirements: 9.3
   */
  private logStepFailed(step: string, error: unknown): void {
    this.auditLog.push({
      step,
      timestamp: new Date(),
      status: 'failed',
      details: {
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      },
    });
  }

  /**
   * Clears the audit log for a new processing request
   * Requirements: 9.3
   */
  private clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Creates a processing error with context
   * Requirements: 9.4
   */
  private createProcessingError(
    code: string,
    message: string,
    step: string,
    context?: Record<string, unknown>
  ): ProcessingError {
    return {
      code,
      message,
      step,
      context,
      remediation: this.getRemediationSuggestion(code),
    };
  }

  /**
   * Handles workflow errors and creates appropriate error responses
   * Requirements: 9.4
   */
  private handleWorkflowError(error: unknown, startTime: number): ProcessingError {
    const executionTime = Date.now() - startTime;
    const failedStep = this.getLastFailedStep();
    
    let errorMessage = 'Workflow execution failed';
    let errorCode = 'WORKFLOW_ERROR';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorCode = error.name || 'WORKFLOW_ERROR';
    }

    return {
      code: errorCode,
      message: errorMessage,
      step: failedStep || 'unknown',
      context: {
        executionTime,
        auditLog: this.auditLog,
        totalSteps: this.auditLog.length,
      },
      remediation: this.getRemediationSuggestion(errorCode),
    };
  }

  /**
   * Gets the last failed step from audit log
   */
  private getLastFailedStep(): string | undefined {
    const failedEntries = this.auditLog.filter(entry => entry.status === 'failed');
    return failedEntries.length > 0 ? failedEntries[failedEntries.length - 1].step : undefined;
  }

  /**
   * Provides remediation suggestions based on error code
   */
  private getRemediationSuggestion(errorCode: string): string {
    const suggestions: Record<string, string> = {
      'VALIDATION_FAILED': 'Ensure all required fields are provided and intent signals meet minimum requirements',
      'SIGNAL_INTERPRETATION_ERROR': 'Verify intent signals have valid timestamps and relevance scores',
      'HYPOTHESIS_FORMATION_ERROR': 'Check that weighted signals contain sufficient information for hypothesis formation',
      'CONFIDENCE_SCORING_ERROR': 'Ensure hypothesis and signals are properly formatted',
      'STRATEGY_SELECTION_ERROR': 'Verify confidence level is valid (High, Medium, or Low)',
      'MESSAGE_GENERATION_ERROR': 'Check that strategy, hypothesis, and prospect data are complete',
      'AUTHENTICITY_FILTER_ERROR': 'Verify message content and confidence level are valid',
      'OUTPUT_ASSEMBLY_ERROR': 'Ensure all required components are available for output assembly',
      'WORKFLOW_ERROR': 'Review input data and try again, or contact support if the issue persists',
    };

    return suggestions[errorCode] || 'Review the error details and input data, then retry the request';
  }

  /**
   * Gets the current audit log (for testing and debugging)
   * Requirements: 9.3
   */
  public getAuditLog(): AuditLogEntry[] {
    return [...this.auditLog]; // Return copy to prevent external mutation
  }

  /**
   * Checks if workflow execution is deterministic for identical inputs
   * Requirements: 9.5
   */
  public async validateDeterministicExecution(
    prospectData: ProspectData,
    intentSignals: IntentSignal[]
  ): Promise<boolean> {
    // Execute the workflow twice with identical inputs
    const result1 = await this.processOutreachRequest(prospectData, intentSignals);
    const result2 = await this.processOutreachRequest(prospectData, intentSignals);

    // Compare results (excluding timestamps and execution times)
    if ('code' in result1 || 'code' in result2) {
      // If either result is an error, they should both be errors with the same code
      return 'code' in result1 && 'code' in result2 && result1.code === result2.code;
    }

    // Compare structured outputs (excluding metadata timestamps)
    return (
      result1.intentConfidence === result2.intentConfidence &&
      result1.reasoningSummary === result2.reasoningSummary &&
      result1.recommendedMessage === result2.recommendedMessage &&
      result1.suggestedFollowUpTiming === result2.suggestedFollowUpTiming
      // Note: We don't compare alternativeMessages as they may have intentional variation
    );
  }
}