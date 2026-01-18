/**
 * Intent-Driven Cold Outreach Agent
 * Main entry point for the system
 * 
 * Public API for processing outreach requests with comprehensive error handling
 * and response formatting. Provides usage examples and documentation.
 * 
 * Requirements: All requirements (integration)
 */

// Export all types and interfaces for external use
export * from './types';
export * from './interfaces';

// Export core components for advanced usage
export * from './validators';
export * from './signal-interpreter';
export * from './hypothesis-former';
export * from './confidence-scorer';
export * from './strategy-selector';
export * from './message-generator';
export * from './authenticity-filter';
export * from './output-assembler';
export * from './reasoning-agent';

import { ReasoningAgent } from './reasoning-agent';
import { InputValidator } from './validators';
import { SignalInterpreter } from './signal-interpreter';
import { HypothesisFormer } from './hypothesis-former';
import { ConfidenceScorer } from './confidence-scorer';
import { StrategySelector } from './strategy-selector';
import { MessageGenerator } from './message-generator';
import { AuthenticityFilter } from './authenticity-filter';
import { OutputAssembler } from './output-assembler';
import {
  ProspectData,
  IntentSignal,
  StructuredOutput,
  ProcessingError,
  ValidationResult,
  SignalType,
  CompanySize,
  ConfidenceLevel,
  StrategyType,
  CallToActionLevel,
  FollowUpTiming,
} from './types';

/**
 * Configuration options for the Intent-Driven Cold Outreach Agent
 */
export interface AgentConfig {
  /** Enable verbose logging for debugging */
  enableVerboseLogging?: boolean;
  /** Maximum number of authenticity revision attempts */
  maxRevisionAttempts?: number;
  /** Custom buzzword list for authenticity filtering */
  customBuzzwords?: string[];
  /** Timeout for processing requests in milliseconds */
  processingTimeout?: number;
}

/**
 * Main API interface for the Intent-Driven Cold Outreach Agent
 * 
 * This class provides a simple, production-ready interface for generating
 * personalized outreach messages based on prospect data and intent signals.
 * 
 * @example
 * ```typescript
 * import { IntentDrivenOutreachAgent, ProspectData, IntentSignal, SignalType, CompanySize } from 'intent-driven-cold-outreach-agent';
 * 
 * const agent = new IntentDrivenOutreachAgent();
 * 
 * const prospectData: ProspectData = {
 *   role: 'VP of Engineering',
 *   companyContext: {
 *     name: 'TechCorp Inc',
 *     industry: 'Software',
 *     size: CompanySize.MEDIUM
 *   },
 *   contactDetails: {
 *     name: 'John Smith',
 *     email: 'john.smith@techcorp.com'
 *   }
 * };
 * 
 * const intentSignals: IntentSignal[] = [
 *   {
 *     type: SignalType.FUNDING_EVENT,
 *     description: 'Company raised Series B funding',
 *     timestamp: new Date('2024-01-15'),
 *     relevanceScore: 0.9,
 *     source: 'TechCrunch'
 *   },
 *   {
 *     type: SignalType.TECHNOLOGY_ADOPTION,
 *     description: 'Migrating to cloud infrastructure',
 *     timestamp: new Date('2024-01-10'),
 *     relevanceScore: 0.8,
 *     source: 'LinkedIn'
 *   }
 * ];
 * 
 * const result = await agent.processOutreachRequest(prospectData, intentSignals);
 * 
 * if ('code' in result) {
 *   console.error('Processing failed:', result.message);
 * } else {
 *   console.log('Recommended message:', result.recommendedMessage);
 *   console.log('Confidence level:', result.intentConfidence);
 * }
 * ```
 */
export class IntentDrivenOutreachAgent {
  private reasoningAgent: ReasoningAgent;
  private config: Required<AgentConfig>;

