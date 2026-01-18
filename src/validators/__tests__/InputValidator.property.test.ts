/**
 * Property-based tests for InputValidator
 * Feature: intent-driven-cold-outreach-agent
 * Tests universal properties that should hold across all inputs
 */

import * as fc from 'fast-check';
import { InputValidator } from '../InputValidator';
import { ProspectData, IntentSignal, SignalType, CompanySize } from '../../types';

// Custom generators for non-whitespace strings
const nonEmptyString = () => fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);
const nonEmptyStringWithFallback = () => fc.oneof(
  nonEmptyString(),
  fc.constantFrom('Software Engineer', 'Marketing Manager', 'CEO', 'CTO', 'Sales Director')
);

describe('InputValidator Property Tests', () => {
  let validator: InputValidator;

  beforeEach(() => {
    validator = new InputValidator();
  });

  /**
   * Property 1: Input Validation Completeness
   * For any prospect data input, the validation should accept only inputs containing 
   * role, company context, and at least two intent signals
   * Validates: Requirements 1.1
   */
  describe('Property 1: Input Validation Completeness', () => {
    it('should accept only inputs with role, company context, and at least 2 intent signals', () => {
      fc.assert(
        fc.property(
          // Generate valid complete prospect data
          fc.record({
            role: nonEmptyStringWithFallback(),
            companyContext: fc.record({
              name: nonEmptyStringWithFallback(),
              industry: nonEmptyStringWithFallback(),
              size: fc.constantFrom(...Object.values(CompanySize)),
              recentEvents: fc.option(fc.array(nonEmptyStringWithFallback()), { nil: undefined }),
            }),
            contactDetails: fc.record({
              name: nonEmptyStringWithFallback(),
              email: fc.emailAddress(),
              linkedinUrl: fc.option(fc.webUrl(), { nil: undefined }),
              phoneNumber: fc.option(fc.string(), { nil: undefined }),
            }),
            additionalContext: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
          }),
          // Generate array of 2 or more valid intent signals
          fc.array(
            fc.record({
              type: fc.constantFrom(...Object.values(SignalType)),
              description: nonEmptyStringWithFallback(),
              timestamp: fc.date({ max: new Date() }), // Past dates only
              relevanceScore: fc.float({ min: 0, max: 1 }),
              source: nonEmptyStringWithFallback(),
              metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (prospectData: ProspectData, intentSignals: IntentSignal[]) => {
            const result = validator.validateInput(prospectData, intentSignals);
            
            // Complete valid inputs should pass validation
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject inputs missing required fields', () => {
      fc.assert(
        fc.property(
          // Generate incomplete prospect data (missing role, company context, or having < 2 signals)
          fc.oneof(
            // Missing role
            fc.record({
              role: fc.constant(''), // Empty role
              companyContext: fc.record({
                name: nonEmptyStringWithFallback(),
                industry: nonEmptyStringWithFallback(),
                size: fc.constantFrom(...Object.values(CompanySize)),
              }),
              contactDetails: fc.record({
                name: nonEmptyStringWithFallback(),
                email: fc.emailAddress(),
              }),
            }),
            // Missing company context
            fc.record({
              role: nonEmptyStringWithFallback(),
              companyContext: fc.constant(null as any),
              contactDetails: fc.record({
                name: nonEmptyStringWithFallback(),
                email: fc.emailAddress(),
              }),
            }),
            // Valid prospect data but will be tested with insufficient signals
            fc.record({
              role: nonEmptyStringWithFallback(),
              companyContext: fc.record({
                name: nonEmptyStringWithFallback(),
                industry: nonEmptyStringWithFallback(),
                size: fc.constantFrom(...Object.values(CompanySize)),
              }),
              contactDetails: fc.record({
                name: nonEmptyStringWithFallback(),
                email: fc.emailAddress(),
              }),
            })
          ),
          // Generate insufficient intent signals (0 or 1 signal)
          fc.array(
            fc.record({
              type: fc.constantFrom(...Object.values(SignalType)),
              description: nonEmptyStringWithFallback(),
              timestamp: fc.date({ max: new Date() }),
              relevanceScore: fc.float({ min: 0, max: 1 }),
              source: nonEmptyStringWithFallback(),
            }),
            { minLength: 0, maxLength: 1 }
          ),
          (prospectData: ProspectData, intentSignals: IntentSignal[]) => {
            const result = validator.validateInput(prospectData, intentSignals);
            
            // Incomplete inputs should fail validation
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Required Field Validation
   * For any prospect data missing required fields, the system should reject 
   * the input and return a validation error
   * Validates: Requirements 1.3
   */
  describe('Property 3: Required Field Validation', () => {
    it('should reject inputs missing required fields', () => {
      fc.assert(
        fc.property(
          // Generate prospect data with missing required fields
          fc.oneof(
            // Missing prospect data entirely
            fc.constant(null as any),
            // Missing role
            fc.record({
              role: fc.oneof(fc.constant(''), fc.constant(null), fc.constant(undefined)),
              companyContext: fc.record({
                name: nonEmptyStringWithFallback(),
                industry: nonEmptyStringWithFallback(),
                size: fc.constantFrom(...Object.values(CompanySize)),
              }),
              contactDetails: fc.record({
                name: nonEmptyStringWithFallback(),
                email: fc.emailAddress(),
              }),
            }),
            // Missing company context
            fc.record({
              role: nonEmptyStringWithFallback(),
              companyContext: fc.oneof(fc.constant(null), fc.constant(undefined)),
              contactDetails: fc.record({
                name: nonEmptyStringWithFallback(),
                email: fc.emailAddress(),
              }),
            }),
            // Missing contact details
            fc.record({
              role: nonEmptyStringWithFallback(),
              companyContext: fc.record({
                name: nonEmptyStringWithFallback(),
                industry: nonEmptyStringWithFallback(),
                size: fc.constantFrom(...Object.values(CompanySize)),
              }),
              contactDetails: fc.oneof(fc.constant(null), fc.constant(undefined)),
            }),
            // Missing company name
            fc.record({
              role: nonEmptyStringWithFallback(),
              companyContext: fc.record({
                name: fc.oneof(fc.constant(''), fc.constant(null), fc.constant(undefined)),
                industry: nonEmptyStringWithFallback(),
                size: fc.constantFrom(...Object.values(CompanySize)),
              }),
              contactDetails: fc.record({
                name: nonEmptyStringWithFallback(),
                email: fc.emailAddress(),
              }),
            }),
            // Missing contact name
            fc.record({
              role: nonEmptyStringWithFallback(),
              companyContext: fc.record({
                name: nonEmptyStringWithFallback(),
                industry: nonEmptyStringWithFallback(),
                size: fc.constantFrom(...Object.values(CompanySize)),
              }),
              contactDetails: fc.record({
                name: fc.oneof(fc.constant(''), fc.constant(null), fc.constant(undefined)),
                email: fc.emailAddress(),
              }),
            }),
            // Missing contact email
            fc.record({
              role: nonEmptyStringWithFallback(),
              companyContext: fc.record({
                name: nonEmptyStringWithFallback(),
                industry: nonEmptyStringWithFallback(),
                size: fc.constantFrom(...Object.values(CompanySize)),
              }),
              contactDetails: fc.record({
                name: nonEmptyStringWithFallback(),
                email: fc.oneof(fc.constant(''), fc.constant(null), fc.constant(undefined)),
              }),
            })
          ),
          // Generate valid intent signals (2 or more)
          fc.array(
            fc.record({
              type: fc.constantFrom(...Object.values(SignalType)),
              description: nonEmptyStringWithFallback(),
              timestamp: fc.date({ max: new Date() }),
              relevanceScore: fc.float({ min: 0, max: 1 }),
              source: nonEmptyStringWithFallback(),
              metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (prospectData: ProspectData, intentSignals: IntentSignal[]) => {
            const result = validator.validateInput(prospectData, intentSignals);
            
            // Inputs with missing required fields should fail validation
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            // Should have specific error codes for missing fields
            const errorCodes = result.errors.map((e: any) => e.code);
            expect(errorCodes.some((code: string) => 
              code.includes('MISSING') || code.includes('REQUIRED')
            )).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: Timestamp Validation
   * For any intent signal, the system should validate that timestamp information 
   * is present for freshness evaluation
   * Validates: Requirements 1.4
   */
  describe('Property 4: Timestamp Validation', () => {
    it('should validate that timestamps are present and valid', () => {
      fc.assert(
        fc.property(
          // Generate valid prospect data
          fc.record({
            role: nonEmptyStringWithFallback(),
            companyContext: fc.record({
              name: nonEmptyStringWithFallback(),
              industry: nonEmptyStringWithFallback(),
              size: fc.constantFrom(...Object.values(CompanySize)),
            }),
            contactDetails: fc.record({
              name: nonEmptyStringWithFallback(),
              email: fc.emailAddress(),
            }),
          }),
          // Generate intent signals with invalid timestamps
          fc.array(
            fc.oneof(
              // Missing timestamp
              fc.record({
                type: fc.constantFrom(...Object.values(SignalType)),
                description: nonEmptyStringWithFallback(),
                timestamp: fc.constant(null as any),
                relevanceScore: fc.float({ min: 0, max: 1 }),
                source: nonEmptyStringWithFallback(),
              }),
              // Undefined timestamp
              fc.record({
                type: fc.constantFrom(...Object.values(SignalType)),
                description: nonEmptyStringWithFallback(),
                timestamp: fc.constant(undefined as any),
                relevanceScore: fc.float({ min: 0, max: 1 }),
                source: nonEmptyStringWithFallback(),
              }),
              // Invalid timestamp (string)
              fc.record({
                type: fc.constantFrom(...Object.values(SignalType)),
                description: nonEmptyStringWithFallback(),
                timestamp: fc.constant('invalid-date' as any),
                relevanceScore: fc.float({ min: 0, max: 1 }),
                source: nonEmptyStringWithFallback(),
              }),
              // Future timestamp
              fc.record({
                type: fc.constantFrom(...Object.values(SignalType)),
                description: nonEmptyStringWithFallback(),
                timestamp: fc.date({ min: new Date(Date.now() + 86400000) }), // Tomorrow
                relevanceScore: fc.float({ min: 0, max: 1 }),
                source: nonEmptyStringWithFallback(),
              })
            ),
            { minLength: 2, maxLength: 5 }
          ),
          (prospectData: ProspectData, intentSignals: IntentSignal[]) => {
            const result = validator.validateInput(prospectData, intentSignals);
            
            // Inputs with invalid timestamps should fail validation
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            // Should have specific error codes for timestamp issues
            const errorCodes = result.errors.map((e: any) => e.code);
            expect(errorCodes.some((code: string) => 
              code.includes('TIMESTAMP') || code.includes('MISSING_TIMESTAMP') || code.includes('INVALID_TIMESTAMP') || code.includes('FUTURE_TIMESTAMP')
            )).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept signals with valid past timestamps', () => {
      fc.assert(
        fc.property(
          // Generate valid prospect data
          fc.record({
            role: nonEmptyStringWithFallback(),
            companyContext: fc.record({
              name: nonEmptyStringWithFallback(),
              industry: nonEmptyStringWithFallback(),
              size: fc.constantFrom(...Object.values(CompanySize)),
            }),
            contactDetails: fc.record({
              name: nonEmptyStringWithFallback(),
              email: fc.emailAddress(),
            }),
          }),
          // Generate intent signals with valid past timestamps
          fc.array(
            fc.record({
              type: fc.constantFrom(...Object.values(SignalType)),
              description: nonEmptyStringWithFallback(),
              timestamp: fc.date({ max: new Date() }), // Past dates only
              relevanceScore: fc.float({ min: 0, max: 1 }),
              source: nonEmptyStringWithFallback(),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (prospectData: ProspectData, intentSignals: IntentSignal[]) => {
            const result = validator.validateInput(prospectData, intentSignals);
            
            // Inputs with valid timestamps should pass validation (or only have non-timestamp errors)
            const timestampErrors = result.errors.filter((e: any) => 
              e.code.includes('TIMESTAMP') || e.code.includes('MISSING_TIMESTAMP') || e.code.includes('INVALID_TIMESTAMP') || e.code.includes('FUTURE_TIMESTAMP')
            );
            expect(timestampErrors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Confidence Reduction for Weak Signals
   * For any set of weak or insufficient intent signals, the confidence scoring 
   * should be lower than for strong signals
   * Validates: Requirements 1.2
   */
  describe('Property 2: Confidence Reduction for Weak Signals', () => {
    it('should generate warnings for weak signals that would reduce confidence', () => {
      fc.assert(
        fc.property(
          // Generate valid prospect data
          fc.record({
            role: nonEmptyStringWithFallback(),
            companyContext: fc.record({
              name: nonEmptyStringWithFallback(),
              industry: nonEmptyStringWithFallback(),
              size: fc.constantFrom(...Object.values(CompanySize)),
            }),
            contactDetails: fc.record({
              name: nonEmptyStringWithFallback(),
              email: fc.emailAddress(),
            }),
          }),
          // Generate intent signals with weak characteristics
          fc.array(
            fc.oneof(
              // Weak signals with low relevance score
              fc.record({
                type: fc.constantFrom(...Object.values(SignalType)),
                description: nonEmptyStringWithFallback(),
                timestamp: fc.date({ max: new Date() }), // Valid past date
                relevanceScore: fc.float({ min: 0, max: Math.fround(0.29) }), // Low relevance (< 0.3)
                source: nonEmptyStringWithFallback(),
                metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
              }),
              // Old signals (older than 365 days)
              fc.record({
                type: fc.constantFrom(...Object.values(SignalType)),
                description: nonEmptyStringWithFallback(),
                timestamp: fc.date({ 
                  min: new Date('2020-01-01'), 
                  max: new Date(Date.now() - 366 * 24 * 60 * 60 * 1000) // More than 365 days ago
                }),
                relevanceScore: fc.float({ min: 0.5, max: 1 }), // High relevance but old
                source: nonEmptyStringWithFallback(),
                metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
              }),
              // Combination of weak and old
              fc.record({
                type: fc.constantFrom(...Object.values(SignalType)),
                description: nonEmptyStringWithFallback(),
                timestamp: fc.date({ 
                  min: new Date('2020-01-01'), 
                  max: new Date(Date.now() - 366 * 24 * 60 * 60 * 1000) // More than 365 days ago
                }),
                relevanceScore: fc.float({ min: 0, max: Math.fround(0.29) }), // Low relevance and old
                source: nonEmptyStringWithFallback(),
                metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
              })
            ),
            { minLength: 2, maxLength: 5 }
          ),
          (prospectData: ProspectData, intentSignals: IntentSignal[]) => {
            const result = validator.validateInput(prospectData, intentSignals);
            
            // Should pass basic validation (no structural errors)
            expect(result.isValid).toBe(true);
            
            // Should have warnings about weak signals that would reduce confidence
            expect(result.warnings.length).toBeGreaterThan(0);
            
            // Should have specific warnings about confidence reduction
            const confidenceWarnings = result.warnings.filter((w: any) => 
              w.message.includes('confidence') || 
              w.message.includes('weak') || 
              w.message.includes('Low relevance') ||
              w.message.includes('old signals detected')
            );
            expect(confidenceWarnings.length).toBeGreaterThan(0);
            
            // Verify that warnings have appropriate impact levels
            const hasRelevantWarning = result.warnings.some((w: any) => 
              (w.impact === 'medium' || w.impact === 'low') && 
              (w.message.includes('confidence') || w.message.includes('weak') || w.message.includes('Low relevance'))
            );
            expect(hasRelevantWarning).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not generate confidence warnings for strong, recent signals', () => {
      fc.assert(
        fc.property(
          // Generate valid prospect data
          fc.record({
            role: nonEmptyStringWithFallback(),
            companyContext: fc.record({
              name: nonEmptyStringWithFallback(),
              industry: nonEmptyStringWithFallback(),
              size: fc.constantFrom(...Object.values(CompanySize)),
            }),
            contactDetails: fc.record({
              name: nonEmptyStringWithFallback(),
              email: fc.emailAddress(),
            }),
          }),
          // Generate strong, recent intent signals
          fc.array(
            fc.record({
              type: fc.constantFrom(...Object.values(SignalType)),
              description: nonEmptyStringWithFallback(),
              timestamp: fc.date({ 
                min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Within last 30 days
                max: new Date() 
              }),
              relevanceScore: fc.float({ min: Math.fround(0.7), max: 1 }), // High relevance (>= 0.7)
              source: nonEmptyStringWithFallback(),
              metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (prospectData: ProspectData, intentSignals: IntentSignal[]) => {
            const result = validator.validateInput(prospectData, intentSignals);
            
            // Should pass validation
            expect(result.isValid).toBe(true);
            
            // Should not have warnings about weak signals or confidence reduction
            const confidenceWarnings = result.warnings.filter((w: any) => 
              w.message.includes('confidence') || 
              w.message.includes('weak') || 
              w.message.includes('Low relevance') ||
              w.message.includes('old signals detected')
            );
            expect(confidenceWarnings).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should demonstrate confidence impact difference between weak and strong signals', () => {
      fc.assert(
        fc.property(
          // Generate valid prospect data (same for both scenarios)
          fc.record({
            role: nonEmptyStringWithFallback(),
            companyContext: fc.record({
              name: nonEmptyStringWithFallback(),
              industry: nonEmptyStringWithFallback(),
              size: fc.constantFrom(...Object.values(CompanySize)),
            }),
            contactDetails: fc.record({
              name: nonEmptyStringWithFallback(),
              email: fc.emailAddress(),
            }),
          }),
          (prospectData: ProspectData) => {
            // Create weak signals
            const weakSignals: IntentSignal[] = [
              {
                type: SignalType.JOB_CHANGE,
                description: 'Old job change',
                timestamp: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // 400 days ago
                relevanceScore: 0.2, // Low relevance
                source: 'LinkedIn',
              },
              {
                type: SignalType.FUNDING_EVENT,
                description: 'Small funding round',
                timestamp: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000), // 500 days ago
                relevanceScore: 0.1, // Very low relevance
                source: 'TechCrunch',
              },
            ];

            // Create strong signals
            const strongSignals: IntentSignal[] = [
              {
                type: SignalType.JOB_CHANGE,
                description: 'Recent promotion to VP of Engineering',
                timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
                relevanceScore: 0.9, // High relevance
                source: 'LinkedIn',
              },
              {
                type: SignalType.TECHNOLOGY_ADOPTION,
                description: 'Company adopted new AI platform',
                timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
                relevanceScore: 0.8, // High relevance
                source: 'Company Blog',
              },
            ];

            const weakResult = validator.validateInput(prospectData, weakSignals);
            const strongResult = validator.validateInput(prospectData, strongSignals);

            // Both should be valid structurally
            expect(weakResult.isValid).toBe(true);
            expect(strongResult.isValid).toBe(true);

            // Weak signals should generate more warnings than strong signals
            const weakConfidenceWarnings = weakResult.warnings.filter((w: any) => 
              w.message.includes('confidence') || 
              w.message.includes('weak') || 
              w.message.includes('Low relevance') ||
              w.message.includes('old signals detected')
            );
            
            const strongConfidenceWarnings = strongResult.warnings.filter((w: any) => 
              w.message.includes('confidence') || 
              w.message.includes('weak') || 
              w.message.includes('Low relevance') ||
              w.message.includes('old signals detected')
            );

            // Weak signals should have more confidence-related warnings
            expect(weakConfidenceWarnings.length).toBeGreaterThan(strongConfidenceWarnings.length);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});