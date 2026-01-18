/**
 * Property-based tests for ConfidenceScorer
 * Tests universal properties that should hold across all valid inputs
 */

import fc from 'fast-check';
import { ConfidenceScorer } from '../ConfidenceScorer';
import { WeightedSignal, SignalType, IntentHypothesis, ConfidenceLevel } from '../../types';

describe('ConfidenceScorer Property Tests', () => {
  let confidenceScorer: ConfidenceScorer;

  beforeEach(() => {
    confidenceScorer = new ConfidenceScorer();
  });

  /**
   * Property 11: Confidence Level Assignment
   * **Validates: Requirements 4.1**
   * 
   * For any input scenario, the system should assign exactly one confidence level from High, Medium, or Low
   */
  describe('Property 11: Confidence Level Assignment', () => {
    it('should always assign exactly one valid confidence level for any input', () => {
      fc.assert(
        fc.property(
          // Generate hypothesis
          fc.record({
            primaryReason: fc.string({ minLength: 10, maxLength: 200 }),
            supportingEvidence: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { maxLength: 5 }),
            confidenceFactors: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
            conservativeAssumptions: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { maxLength: 5 })
          }),
          // Generate weighted signals
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
          (hypothesis: IntentHypothesis, signals: WeightedSignal[]) => {
            // Act
            const result = confidenceScorer.scoreConfidence(hypothesis, signals);

            // Assert - Should always return exactly one valid confidence level
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            
            // Should be one of the three valid confidence levels
            const validLevels = [ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM, ConfidenceLevel.LOW];
            expect(validLevels).toContain(result);
            
            // Should be exactly one of the enum values
            expect(Object.values(ConfidenceLevel)).toContain(result);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign Low confidence for empty or invalid inputs', () => {
      const validHypothesis: IntentHypothesis = {
        primaryReason: 'Test reason',
        supportingEvidence: ['Test evidence'],
        confidenceFactors: ['Test factor'],
        conservativeAssumptions: ['Test assumption']
      };

      // Empty signals
      expect(confidenceScorer.scoreConfidence(validHypothesis, [])).toBe(ConfidenceLevel.LOW);
      
      // Null/undefined signals
      expect(confidenceScorer.scoreConfidence(validHypothesis, null as any)).toBe(ConfidenceLevel.LOW);
      expect(confidenceScorer.scoreConfidence(validHypothesis, undefined as any)).toBe(ConfidenceLevel.LOW);
      
      // Null/undefined hypothesis
      expect(confidenceScorer.scoreConfidence(null as any, [])).toBe(ConfidenceLevel.LOW);
      expect(confidenceScorer.scoreConfidence(undefined as any, [])).toBe(ConfidenceLevel.LOW);
    });

    it('should assign consistent confidence level for identical inputs', () => {
      const hypothesis: IntentHypothesis = {
        primaryReason: 'Recent role change may create new priorities',
        supportingEvidence: ['Role transition: Person changed jobs'],
        confidenceFactors: ['Recent developments (1 signals)'],
        conservativeAssumptions: ['Hypothesis assumes business relevance without guaranteeing specific interest']
      };

      const signals: WeightedSignal[] = [
        {
          type: SignalType.JOB_CHANGE,
          description: 'Person changed jobs recently',
          timestamp: new Date(),
          relevanceScore: 0.8,
          source: 'linkedin',
          weight: 0.7,
          freshnessScore: 0.9
        }
      ];

      // Should return same result for multiple calls
      const result1 = confidenceScorer.scoreConfidence(hypothesis, signals);
      const result2 = confidenceScorer.scoreConfidence(hypothesis, signals);
      const result3 = confidenceScorer.scoreConfidence(hypothesis, signals);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });

  /**
   * Property 12: High Confidence for Strong Signals
   * **Validates: Requirements 4.2**
   * 
   * For any set of multiple strong, recent signals, the system should assign High confidence
   */
  describe('Property 12: High Confidence for Strong Signals', () => {
    it('should assign High confidence when multiple strong recent signals exist', () => {
      fc.assert(
        fc.property(
          // Generate strong hypothesis (non-conservative)
          fc.record({
            primaryReason: fc.constantFrom(
              'Recent role change may create new priorities and decision-making authority',
              'Recent funding may enable new initiatives and technology investments',
              'Technology changes may indicate evolving business needs'
            ),
            supportingEvidence: fc.array(
              fc.string({ minLength: 10, maxLength: 100 }), 
              { minLength: 2, maxLength: 4 }
            ),
            confidenceFactors: fc.array(
              fc.constantFrom(
                'Multiple supporting signals (2)',
                'Recent developments (2 signals)',
                'High relevance indicators (2 signals)',
                'Direct business signals (2)'
              ), 
              { minLength: 1, maxLength: 3 }
            ),
            conservativeAssumptions: fc.array(
              fc.constantFrom(
                'Hypothesis assumes business relevance without guaranteeing specific interest',
                'Some signals may be dated (0)'
              ), 
              { minLength: 1, maxLength: 2 }
            )
          }),
          // Generate multiple strong, recent signals
          fc.array(
            fc.record({
              type: fc.constantFrom(SignalType.JOB_CHANGE, SignalType.FUNDING_EVENT), // Direct signals
              description: fc.string({ minLength: 20, maxLength: 100 }),
              timestamp: fc.date({ min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), max: new Date() }), // Recent
              relevanceScore: fc.float({ min: Math.fround(0.7), max: Math.fround(1) }), // High relevance
              source: fc.string({ minLength: 5, maxLength: 20 }),
              weight: fc.float({ min: Math.fround(0.7), max: Math.fround(1) }), // Strong weight
              freshnessScore: fc.float({ min: Math.fround(0.6), max: Math.fround(1) }), // Fresh
              metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
            }),
            { minLength: 2, maxLength: 4 } // Multiple signals
          ),
          (hypothesis: IntentHypothesis, strongSignals: WeightedSignal[]) => {
            // Act
            const result = confidenceScorer.scoreConfidence(hypothesis, strongSignals);

            // Assert - Should assign High confidence for multiple strong, recent signals
            expect(result).toBe(ConfidenceLevel.HIGH);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should assign High confidence for perfect signal conditions', () => {
      const strongHypothesis: IntentHypothesis = {
        primaryReason: 'Recent funding may enable new initiatives and technology investments',
        supportingEvidence: [
          'Funding activity: Company raised Series A funding',
          'Role transition: New CTO hired'
        ],
        confidenceFactors: [
          'Multiple supporting signals (2)',
          'Recent developments (2 signals)',
          'Direct business signals (2)'
        ],
        conservativeAssumptions: [
          'Hypothesis assumes business relevance without guaranteeing specific interest'
        ]
      };

      const perfectSignals: WeightedSignal[] = [
        {
          type: SignalType.FUNDING_EVENT,
          description: 'Company raised $10M Series A funding',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
          relevanceScore: 0.95,
          source: 'crunchbase',
          weight: 0.9,
          freshnessScore: 0.9
        },
        {
          type: SignalType.JOB_CHANGE,
          description: 'New CTO hired to lead technology initiatives',
          timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
          relevanceScore: 0.85,
          source: 'linkedin',
          weight: 0.8,
          freshnessScore: 0.8
        }
      ];

      const result = confidenceScorer.scoreConfidence(strongHypothesis, perfectSignals);
      expect(result).toBe(ConfidenceLevel.HIGH);
    });
  });

  /**
   * Property 13: Medium Confidence for Mixed Signals
   * **Validates: Requirements 4.3**
   * 
   * For any set of mixed or indirect signals, the system should assign Medium confidence
   */
  describe('Property 13: Medium Confidence for Mixed Signals', () => {
    it('should assign Medium confidence for mixed signal strength', () => {
      fc.assert(
        fc.property(
          // Generate moderate hypothesis
          fc.record({
            primaryReason: fc.constantFrom(
              'Company growth may create new operational challenges',
              'Industry developments may influence strategic planning',
              'Technology changes may indicate evolving business needs'
            ),
            supportingEvidence: fc.array(
              fc.string({ minLength: 10, maxLength: 100 }), 
              { minLength: 1, maxLength: 3 }
            ),
            confidenceFactors: fc.array(
              fc.string({ minLength: 10, maxLength: 50 }), 
              { minLength: 1, maxLength: 2 }
            ),
            conservativeAssumptions: fc.array(
              fc.string({ minLength: 10, maxLength: 100 }), 
              { minLength: 1, maxLength: 3 }
            )
          }),
          // Generate mixed signals (some strong, some weak)
          fc.tuple(
            // At least one strong signal
            fc.record({
              type: fc.constantFrom(...Object.values(SignalType)),
              description: fc.string({ minLength: 15, maxLength: 80 }),
              timestamp: fc.date({ min: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), max: new Date() }),
              relevanceScore: fc.float({ min: Math.fround(0.5), max: Math.fround(0.8) }),
              source: fc.string({ minLength: 5, maxLength: 15 }),
              weight: fc.float({ min: Math.fround(0.4), max: Math.fround(0.7) }), // Medium weight
              freshnessScore: fc.float({ min: Math.fround(0.3), max: Math.fround(0.7) }),
              metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
            }),
            // Optional weaker signals
            fc.array(
              fc.record({
                type: fc.constantFrom(...Object.values(SignalType)),
                description: fc.string({ minLength: 10, maxLength: 60 }),
                timestamp: fc.date({ min: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), max: new Date() }),
                relevanceScore: fc.float({ min: Math.fround(0.2), max: Math.fround(0.6) }),
                source: fc.string({ minLength: 5, maxLength: 15 }),
                weight: fc.float({ min: Math.fround(0.1), max: Math.fround(0.5) }), // Weaker weight
                freshnessScore: fc.float({ min: Math.fround(0.1), max: Math.fround(0.5) }),
                metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
              }),
              { maxLength: 2 }
            )
          ),
          (hypothesis: IntentHypothesis, [strongSignal, weakSignals]: [WeightedSignal, WeightedSignal[]]) => {
            const mixedSignals = [strongSignal, ...weakSignals];
            
            // Ensure we have mixed strength (not all strong, not all weak)
            const averageWeight = mixedSignals.reduce((sum, s) => sum + s.weight, 0) / mixedSignals.length;
            
            // Skip if signals are too strong (would be High) or too weak (would be Low)
            if (averageWeight >= 0.7 || averageWeight < 0.4) {
              return; // Skip this test case
            }

            // Act
            const result = confidenceScorer.scoreConfidence(hypothesis, mixedSignals);

            // Assert - Should assign Medium confidence for mixed signals
            expect(result).toBe(ConfidenceLevel.MEDIUM);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should assign Medium confidence for indirect but reasonable signals', () => {
      const moderateHypothesis: IntentHypothesis = {
        primaryReason: 'Industry developments may influence strategic planning and priorities',
        supportingEvidence: [
          'Industry trend: AI adoption increasing in sector'
        ],
        confidenceFactors: [
          'Single supporting signal available'
        ],
        conservativeAssumptions: [
          'Hypothesis based on indirect signals only',
          'Hypothesis assumes business relevance without guaranteeing specific interest'
        ]
      };

      const indirectSignals: WeightedSignal[] = [
        {
          type: SignalType.INDUSTRY_TREND,
          description: 'AI adoption increasing rapidly in financial services',
          timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          relevanceScore: 0.6,
          source: 'industry_report',
          weight: 0.5,
          freshnessScore: 0.4
        }
      ];

      const result = confidenceScorer.scoreConfidence(moderateHypothesis, indirectSignals);
      expect(result).toBe(ConfidenceLevel.MEDIUM);
    });
  });

  /**
   * Property 14: Low Confidence for Weak Signals
   * **Validates: Requirements 4.4**
   * 
   * For any set of weak or assumed signals, the system should assign Low confidence
   */
  describe('Property 14: Low Confidence for Weak Signals', () => {
    it('should assign Low confidence for weak signals', () => {
      fc.assert(
        fc.property(
          // Generate conservative hypothesis
          fc.record({
            primaryReason: fc.constantFrom(
              'Timing may be appropriate for general business discussion',
              'General business relevance assumed only',
              'Potential relevance based on limited evidence'
            ),
            supportingEvidence: fc.array(
              fc.constantFrom(
                'Weak signal: Limited industry activity',
                'No supporting evidence available',
                'Weak signal: Unclear business context'
              ), 
              { minLength: 0, maxLength: 2 }
            ),
            confidenceFactors: fc.array(
              fc.constantFrom(
                'Conservative approach due to limited evidence',
                'Single supporting signal available'
              ), 
              { minLength: 1, maxLength: 1 }
            ),
            conservativeAssumptions: fc.array(
              fc.constantFrom(
                'No specific intent can be confidently determined',
                'Insufficient valid signals',
                'Weak signal strength',
                'General business relevance assumed only'
              ), 
              { minLength: 1, maxLength: 4 }
            )
          }),
          // Generate weak signals
          fc.array(
            fc.record({
              type: fc.constantFrom(...Object.values(SignalType)),
              description: fc.string({ minLength: 5, maxLength: 50 }),
              timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) }), // Old
              relevanceScore: fc.float({ min: Math.fround(0), max: Math.fround(0.3) }), // Low relevance
              source: fc.string({ minLength: 3, maxLength: 10 }),
              weight: fc.float({ min: Math.fround(0.01), max: Math.fround(0.3) }), // Weak weight
              freshnessScore: fc.float({ min: Math.fround(0.01), max: Math.fround(0.3) }), // Not fresh
              metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
            }),
            { minLength: 0, maxLength: 3 } // Few signals
          ),
          (hypothesis: IntentHypothesis, weakSignals: WeightedSignal[]) => {
            // Act
            const result = confidenceScorer.scoreConfidence(hypothesis, weakSignals);

            // Assert - Should assign Low confidence for weak signals
            expect(result).toBe(ConfidenceLevel.LOW);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign Low confidence for conservative hypothesis indicators', () => {
      const conservativeHypothesis: IntentHypothesis = {
        primaryReason: 'Timing may be appropriate for general business discussion',
        supportingEvidence: ['No supporting evidence available'],
        confidenceFactors: ['Conservative approach due to limited evidence'],
        conservativeAssumptions: [
          'No specific intent can be confidently determined',
          'General business relevance assumed only'
        ]
      };

      const anySignals: WeightedSignal[] = [
        {
          type: SignalType.COMPANY_GROWTH,
          description: 'Some company activity',
          timestamp: new Date(),
          relevanceScore: 0.8,
          source: 'news',
          weight: 0.9, // Even with strong signals, conservative hypothesis should force Low
          freshnessScore: 0.9
        }
      ];

      const result = confidenceScorer.scoreConfidence(conservativeHypothesis, anySignals);
      expect(result).toBe(ConfidenceLevel.LOW);
    });

    it('should assign Low confidence for signals with invalid weights', () => {
      const hypothesis: IntentHypothesis = {
        primaryReason: 'Test reason',
        supportingEvidence: ['Test evidence'],
        confidenceFactors: ['Test factor'],
        conservativeAssumptions: ['Test assumption']
      };

      const invalidSignals: WeightedSignal[] = [
        {
          type: SignalType.JOB_CHANGE,
          description: 'Test signal',
          timestamp: new Date(),
          relevanceScore: 0.8,
          source: 'test',
          weight: NaN, // Invalid weight
          freshnessScore: 0.8
        },
        {
          type: SignalType.FUNDING_EVENT,
          description: 'Test signal 2',
          timestamp: new Date(),
          relevanceScore: 0.8,
          source: 'test',
          weight: 0, // Zero weight
          freshnessScore: 0.8
        }
      ];

      const result = confidenceScorer.scoreConfidence(hypothesis, invalidSignals);
      expect(result).toBe(ConfidenceLevel.LOW);
    });
  });
});