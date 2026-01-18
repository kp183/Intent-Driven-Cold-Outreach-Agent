/**
 * Property-based tests for SignalInterpreter
 * Tests universal properties that should hold across all valid inputs
 */

import * as fc from 'fast-check';
import { SignalInterpreter } from '../SignalInterpreter';
import { IntentSignal, SignalType } from '../../types';

describe('SignalInterpreter Property Tests', () => {
  let interpreter: SignalInterpreter;

  beforeEach(() => {
    interpreter = new SignalInterpreter();
  });

  /**
   * Property 5: Signal Independence
   * **Validates: Requirements 2.1**
   * 
   * For any set of intent signals, interpreting one signal should not affect 
   * the interpretation of other signals
   */
  describe('Property 5: Signal Independence', () => {
    it('should interpret each signal independently without cross-contamination', () => {
      fc.assert(
        fc.property(
          fc.array(generateValidIntentSignal(), { minLength: 2, maxLength: 5 }),
          (signals) => {
            // Interpret all signals together
            const allResults = interpreter.interpretSignals(signals);
            
            // Interpret each signal individually
            const individualResults = signals.map(signal => 
              interpreter.interpretSignals([signal])[0]
            );
            
            // Each signal's interpretation should be identical whether processed
            // alone or with other signals (proving independence)
            for (let i = 0; i < signals.length; i++) {
              const allResult = allResults[i];
              const individualResult = individualResults[i];
              
              // Weight and freshness should be identical
              expect(allResult.weight).toBeCloseTo(individualResult.weight, 8);
              expect(allResult.freshnessScore).toBeCloseTo(individualResult.freshnessScore, 8);
              
              // All other properties should be identical
              expect(allResult.type).toBe(individualResult.type);
              expect(allResult.description).toBe(individualResult.description);
              expect(allResult.relevanceScore).toBe(individualResult.relevanceScore);
              expect(allResult.source).toBe(individualResult.source);
              expect(allResult.timestamp).toEqual(individualResult.timestamp);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Signal Weighting by Relevance and Freshness
   * **Validates: Requirements 2.2, 2.3**
   * 
   * For any multiple intent signals, the system should weight signals based on 
   * their relevance and freshness rather than treating them equally
   */
  describe('Property 6: Signal Weighting by Relevance and Freshness', () => {
    it('should weight signals based on relevance and freshness, not treat them equally', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            generateValidIntentSignal(), // High relevance, recent signal
            generateValidIntentSignal()  // Low relevance, old signal
          ).map(([signal1, signal2]) => {
            // Make signal1 high relevance and recent
            const highRelevanceSignal = {
              ...signal1,
              relevanceScore: 0.9,
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
            };
            
            // Make signal2 low relevance and old
            const lowRelevanceSignal = {
              ...signal2,
              relevanceScore: 0.1,
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60) // 60 days ago
            };
            
            return [highRelevanceSignal, lowRelevanceSignal];
          }),
          ([highRelevanceSignal, lowRelevanceSignal]) => {
            const results = interpreter.interpretSignals([highRelevanceSignal, lowRelevanceSignal]);
            
            // High relevance, recent signal should have higher weight
            const highRelevanceResult = results.find(r => r.relevanceScore === 0.9);
            const lowRelevanceResult = results.find(r => r.relevanceScore === 0.1);
            
            expect(highRelevanceResult).toBeDefined();
            expect(lowRelevanceResult).toBeDefined();
            
            // High relevance + fresh signal should have higher weight than low relevance + old signal
            expect(highRelevanceResult!.weight).toBeGreaterThan(lowRelevanceResult!.weight);
            
            // Freshness scores should reflect age difference
            expect(highRelevanceResult!.freshnessScore).toBeGreaterThan(lowRelevanceResult!.freshnessScore);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: Recent Signal Prioritization
   * **Validates: Requirements 2.4**
   * 
   * For any conflicting signals with different timestamps, the system should 
   * prioritize more recent and direct signals
   */
  describe('Property 7: Recent Signal Prioritization', () => {
    it('should prioritize more recent signals when signals conflict', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            generateValidIntentSignal(),
            generateValidIntentSignal()
          ).map(([signal1, signal2]) => {
            // Create two signals with same relevance but different timestamps
            const recentSignal = {
              ...signal1,
              relevanceScore: 0.7,
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
              type: SignalType.JOB_CHANGE // Direct signal type
            };
            
            const oldSignal = {
              ...signal2,
              relevanceScore: 0.7, // Same relevance
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45), // 45 days ago
              type: SignalType.INDUSTRY_TREND // Less direct signal type
            };
            
            return [recentSignal, oldSignal];
          }),
          ([recentSignal, oldSignal]) => {
            const results = interpreter.interpretSignals([recentSignal, oldSignal]);
            
            const recentResult = results.find(r => r.type === SignalType.JOB_CHANGE);
            const oldResult = results.find(r => r.type === SignalType.INDUSTRY_TREND);
            
            expect(recentResult).toBeDefined();
            expect(oldResult).toBeDefined();
            
            // Recent signal should have higher freshness score
            expect(recentResult!.freshnessScore).toBeGreaterThan(oldResult!.freshnessScore);
            
            // Recent signal should have higher overall weight due to freshness
            expect(recentResult!.weight).toBeGreaterThan(oldResult!.weight);
            
            // Both should have same relevance score (input constraint)
            expect(recentResult!.relevanceScore).toBe(oldResult!.relevanceScore);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Generator for valid IntentSignal objects with realistic constraints
 */
function generateValidIntentSignal(): fc.Arbitrary<IntentSignal> {
  return fc.record({
    type: fc.constantFrom(...Object.values(SignalType)),
    description: fc.string({ minLength: 10, maxLength: 100 }),
    timestamp: fc.date({ 
      min: new Date('2020-01-01'), 
      max: new Date() // Only past dates to avoid future timestamp edge cases
    }),
    relevanceScore: fc.float({ min: Math.fround(0.01), max: Math.fround(1.0) }), // Avoid extreme small values
    source: fc.string({ minLength: 5, maxLength: 50 }),
    metadata: fc.option(fc.dictionary(fc.string(), fc.string()), { nil: undefined }) // Simplified metadata
  });
}