/**
 * Property-based tests for HypothesisFormer
 * Tests universal properties that should hold across all valid inputs
 */

import fc from 'fast-check';
import { HypothesisFormer } from '../HypothesisFormer';
import { WeightedSignal, SignalType, IntentHypothesis } from '../../types';

describe('HypothesisFormer Property Tests', () => {
  let hypothesisFormer: HypothesisFormer;

  beforeEach(() => {
    hypothesisFormer = new HypothesisFormer();
  });

  /**
   * Property 8: Single Hypothesis Formation
   * **Validates: Requirements 3.1**
   * 
   * For any set of weighted signals, the system should form exactly one primary hypothesis
   */
  describe('Property 8: Single Hypothesis Formation', () => {
    it('should always form exactly one primary hypothesis for any input', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom(...Object.values(SignalType)),
              description: fc.string({ minLength: 10, maxLength: 100 }),
              timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
              relevanceScore: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
              source: fc.string({ minLength: 5, maxLength: 20 }),
              weight: fc.float({ min: Math.fround(0.01), max: Math.fround(1) }),
              freshnessScore: fc.float({ min: Math.fround(0.01), max: Math.fround(1) }),
              metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (weightedSignals: WeightedSignal[]) => {
            // Act
            const result = hypothesisFormer.formHypothesis(weightedSignals);

            // Assert - Should always return exactly one hypothesis
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            
            // Should have exactly one primary reason
            expect(result.primaryReason).toBeDefined();
            expect(typeof result.primaryReason).toBe('string');
            expect(result.primaryReason.length).toBeGreaterThan(0);
            
            // Should have supporting evidence array (may be empty for conservative cases)
            expect(Array.isArray(result.supportingEvidence)).toBe(true);
            
            // Should have confidence factors array
            expect(Array.isArray(result.confidenceFactors)).toBe(true);
            expect(result.confidenceFactors.length).toBeGreaterThan(0);
            
            // Should have conservative assumptions array
            expect(Array.isArray(result.conservativeAssumptions)).toBe(true);
            expect(result.conservativeAssumptions.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should form consistent hypothesis structure for empty input', () => {
      const result = hypothesisFormer.formHypothesis([]);
      
      expect(result.primaryReason).toBeDefined();
      expect(result.supportingEvidence).toBeDefined();
      expect(result.confidenceFactors).toBeDefined();
      expect(result.conservativeAssumptions).toBeDefined();
      
      // Should be conservative for empty input
      expect(result.conservativeAssumptions.length).toBeGreaterThan(0);
    });

    it('should form consistent hypothesis structure for null/undefined input', () => {
      const resultNull = hypothesisFormer.formHypothesis(null as any);
      const resultUndefined = hypothesisFormer.formHypothesis(undefined as any);
      
      [resultNull, resultUndefined].forEach(result => {
        expect(result.primaryReason).toBeDefined();
        expect(result.supportingEvidence).toBeDefined();
        expect(result.confidenceFactors).toBeDefined();
        expect(result.conservativeAssumptions).toBeDefined();
      });
    });
  });

  /**
   * Property 9: Evidence-Grounded Hypotheses
   * **Validates: Requirements 3.2**
   * 
   * For any generated hypothesis, all content should be grounded only in provided signals without inventing facts
   */
  describe('Property 9: Evidence-Grounded Hypotheses', () => {
    it('should only reference provided signal information in hypothesis', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom(...Object.values(SignalType)),
              description: fc.string({ minLength: 10, maxLength: 100 }),
              timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
              relevanceScore: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
              source: fc.string({ minLength: 5, maxLength: 20 }),
              weight: fc.float({ min: Math.fround(0.01), max: Math.fround(1) }),
              freshnessScore: fc.float({ min: Math.fround(0.01), max: Math.fround(1) }),
              metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (weightedSignals: WeightedSignal[]) => {
            // Act
            const result = hypothesisFormer.formHypothesis(weightedSignals);

            // Assert - Hypothesis should be grounded in provided signals
            expect(result).toBeDefined();
            
            // Primary reason should not invent facts beyond signal types
            expect(result.primaryReason).toBeDefined();
            expect(typeof result.primaryReason).toBe('string');
            
            // Supporting evidence should reference actual signal information
            if (result.supportingEvidence.length > 0) {
              // Each piece of supporting evidence should relate to provided signals
              result.supportingEvidence.forEach(evidence => {
                expect(typeof evidence).toBe('string');
                expect(evidence.length).toBeGreaterThan(0);
                
                // Evidence should not contain fabricated specific details beyond what's in signals
                // Check if evidence contains content not present in any signal description
                const signalDescriptions = weightedSignals.map(s => s.description).join(' ');
                
                // Look for fabricated specific business metrics not in original signals
                const fabricatedPatterns = [
                  /\$[\d,]+\s*(million|billion|revenue|funding)/, // Specific dollar amounts with business context
                  /\d+%\s*(growth|increase|revenue|profit)/, // Specific percentages with business context
                  /(CEO|CTO|VP of|President of)\s+[A-Z][a-z]+/, // Specific executive titles with names
                ];
                
                fabricatedPatterns.forEach(pattern => {
                  if (pattern.test(evidence) && !pattern.test(signalDescriptions)) {
                    // Only fail if the pattern appears in evidence but not in original signals
                    expect(evidence).not.toMatch(pattern);
                  }
                });
              });
            }
            
            // Conservative assumptions should acknowledge limitations
            expect(result.conservativeAssumptions.length).toBeGreaterThan(0);
            result.conservativeAssumptions.forEach(assumption => {
              expect(typeof assumption).toBe('string');
              expect(assumption.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not fabricate specific business details not in signals', () => {
      const testSignals: WeightedSignal[] = [
        {
          type: SignalType.JOB_CHANGE,
          description: 'Person changed roles recently',
          timestamp: new Date(),
          relevanceScore: 0.8,
          source: 'linkedin',
          weight: 0.7,
          freshnessScore: 0.9
        }
      ];

      const result = hypothesisFormer.formHypothesis(testSignals);
      
      // Should not invent specific details like company names, revenue figures, etc.
      const allText = [
        result.primaryReason,
        ...result.supportingEvidence,
        ...result.confidenceFactors,
        ...result.conservativeAssumptions
      ].join(' ').toLowerCase();
      
      // Should not contain fabricated specific business metrics
      expect(allText).not.toMatch(/\$[\d,]+/); // No specific dollar amounts
      expect(allText).not.toMatch(/\d+%\s*(growth|increase|revenue)/); // No specific percentages
      expect(allText).not.toMatch(/(acme|globodyne|initech)/); // No fake company names
    });
  });

  /**
   * Property 10: Conservative Hypothesis for Insufficient Signals
   * **Validates: Requirements 3.3**
   * 
   * For any insufficient signal set, the system should form a conservative hypothesis or decline to proceed
   */
  describe('Property 10: Conservative Hypothesis for Insufficient Signals', () => {
    it('should form conservative hypothesis when signals are insufficient', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom(...Object.values(SignalType)),
              description: fc.string({ minLength: 1, maxLength: 20 }),
              timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
              relevanceScore: fc.float({ min: Math.fround(0), max: Math.fround(0.2) }), // Low relevance
              source: fc.string({ minLength: 1, maxLength: 10 }),
              weight: fc.float({ min: Math.fround(0.01), max: Math.fround(0.2) }), // Low weight
              freshnessScore: fc.float({ min: Math.fround(0.01), max: Math.fround(0.3) }), // Low freshness
              metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
            }),
            { minLength: 0, maxLength: 3 } // Few signals
          ),
          (weakSignals: WeightedSignal[]) => {
            // Act
            const result = hypothesisFormer.formHypothesis(weakSignals);

            // Assert - Should form conservative hypothesis
            expect(result).toBeDefined();
            
            // Conservative assumptions should be present and acknowledge limitations
            expect(result.conservativeAssumptions.length).toBeGreaterThan(0);
            
            // Should contain conservative language
            const allText = [
              result.primaryReason,
              ...result.supportingEvidence,
              ...result.confidenceFactors,
              ...result.conservativeAssumptions
            ].join(' ').toLowerCase();
            
            // Should contain conservative indicators
            const conservativeIndicators = [
              'conservative',
              'limited',
              'insufficient',
              'weak',
              'general',
              'may',
              'might',
              'appropriate',
              'assumed',
              'without guaranteeing'
            ];
            
            const hasConservativeLanguage = conservativeIndicators.some(indicator => 
              allText.includes(indicator)
            );
            
            expect(hasConservativeLanguage).toBe(true);
            
            // Should not make strong claims
            const strongClaims = [
              'definitely',
              'certainly',
              'guaranteed',
              'will',
              'must',
              'always'
            ];
            
            const hasStrongClaims = strongClaims.some(claim => 
              allText.includes(claim)
            );
            
            expect(hasStrongClaims).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should form conservative hypothesis for empty signals', () => {
      const result = hypothesisFormer.formHypothesis([]);
      
      // Should have conservative assumptions
      expect(result.conservativeAssumptions.length).toBeGreaterThan(0);
      
      // Should contain conservative language
      const allText = [
        result.primaryReason,
        ...result.supportingEvidence,
        ...result.confidenceFactors,
        ...result.conservativeAssumptions
      ].join(' ').toLowerCase();
      
      expect(allText).toMatch(/(conservative|limited|insufficient|general|may|might)/);
    });

    it('should form conservative hypothesis for very low weight signals', () => {
      const veryWeakSignals: WeightedSignal[] = [
        {
          type: SignalType.INDUSTRY_TREND,
          description: 'Some industry trend',
          timestamp: new Date('2020-01-01'),
          relevanceScore: 0.01,
          source: 'news',
          weight: 0.02, // Very low weight
          freshnessScore: 0.1
        }
      ];

      const result = hypothesisFormer.formHypothesis(veryWeakSignals);
      
      // Should acknowledge weakness in conservative assumptions
      expect(result.conservativeAssumptions.length).toBeGreaterThan(0);
      
      const conservativeText = result.conservativeAssumptions.join(' ').toLowerCase();
      expect(conservativeText).toMatch(/(weak|insufficient|limited|conservative)/);
    });
  });
});