  /**
   * Creates a new Intent-Driven Cold Outreach Agent instance
   * 
   * @param config Optional configuration for the agent
   */
  constructor(config: AgentConfig = {}) {
    this.config = {
      enableVerboseLogging: config.enableVerboseLogging ?? false,
      maxRevisionAttempts: config.maxRevisionAttempts ?? 3,
      customBuzzwords: config.customBuzzwords ?? [],
      processingTimeout: config.processingTimeout ?? 30000, // 30 seconds
    };

    // Initialize all components with configuration
    const inputValidator = new InputValidator();
    const signalInterpreter = new SignalInterpreter();
    const hypothesisFormer = new HypothesisFormer();
    const confidenceScorer = new ConfidenceScorer();
    const strategySelector = new StrategySelector();
    const messageGenerator = new MessageGenerator();
    const authenticityFilter = new AuthenticityFilter();
    const outputAssembler = new OutputAssembler(messageGenerator);

    this.reasoningAgent = new ReasoningAgent(
      inputValidator,
      signalInterpreter,
      hypothesisFormer,
      confidenceScorer,
      strategySelector,
      messageGenerator,
      authenticityFilter,
      outputAssembler
    );
  }

  /**
   * Processes an outreach request through the complete 7-step workflow
   * 
   * @param prospectData Information about the target prospect
   * @param intentSignals Array of intent signals indicating prospect interest
   * @returns Promise resolving to structured output or processing error
   * 
   * @example
   * ```typescript
   * const result = await agent.processOutreachRequest(prospectData, intentSignals);
   * 
   * if ('code' in result) {
   *   // Handle error
   *   console.error(`Error ${result.code}: ${result.message}`);
   *   console.log('Remediation:', result.remediation);
   * } else {
   *   // Use successful result
   *   console.log('Message:', result.recommendedMessage);
   *   console.log('Alternatives:', result.alternativeMessages);
   *   console.log('Follow-up timing:', result.suggestedFollowUpTiming);
   * }
   * ```
   */
  async processOutreachRequest(
    prospectData: ProspectData,
    intentSignals: IntentSignal[]
  ): Promise<StructuredOutput | ProcessingError> {
    try {
      // Validate inputs before processing
      const validationResult = this.validateInputs(prospectData, intentSignals);
      if (!validationResult.isValid) {
        return this.createValidationError(validationResult);
      }

      // Process with timeout
      const processingPromise = this.reasoningAgent.processOutreachRequest(
        prospectData,
        intentSignals
      );

      const timeoutPromise = new Promise<ProcessingError>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Processing timeout exceeded'));
        }, this.config.processingTimeout);
      });

      const result = await Promise.race([processingPromise, timeoutPromise]);

      // Log processing details if verbose logging is enabled
      if (this.config.enableVerboseLogging && !('code' in result)) {
        this.logProcessingDetails(result);
      }

      return result;

    } catch (error) {
      return this.handleProcessingError(error);
    }
  }

  /**
   * Validates prospect data and intent signals before processing
   * 
   * @param prospectData Prospect information to validate
   * @param intentSignals Intent signals to validate
   * @returns Validation result with errors and warnings
   */
  public validateInputs(
    prospectData: ProspectData,
    intentSignals: IntentSignal[]
  ): ValidationResult {
    const inputValidator = new InputValidator();
    return inputValidator.validateInput(prospectData, intentSignals);
  }

  /**
   * Gets the current configuration of the agent
   * 
   * @returns Current agent configuration
   */
  public getConfig(): Readonly<Required<AgentConfig>> {
    return { ...this.config };
  }

  /**
   * Updates the agent configuration
   * 
   * @param newConfig Partial configuration to update
   */
  public updateConfig(newConfig: Partial<AgentConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };

    // Reinitialize components if necessary
    if (newConfig.customBuzzwords !== undefined) {
      // Would need to reinitialize authenticity filter with new buzzwords
      // For now, log that restart is needed
      if (this.config.enableVerboseLogging) {
        console.log('Configuration updated. Restart agent to apply buzzword changes.');
      }
    }
  }

  /**
   * Gets processing statistics and health information
   * 
   * @returns Agent health and statistics
   */
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    config: Readonly<Required<AgentConfig>>;
    lastProcessingTime?: number;
  } {
    return {
      status: 'healthy', // Could be enhanced with actual health checks
      version: '1.0.0',
      config: this.getConfig(),
    };
  }

  /**
   * Creates a validation error from validation results
   */
  private createValidationError(validationResult: ValidationResult): ProcessingError {
    const errorMessages = validationResult.errors.map(e => `${e.field}: ${e.message}`);
    
    return {
      code: 'VALIDATION_FAILED',
      message: `Input validation failed: ${errorMessages.join(', ')}`,
      step: 'input_validation',
      context: {
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      },
      remediation: 'Ensure all required fields are provided and intent signals meet minimum requirements',
    };
  }

  /**
   * Handles unexpected processing errors
   */
  private handleProcessingError(error: unknown): ProcessingError {
    let message = 'An unexpected error occurred during processing';
    let code = 'PROCESSING_ERROR';

    if (error instanceof Error) {
      message = error.message;
      if (error.message.includes('timeout')) {
        code = 'PROCESSING_TIMEOUT';
        message = 'Processing request exceeded the configured timeout';
      }
    }

    return {
      code,
      message,
      step: 'unknown',
      context: {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      remediation: 'Review input data and try again. If the issue persists, contact support.',
    };
  }

  /**
   * Logs processing details for debugging
   */
  private logProcessingDetails(result: StructuredOutput): void {
    console.log('Processing completed successfully:');
    console.log(`- Confidence: ${result.intentConfidence}`);
    console.log(`- Execution time: ${result.processingMetadata.executionTime}ms`);
    console.log(`- Workflow steps: ${result.processingMetadata.workflowSteps.length}`);
    console.log(`- Message length: ${result.recommendedMessage.length} characters`);
  }
}

