/**
 * Property-based tests for StrategySelector
 * Tests universal properties that should hold across all valid inputs
 */

import fc from 'fast-check';
import { StrategySelector } from '../StrategySelector';
import { ConfidenceLevel, StrategyType, CallToActionLevel } from '../../types';

describe('StrategySelector Property Tests', () => {
  let strategySelector: StrategySelector;

  beforeEach(() => {
    strategySelector = new StrategySelector();
  });

  /**
   * Property 15: Strategy Selection Mapping
   * **Validates: Requirements 5.1, 5.2, 5.3**
   * 
   * For any confidence level, the system should select the appropriate strategy:
   * High→Direct, Medium→Insight-led, Low→Soft curiosity
   */
  describe('Property 15: Strategy Selection Mapping', () => {
    it('should map High confidence to Direct Value Alignment strategy', () => {
      fc.assert(
        fc.property(
          fc.constant(ConfidenceLevel.HIGH),
          (confidenceLevel: ConfidenceLevel) => {
            // Act
            const result = strategySelector.selectStrategy(confidenceLevel);

            // Assert - High confidence should map to Direct Value Alignment
            expect(result.type).toBe(StrategyType.DIRECT_VALUE_ALIGNMENT);
            expect(result.callToActionLevel).toBe(CallToActionLevel.DIRECT);
            expect(result.toneGuidelines).toContain('Confident and direct tone');
            expect(result.contentFocus).toContain('Direct connection between prospect signals and value proposition');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should map Medium confidence to Insight-Led Observation strategy', () => {
      fc.assert(
        fc.property(
          fc.constant(ConfidenceLevel.MEDIUM),
          (confidenceLevel: ConfidenceLevel) => {
            // Act
            const result = strategySelector.selectStrategy(confidenceLevel);

            // Assert - Medium confidence should map to Insight-Led Observation
            expect(result.type).toBe(StrategyType.INSIGHT_LED_OBSERVATION);
            expect(result.callToActionLevel).toBe(CallToActionLevel.SOFT);
            expect(result.toneGuidelines).toContain('Thoughtful and observational tone');
            expect(result.contentFocus).toContain('Industry insights and observations that relate to prospect context');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should map Low confidence to Soft Curiosity strategy', () => {
      fc.assert(
        fc.property(
          fc.constant(ConfidenceLevel.LOW),
          (confidenceLevel: ConfidenceLevel) => {
            // Act
            const result = strategySelector.selectStrategy(confidenceLevel);

            // Assert - Low confidence should map to Soft Curiosity
            expect(result.type).toBe(StrategyType.SOFT_CURIOSITY);
            expect(result.callToActionLevel).toBe(CallToActionLevel.NONE);
            expect(result.toneGuidelines).toContain('Gentle and curious tone');
            expect(result.contentFocus).toContain('Genuine curiosity about prospect situation and challenges');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly map all valid confidence levels to appropriate strategies', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(ConfidenceLevel)),
          (confidenceLevel: ConfidenceLevel) => {
            // Act
            const result = strategySelector.selectStrategy(confidenceLevel);

            // Assert - Each confidence level should map to exactly one strategy type
            expect(result).toBeDefined();
            expect(result.type).toBeDefined();
            expect(Object.values(StrategyType)).toContain(result.type);
            
            // Verify the mapping is correct
            switch (confidenceLevel) {
              case ConfidenceLevel.HIGH:
                expect(result.type).toBe(StrategyType.DIRECT_VALUE_ALIGNMENT);
                expect(result.callToActionLevel).toBe(CallToActionLevel.DIRECT);
                break;
              case ConfidenceLevel.MEDIUM:
                expect(result.type).toBe(StrategyType.INSIGHT_LED_OBSERVATION);
                expect(result.callToActionLevel).toBe(CallToActionLevel.SOFT);
                break;
              case ConfidenceLevel.LOW:
                expect(result.type).toBe(StrategyType.SOFT_CURIOSITY);
                expect(result.callToActionLevel).toBe(CallToActionLevel.NONE);
                break;
            }

            // All strategies should have required properties
            expect(result.toneGuidelines).toBeDefined();
            expect(Array.isArray(result.toneGuidelines)).toBe(true);
            expect(result.toneGuidelines.length).toBeGreaterThan(0);
            expect(result.contentFocus).toBeDefined();
            expect(typeof result.contentFocus).toBe('string');
            expect(result.contentFocus.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide appropriate call-to-action levels based on confidence', () => {
      // High confidence should allow direct calls-to-action
      const highStrategy = strategySelector.selectStrategy(ConfidenceLevel.HIGH);
      expect(highStrategy.callToActionLevel).toBe(CallToActionLevel.DIRECT);

      // Medium confidence should use soft calls-to-action
      const mediumStrategy = strategySelector.selectStrategy(ConfidenceLevel.MEDIUM);
      expect(mediumStrategy.callToActionLevel).toBe(CallToActionLevel.SOFT);

      // Low confidence should avoid calls-to-action
      const lowStrategy = strategySelector.selectStrategy(ConfidenceLevel.LOW);
      expect(lowStrategy.callToActionLevel).toBe(CallToActionLevel.NONE);
    });

    it('should provide distinct tone guidelines for each strategy type', () => {
      const highStrategy = strategySelector.selectStrategy(ConfidenceLevel.HIGH);
      const mediumStrategy = strategySelector.selectStrategy(ConfidenceLevel.MEDIUM);
      const lowStrategy = strategySelector.selectStrategy(ConfidenceLevel.LOW);

      // Each strategy should have unique tone guidelines
      expect(highStrategy.toneGuidelines).not.toEqual(mediumStrategy.toneGuidelines);
      expect(mediumStrategy.toneGuidelines).not.toEqual(lowStrategy.toneGuidelines);
      expect(highStrategy.toneGuidelines).not.toEqual(lowStrategy.toneGuidelines);

      // Each should have multiple guidelines
      expect(highStrategy.toneGuidelines.length).toBeGreaterThanOrEqual(3);
      expect(mediumStrategy.toneGuidelines.length).toBeGreaterThanOrEqual(3);
      expect(lowStrategy.toneGuidelines.length).toBeGreaterThanOrEqual(3);
    });

    it('should provide distinct content focus for each strategy type', () => {
      const highStrategy = strategySelector.selectStrategy(ConfidenceLevel.HIGH);
      const mediumStrategy = strategySelector.selectStrategy(ConfidenceLevel.MEDIUM);
      const lowStrategy = strategySelector.selectStrategy(ConfidenceLevel.LOW);

      // Each strategy should have unique content focus
      expect(highStrategy.contentFocus).not.toBe(mediumStrategy.contentFocus);
      expect(mediumStrategy.contentFocus).not.toBe(lowStrategy.contentFocus);
      expect(highStrategy.contentFocus).not.toBe(lowStrategy.contentFocus);

      // Content focus should be meaningful strings
      expect(highStrategy.contentFocus.length).toBeGreaterThan(10);
      expect(mediumStrategy.contentFocus.length).toBeGreaterThan(10);
      expect(lowStrategy.contentFocus.length).toBeGreaterThan(10);
    });
  });

  /**
   * Property 16: Single Strategy Selection
   * **Validates: Requirements 5.4**
   * 
   * For any outreach request, the system should choose exactly one message strategy
   */
  describe('Property 16: Single Strategy Selection', () => {
    it('should always return exactly one strategy for any confidence level', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(ConfidenceLevel)),
          (confidenceLevel: ConfidenceLevel) => {
            // Act
            const result = strategySelector.selectStrategy(confidenceLevel);

            // Assert - Should return exactly one strategy object
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect(result).not.toBeNull();
            
            // Should have exactly one strategy type
            expect(result.type).toBeDefined();
            expect(typeof result.type).toBe('string');
            expect(Object.values(StrategyType)).toContain(result.type);
            
            // Should not return multiple strategies or arrays
            expect(Array.isArray(result)).toBe(false);
            expect(Array.isArray(result.type)).toBe(false);
            
            // Should have all required single-valued properties
            expect(result.callToActionLevel).toBeDefined();
            expect(typeof result.callToActionLevel).toBe('string');
            expect(Object.values(CallToActionLevel)).toContain(result.callToActionLevel);
            
            expect(result.contentFocus).toBeDefined();
            expect(typeof result.contentFocus).toBe('string');
            expect(result.contentFocus.length).toBeGreaterThan(0);
            
            // Tone guidelines should be an array but represent one coherent strategy
            expect(Array.isArray(result.toneGuidelines)).toBe(true);
            expect(result.toneGuidelines.length).toBeGreaterThan(0);
            result.toneGuidelines.forEach(guideline => {
              expect(typeof guideline).toBe('string');
              expect(guideline.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return a single strategy object with consistent structure', () => {
      const allConfidenceLevels = Object.values(ConfidenceLevel);
      
      allConfidenceLevels.forEach(confidenceLevel => {
        // Act
        const result = strategySelector.selectStrategy(confidenceLevel);

        // Assert - Each result should have the same structure (single strategy)
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('toneGuidelines');
        expect(result).toHaveProperty('contentFocus');
        expect(result).toHaveProperty('callToActionLevel');
        
        // Should have exactly these 4 properties (no more, no less)
        const propertyCount = Object.keys(result).length;
        expect(propertyCount).toBe(4);
        
        // Each property should be singular, not multiple
        expect(typeof result.type).toBe('string');
        expect(typeof result.contentFocus).toBe('string');
        expect(typeof result.callToActionLevel).toBe('string');
        expect(Array.isArray(result.toneGuidelines)).toBe(true);
      });
    });

    it('should not return multiple strategy types for any input', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(ConfidenceLevel)),
          (confidenceLevel: ConfidenceLevel) => {
            // Act
            const result = strategySelector.selectStrategy(confidenceLevel);

            // Assert - Should never return multiple strategy types
            expect(result.type).not.toContain(','); // No comma-separated values
            expect(result.type).not.toContain('|'); // No pipe-separated values
            expect(result.type).not.toContain(' and '); // No "and" combinations
            expect(result.type).not.toContain(' or '); // No "or" alternatives
            
            // Should be exactly one of the defined strategy types
            const strategyTypeCount = Object.values(StrategyType).filter(
              type => result.type === type
            ).length;
            expect(strategyTypeCount).toBe(1);
            
            // Call-to-action level should also be singular
            const ctaCount = Object.values(CallToActionLevel).filter(
              level => result.callToActionLevel === level
            ).length;
            expect(ctaCount).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain single strategy selection across multiple calls', () => {
      const confidenceLevel = ConfidenceLevel.MEDIUM;
      
      // Act - Call multiple times
      const result1 = strategySelector.selectStrategy(confidenceLevel);
      const result2 = strategySelector.selectStrategy(confidenceLevel);
      const result3 = strategySelector.selectStrategy(confidenceLevel);

      // Assert - Each call should return the same single strategy
      expect(result1.type).toBe(result2.type);
      expect(result2.type).toBe(result3.type);
      
      expect(result1.callToActionLevel).toBe(result2.callToActionLevel);
      expect(result2.callToActionLevel).toBe(result3.callToActionLevel);
      
      expect(result1.contentFocus).toBe(result2.contentFocus);
      expect(result2.contentFocus).toBe(result3.contentFocus);
      
      // All should be single strategy objects
      [result1, result2, result3].forEach(result => {
        expect(Object.keys(result).length).toBe(4);
        expect(typeof result.type).toBe('string');
      });
    });

    it('should never return null, undefined, or empty strategy', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(ConfidenceLevel)),
          (confidenceLevel: ConfidenceLevel) => {
            // Act
            const result = strategySelector.selectStrategy(confidenceLevel);

            // Assert - Should never return null/undefined/empty
            expect(result).not.toBeNull();
            expect(result).not.toBeUndefined();
            expect(result).toBeTruthy();
            
            expect(result.type).not.toBeNull();
            expect(result.type).not.toBeUndefined();
            expect(result.type).not.toBe('');
            
            expect(result.contentFocus).not.toBeNull();
            expect(result.contentFocus).not.toBeUndefined();
            expect(result.contentFocus).not.toBe('');
            
            expect(result.callToActionLevel).not.toBeNull();
            expect(result.callToActionLevel).not.toBeUndefined();
            expect(result.callToActionLevel).not.toBe('');
            
            expect(result.toneGuidelines).not.toBeNull();
            expect(result.toneGuidelines).not.toBeUndefined();
            expect(result.toneGuidelines.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 17: Deterministic Strategy Selection
   * **Validates: Requirements 5.5**
   * 
   * For any identical confidence level scenarios, the system should consistently select the same strategy
   */
  describe('Property 17: Deterministic Strategy Selection', () => {
    it('should return identical strategies for identical confidence levels', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(ConfidenceLevel)),
          (confidenceLevel: ConfidenceLevel) => {
            // Act - Call multiple times with same input
            const result1 = strategySelector.selectStrategy(confidenceLevel);
            const result2 = strategySelector.selectStrategy(confidenceLevel);
            const result3 = strategySelector.selectStrategy(confidenceLevel);

            // Assert - All results should be identical
            expect(result1).toEqual(result2);
            expect(result2).toEqual(result3);
            expect(result1).toEqual(result3);
            
            // Verify deep equality of all properties
            expect(result1.type).toBe(result2.type);
            expect(result1.type).toBe(result3.type);
            
            expect(result1.callToActionLevel).toBe(result2.callToActionLevel);
            expect(result1.callToActionLevel).toBe(result3.callToActionLevel);
            
            expect(result1.contentFocus).toBe(result2.contentFocus);
            expect(result1.contentFocus).toBe(result3.contentFocus);
            
            expect(result1.toneGuidelines).toEqual(result2.toneGuidelines);
            expect(result1.toneGuidelines).toEqual(result3.toneGuidelines);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be deterministic across different StrategySelector instances', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(ConfidenceLevel)),
          (confidenceLevel: ConfidenceLevel) => {
            // Arrange - Create multiple instances
            const selector1 = new StrategySelector();
            const selector2 = new StrategySelector();
            const selector3 = new StrategySelector();

            // Act
            const result1 = selector1.selectStrategy(confidenceLevel);
            const result2 = selector2.selectStrategy(confidenceLevel);
            const result3 = selector3.selectStrategy(confidenceLevel);

            // Assert - All instances should return identical results
            expect(result1).toEqual(result2);
            expect(result2).toEqual(result3);
            expect(result1).toEqual(result3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency over time for the same confidence level', () => {
      const confidenceLevel = ConfidenceLevel.HIGH;
      
      // Act - Get initial result
      const initialResult = strategySelector.selectStrategy(confidenceLevel);
      
      // Simulate time passing and other operations
      const otherResults = [
        strategySelector.selectStrategy(ConfidenceLevel.LOW),
        strategySelector.selectStrategy(ConfidenceLevel.MEDIUM),
        strategySelector.selectStrategy(ConfidenceLevel.LOW)
      ];
      
      // Act - Get result again after other operations
      const laterResult = strategySelector.selectStrategy(confidenceLevel);

      // Assert - Should be identical regardless of other operations
      expect(initialResult).toEqual(laterResult);
      
      // Verify other operations didn't affect determinism
      expect(otherResults[0]).toEqual(strategySelector.selectStrategy(ConfidenceLevel.LOW));
      expect(otherResults[1]).toEqual(strategySelector.selectStrategy(ConfidenceLevel.MEDIUM));
    });

    it('should produce consistent results for all confidence levels', () => {
      // Act - Get baseline results for all confidence levels
      const baselineResults = {
        [ConfidenceLevel.HIGH]: strategySelector.selectStrategy(ConfidenceLevel.HIGH),
        [ConfidenceLevel.MEDIUM]: strategySelector.selectStrategy(ConfidenceLevel.MEDIUM),
        [ConfidenceLevel.LOW]: strategySelector.selectStrategy(ConfidenceLevel.LOW)
      };

      // Act - Repeat multiple times and verify consistency
      for (let i = 0; i < 10; i++) {
        const currentResults = {
          [ConfidenceLevel.HIGH]: strategySelector.selectStrategy(ConfidenceLevel.HIGH),
          [ConfidenceLevel.MEDIUM]: strategySelector.selectStrategy(ConfidenceLevel.MEDIUM),
          [ConfidenceLevel.LOW]: strategySelector.selectStrategy(ConfidenceLevel.LOW)
        };

        // Assert - Each confidence level should always produce the same result
        expect(currentResults[ConfidenceLevel.HIGH]).toEqual(baselineResults[ConfidenceLevel.HIGH]);
        expect(currentResults[ConfidenceLevel.MEDIUM]).toEqual(baselineResults[ConfidenceLevel.MEDIUM]);
        expect(currentResults[ConfidenceLevel.LOW]).toEqual(baselineResults[ConfidenceLevel.LOW]);
      }
    });

    it('should have no randomness or variability in strategy selection', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(ConfidenceLevel)),
          fc.integer({ min: 5, max: 20 }), // Number of iterations
          (confidenceLevel: ConfidenceLevel, iterations: number) => {
            // Act - Call many times and collect all results
            const results = [];
            for (let i = 0; i < iterations; i++) {
              results.push(strategySelector.selectStrategy(confidenceLevel));
            }

            // Assert - All results should be identical (no randomness)
            const firstResult = results[0];
            results.forEach((result, _index) => {
              expect(result).toEqual(firstResult);
              
              // Verify each property is identical
              expect(result.type).toBe(firstResult.type);
              expect(result.callToActionLevel).toBe(firstResult.callToActionLevel);
              expect(result.contentFocus).toBe(firstResult.contentFocus);
              expect(result.toneGuidelines).toEqual(firstResult.toneGuidelines);
            });

            // Verify no variation in array lengths or content
            const uniqueTypes = new Set(results.map(r => r.type));
            const uniqueCallToActions = new Set(results.map(r => r.callToActionLevel));
            const uniqueContentFocus = new Set(results.map(r => r.contentFocus));
            
            expect(uniqueTypes.size).toBe(1);
            expect(uniqueCallToActions.size).toBe(1);
            expect(uniqueContentFocus.size).toBe(1);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain determinism with concurrent calls', async () => {
      const confidenceLevel = ConfidenceLevel.MEDIUM;
      
      // Act - Make concurrent calls
      const promises = Array.from({ length: 10 }, () => 
        Promise.resolve(strategySelector.selectStrategy(confidenceLevel))
      );
      
      const results = await Promise.all(promises);

      // Assert - All concurrent results should be identical
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toEqual(firstResult);
      });
    });

    it('should produce different but consistent results for different confidence levels', () => {
      // Act - Get results for all confidence levels
      const highResult = strategySelector.selectStrategy(ConfidenceLevel.HIGH);
      const mediumResult = strategySelector.selectStrategy(ConfidenceLevel.MEDIUM);
      const lowResult = strategySelector.selectStrategy(ConfidenceLevel.LOW);

      // Assert - Results should be different between confidence levels
      expect(highResult).not.toEqual(mediumResult);
      expect(mediumResult).not.toEqual(lowResult);
      expect(highResult).not.toEqual(lowResult);
      
      // But each should be consistent when called again
      expect(highResult).toEqual(strategySelector.selectStrategy(ConfidenceLevel.HIGH));
      expect(mediumResult).toEqual(strategySelector.selectStrategy(ConfidenceLevel.MEDIUM));
      expect(lowResult).toEqual(strategySelector.selectStrategy(ConfidenceLevel.LOW));
    });
  });
});