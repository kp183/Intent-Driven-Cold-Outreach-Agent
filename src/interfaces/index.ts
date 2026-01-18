/**
 * Core component interfaces for the Intent-Driven Cold Outreach Agent
 * Defines the contracts for all major system components
 */

import {
  ProspectData,
  IntentSignal,
  WeightedSignal,
  IntentHypothesis,
  ConfidenceLevel,
  MessageStrategy,
  StructuredOutput,
  ValidationResult,
  AuthenticityResult,
  ProcessingError,
  ProcessingMetadata,
  AuditLogEntry,
} from '../types';

export interface IInputValidator {
  validateInput(
    prospectData: ProspectData,
    intentSignals: IntentSignal[]
  ): ValidationResult;
}

export interface ISignalInterpreter {
  interpretSignals(intentSignals: IntentSignal[]): WeightedSignal[];
}

export interface IHypothesisFormer {
  formHypothesis(weightedSignals: WeightedSignal[]): IntentHypothesis;
}

export interface IConfidenceScorer {
  scoreConfidence(
    hypothesis: IntentHypothesis,
    signals: WeightedSignal[]
  ): ConfidenceLevel;
}

export interface IStrategySelector {
  selectStrategy(confidenceLevel: ConfidenceLevel): MessageStrategy;
}

export interface IMessageGenerator {
  generateMessage(
    strategy: MessageStrategy,
    hypothesis: IntentHypothesis,
    prospectData: ProspectData
  ): string;
}

export interface IAuthenticityFilter {
  evaluateAuthenticity(
    message: string,
    confidenceLevel: ConfidenceLevel
  ): AuthenticityResult;
}

export interface IOutputAssembler {
  assembleOutput(
    message: string,
    confidence: ConfidenceLevel,
    reasoning: string,
    alternatives: [string, string],
    metadata: ProcessingMetadata
  ): StructuredOutput;
  
  generateAlternativeMessages(
    originalStrategy: MessageStrategy,
    hypothesis: IntentHypothesis,
    prospectData: ProspectData,
    confidence: ConfidenceLevel
  ): [string, string];
}

export interface IReasoningAgent {
  processOutreachRequest(
    prospectData: ProspectData,
    intentSignals: IntentSignal[]
  ): Promise<StructuredOutput | ProcessingError>;
}

export interface IAuditLogger {
  logStep(step: string, status: 'started' | 'completed' | 'failed', details?: Record<string, unknown>): void;
  getAuditLog(): AuditLogEntry[];
  clearLog(): void;
}

export interface IWorkflowOrchestrator {
  executeWorkflow(
    prospectData: ProspectData,
    intentSignals: IntentSignal[]
  ): Promise<StructuredOutput | ProcessingError>;
}