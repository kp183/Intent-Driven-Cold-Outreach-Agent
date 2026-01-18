/**
 * InputValidator - Validates prospect data and intent signals
 * Implements validation for required fields, signal quality, and timestamp validation
 * Requirements: 1.1, 1.3, 1.4
 */

import {
  IInputValidator,
} from '../interfaces';
import {
  ProspectData,
  IntentSignal,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types';

export class InputValidator implements IInputValidator {
  private static readonly MIN_INTENT_SIGNALS = 2;
  private static readonly MAX_SIGNAL_AGE_DAYS = 365; // 1 year

  /**
   * Validates prospect data and intent signals according to requirements
   * @param prospectData - The prospect information to validate
   * @param intentSignals - Array of intent signals to validate
   * @returns ValidationResult with errors and warnings
   */
  validateInput(
    prospectData: ProspectData,
    intentSignals: IntentSignal[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate prospect data structure and required fields (Requirement 1.1, 1.3)
    this.validateProspectData(prospectData, errors);

    // Validate intent signals (Requirement 1.1, 1.3)
    this.validateIntentSignals(intentSignals, errors, warnings);

    // Validate timestamps for freshness evaluation (Requirement 1.4)
    this.validateTimestamps(intentSignals, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates prospect data structure and required fields
   */
  private validateProspectData(
    prospectData: ProspectData,
    errors: ValidationError[]
  ): void {
    if (!prospectData) {
      errors.push({
        field: 'prospectData',
        message: 'Prospect data is required',
        code: 'MISSING_PROSPECT_DATA',
      });
      return;
    }

    // Validate role field (Requirement 1.1)
    if (!prospectData.role || typeof prospectData.role !== 'string' || prospectData.role.trim().length === 0) {
      errors.push({
        field: 'prospectData.role',
        message: 'Role is required and must be a non-empty string',
        code: 'MISSING_ROLE',
      });
    }

    // Validate company context (Requirement 1.1)
    if (!prospectData.companyContext) {
      errors.push({
        field: 'prospectData.companyContext',
        message: 'Company context is required',
        code: 'MISSING_COMPANY_CONTEXT',
      });
    } else {
      this.validateCompanyContext(prospectData.companyContext, errors);
    }

    // Validate contact details
    if (!prospectData.contactDetails) {
      errors.push({
        field: 'prospectData.contactDetails',
        message: 'Contact details are required',
        code: 'MISSING_CONTACT_DETAILS',
      });
    } else {
      this.validateContactDetails(prospectData.contactDetails, errors);
    }
  }

  /**
   * Validates company context fields
   */
  private validateCompanyContext(
    companyContext: any,
    errors: ValidationError[]
  ): void {
    if (!companyContext.name || typeof companyContext.name !== 'string' || companyContext.name.trim().length === 0) {
      errors.push({
        field: 'prospectData.companyContext.name',
        message: 'Company name is required and must be a non-empty string',
        code: 'MISSING_COMPANY_NAME',
      });
    }

    if (!companyContext.industry || typeof companyContext.industry !== 'string' || companyContext.industry.trim().length === 0) {
      errors.push({
        field: 'prospectData.companyContext.industry',
        message: 'Company industry is required and must be a non-empty string',
        code: 'MISSING_COMPANY_INDUSTRY',
      });
    }

    if (!companyContext.size) {
      errors.push({
        field: 'prospectData.companyContext.size',
        message: 'Company size is required',
        code: 'MISSING_COMPANY_SIZE',
      });
    }
  }

  /**
   * Validates contact details
   */
  private validateContactDetails(
    contactDetails: any,
    errors: ValidationError[]
  ): void {
    if (!contactDetails.name || typeof contactDetails.name !== 'string' || contactDetails.name.trim().length === 0) {
      errors.push({
        field: 'prospectData.contactDetails.name',
        message: 'Contact name is required and must be a non-empty string',
        code: 'MISSING_CONTACT_NAME',
      });
    }

    if (!contactDetails.email || typeof contactDetails.email !== 'string' || contactDetails.email.trim().length === 0) {
      errors.push({
        field: 'prospectData.contactDetails.email',
        message: 'Contact email is required and must be a non-empty string',
        code: 'MISSING_CONTACT_EMAIL',
      });
    } else if (!this.isValidEmail(contactDetails.email)) {
      errors.push({
        field: 'prospectData.contactDetails.email',
        message: 'Contact email must be a valid email address',
        code: 'INVALID_EMAIL_FORMAT',
      });
    }
  }

  /**
   * Validates intent signals array and individual signals
   */
  private validateIntentSignals(
    intentSignals: IntentSignal[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!Array.isArray(intentSignals)) {
      errors.push({
        field: 'intentSignals',
        message: 'Intent signals must be an array',
        code: 'INVALID_INTENT_SIGNALS_TYPE',
      });
      return;
    }

    // Requirement 1.1: At least 2 intent signals required
    if (intentSignals.length < InputValidator.MIN_INTENT_SIGNALS) {
      errors.push({
        field: 'intentSignals',
        message: `At least ${InputValidator.MIN_INTENT_SIGNALS} intent signals are required`,
        code: 'INSUFFICIENT_INTENT_SIGNALS',
      });
    }

    // Validate each individual signal
    intentSignals.forEach((signal, index) => {
      this.validateIndividualSignal(signal, index, errors, warnings);
    });

    // Check for weak signals (Requirement 1.2 - confidence reduction)
    // Only check signals that have valid timestamps to avoid runtime errors
    const validSignals = intentSignals.filter(signal => 
      signal && signal.timestamp && !isNaN(new Date(signal.timestamp).getTime())
    );
    
    const weakSignals = validSignals.filter(signal => 
      signal.relevanceScore < 0.3 || this.isSignalOld(signal.timestamp)
    );
    
    if (weakSignals.length > 0) {
      warnings.push({
        field: 'intentSignals',
        message: `${weakSignals.length} weak or old signals detected - confidence will be reduced`,
        impact: 'medium',
      });
    }
  }

  /**
   * Validates individual intent signal structure and content
   */
  private validateIndividualSignal(
    signal: any,
    index: number,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const fieldPrefix = `intentSignals[${index}]`;

    if (!signal || typeof signal !== 'object') {
      errors.push({
        field: fieldPrefix,
        message: 'Intent signal must be an object',
        code: 'INVALID_SIGNAL_TYPE',
      });
      return;
    }

    // Validate required fields
    if (!signal.type || typeof signal.type !== 'string') {
      errors.push({
        field: `${fieldPrefix}.type`,
        message: 'Signal type is required and must be a string',
        code: 'MISSING_SIGNAL_TYPE',
      });
    }

    if (!signal.description || typeof signal.description !== 'string' || signal.description.trim().length === 0) {
      errors.push({
        field: `${fieldPrefix}.description`,
        message: 'Signal description is required and must be a non-empty string',
        code: 'MISSING_SIGNAL_DESCRIPTION',
      });
    }

    if (!signal.source || typeof signal.source !== 'string' || signal.source.trim().length === 0) {
      errors.push({
        field: `${fieldPrefix}.source`,
        message: 'Signal source is required and must be a non-empty string',
        code: 'MISSING_SIGNAL_SOURCE',
      });
    }

    // Validate relevance score
    if (typeof signal.relevanceScore !== 'number' || signal.relevanceScore < 0 || signal.relevanceScore > 1) {
      errors.push({
        field: `${fieldPrefix}.relevanceScore`,
        message: 'Relevance score must be a number between 0 and 1',
        code: 'INVALID_RELEVANCE_SCORE',
      });
    } else if (signal.relevanceScore < 0.3) {
      warnings.push({
        field: `${fieldPrefix}.relevanceScore`,
        message: 'Low relevance score detected - may impact confidence',
        impact: 'medium',
      });
    }
  }

  /**
   * Validates timestamps for freshness evaluation (Requirement 1.4)
   */
  private validateTimestamps(
    intentSignals: IntentSignal[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    intentSignals.forEach((signal, index) => {
      const fieldPrefix = `intentSignals[${index}]`;

      // Check for missing or null/undefined timestamp
      if (!signal || signal.timestamp === null || signal.timestamp === undefined) {
        errors.push({
          field: `${fieldPrefix}.timestamp`,
          message: 'Timestamp is required for freshness evaluation',
          code: 'MISSING_TIMESTAMP',
        });
        return;
      }

      // Validate timestamp is a valid Date
      const timestamp = new Date(signal.timestamp);
      if (isNaN(timestamp.getTime())) {
        errors.push({
          field: `${fieldPrefix}.timestamp`,
          message: 'Timestamp must be a valid date',
          code: 'INVALID_TIMESTAMP_FORMAT',
        });
        return;
      }

      // Check if timestamp is in the future
      const now = new Date();
      if (timestamp > now) {
        errors.push({
          field: `${fieldPrefix}.timestamp`,
          message: 'Timestamp cannot be in the future',
          code: 'FUTURE_TIMESTAMP',
        });
      }

      // Warn about old signals
      if (this.isSignalOld(timestamp)) {
        warnings.push({
          field: `${fieldPrefix}.timestamp`,
          message: 'Signal is older than recommended for optimal freshness',
          impact: 'low',
        });
      }
    });
  }

  /**
   * Checks if a signal is considered old based on timestamp
   */
  private isSignalOld(timestamp: Date): boolean {
    const now = new Date();
    const ageInDays = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays > InputValidator.MAX_SIGNAL_AGE_DAYS;
  }

  /**
   * Basic email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}