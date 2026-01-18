/**
 * Core data model interfaces for the Intent-Driven Cold Outreach Agent
 * Based on the design document specifications
 */

export enum SignalType {
  JOB_CHANGE = 'job_change',
  FUNDING_EVENT = 'funding_event',
  TECHNOLOGY_ADOPTION = 'technology_adoption',
  COMPANY_GROWTH = 'company_growth',
  INDUSTRY_TREND = 'industry_trend',
}

export enum CompanySize {
  STARTUP = 'startup',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  ENTERPRISE = 'enterprise',
}

export enum ConfidenceLevel {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export enum StrategyType {
  DIRECT_VALUE_ALIGNMENT = 'direct_value_alignment',
  INSIGHT_LED_OBSERVATION = 'insight_led_observation',
  SOFT_CURIOSITY = 'soft_curiosity',
}

export enum CallToActionLevel {
  NONE = 'none',
  SOFT = 'soft',
  DIRECT = 'direct',
}

export enum FollowUpTiming {
  IMMEDIATE = 'immediate',
  ONE_WEEK = 'one_week',
  TWO_WEEKS = 'two_weeks',
  ONE_MONTH = 'one_month',
}

export interface ContactDetails {
  email: string;
  name: string;
  linkedinUrl?: string;
  phoneNumber?: string;
}

export interface CompanyContext {
  name: string;
  industry: string;
  size: CompanySize;
  recentEvents?: string[];
}

export interface ProspectData {
  role: string;
  companyContext: CompanyContext;
  contactDetails: ContactDetails;
  additionalContext?: Record<string, unknown>;
}

export interface IntentSignal {
  type: SignalType;
  description: string;
  timestamp: Date;
  relevanceScore: number;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface WeightedSignal extends IntentSignal {
  weight: number;
  freshnessScore: number;
}

export interface IntentHypothesis {
  primaryReason: string;
  supportingEvidence: string[];
  confidenceFactors: string[];
  conservativeAssumptions: string[];
}

export interface MessageStrategy {
  type: StrategyType;
  toneGuidelines: string[];
  contentFocus: string;
  callToActionLevel: CallToActionLevel;
}

export interface ProcessingMetadata {
  workflowSteps: string[];
  executionTime: number;
  auditLog: AuditLogEntry[];
  version: string;
}

export interface AuditLogEntry {
  step: string;
  timestamp: Date;
  status: 'started' | 'completed' | 'failed';
  details?: Record<string, unknown>;
}

export interface StructuredOutput {
  intentConfidence: ConfidenceLevel;
  reasoningSummary: string; // 1-2 sentences
  recommendedMessage: string;
  alternativeMessages: [string, string]; // exactly 2 alternatives
  suggestedFollowUpTiming: FollowUpTiming;
  processingMetadata: ProcessingMetadata;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  impact: 'low' | 'medium' | 'high';
}

export interface AuthenticityResult {
  isAuthentic: boolean;
  issues: AuthenticityIssue[];
  revisionRequired: boolean;
  score: number; // 0-100
}

export interface AuthenticityIssue {
  type: 'template' | 'artificial_language' | 'overly_salesy' | 'buzzwords';
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export interface ProcessingError {
  code: string;
  message: string;
  step: string;
  context?: Record<string, unknown>;
  remediation?: string;
}