/**
 * Convenience function to create a new agent instance
 * 
 * @param config Optional configuration for the agent
 * @returns New IntentDrivenOutreachAgent instance
 * 
 * @example
 * ```typescript
 * import { createAgent } from 'intent-driven-cold-outreach-agent';
 * 
 * const agent = createAgent({
 *   enableVerboseLogging: true,
 *   processingTimeout: 60000
 * });
 * ```
 */
export function createAgent(config?: AgentConfig): IntentDrivenOutreachAgent {
  return new IntentDrivenOutreachAgent(config);
}

/**
 * Utility functions for working with the agent
 */
export const AgentUtils = {
  /**
   * Creates a basic prospect data object
   */
  createProspectData(
    name: string,
    email: string,
    role: string,
    companyName: string,
    industry: string,
    companySize: CompanySize
  ): ProspectData {
    return {
      role,
      companyContext: {
        name: companyName,
        industry,
        size: companySize,
      },
      contactDetails: {
        name,
        email,
      },
    };
  },

  /**
   * Creates a basic intent signal
   */
  createIntentSignal(
    type: SignalType,
    description: string,
    relevanceScore: number,
    source: string,
    daysAgo: number = 0
  ): IntentSignal {
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - daysAgo);

    return {
      type,
      description,
      timestamp,
      relevanceScore: Math.max(0, Math.min(1, relevanceScore)), // Clamp to 0-1
      source,
    };
  },

  /**
   * Validates that a confidence level is valid
   */
  isValidConfidenceLevel(level: string): level is ConfidenceLevel {
    return Object.values(ConfidenceLevel).includes(level as ConfidenceLevel);
  },

  /**
   * Validates that a signal type is valid
   */
  isValidSignalType(type: string): type is SignalType {
    return Object.values(SignalType).includes(type as SignalType);
  },

  /**
   * Gets human-readable description of follow-up timing
   */
  getFollowUpDescription(timing: FollowUpTiming): string {
    const descriptions: Record<FollowUpTiming, string> = {
      [FollowUpTiming.IMMEDIATE]: 'Follow up within 1-2 days',
      [FollowUpTiming.ONE_WEEK]: 'Follow up in about one week',
      [FollowUpTiming.TWO_WEEKS]: 'Follow up in 2-3 weeks',
      [FollowUpTiming.ONE_MONTH]: 'Follow up in about one month',
    };
    return descriptions[timing] || 'Follow up timing not specified';
  },
};