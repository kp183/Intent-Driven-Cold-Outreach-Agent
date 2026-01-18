/**
 * Property-based tests for Conservative Behavior and Safety Features
 * Tests universal properties for Requirements 10.1-10.5
 */

import * as fc from 'fast-check';
import { SignalInterpreter } from '../signal-interpreter/SignalInterpreter';
import { HypothesisFormer } from '../hypothesis-former/HypothesisFormer';
import { ConfidenceScorer } from '../confidence-scorer/ConfidenceScorer';
import { MessageGenerator } from '../message-generator/MessageGenerator';
import { AuthenticityFilter } from '../authenticity-filter/AuthenticityFilter';
import { OutputAssembler } from '../output-assembler/OutputAssembler';
import { 
  IntentSignal, 
  SignalType, 
  ConfidenceLevel, 
  StrategyType, 
  CallToActionLevel,
  CompanySize,
  FollowUpTiming
} from '../types';

describe('Conservative Behavior Property Tests', () => {
  let signalInterpreter: SignalInterpreter;
  let hypothesisFormer: HypothesisFormer;
  let confidenceScorer: ConfidenceScorer;
  let messageGenerator: MessageGenerator;
  let authenticityFilter: AuthenticityFilter;
  let outputAssembler: OutputAssembler;

  beforeEach(() => {
    signalInterpreter = new SignalInterpreter();
    hypothesisFormer = new HypothesisFormer();
    confidenceScorer = new ConfidenceScorer();
    messageGenerator = new MessageGenerator();
    authenticityFilter = new AuthenticityFilter();
    outputAssembler = new OutputAssembler(messageGenerator);
  });

  /**
   * Property 32: Conservative Interpretation
   * **Validates: Requirements 10.1**
   * 
   * For any unclear intent evidence, the system should choose conservative interpretations
   */
  describe('Property 32: Conservative Interpretation', () => {
    it('should choose conservative interpretations when intent evidence is unclear', () => {
      fc.assert(
        fc.property(
          generateUnclearEvidenceSignals(),
          (unclearSignals) => {
            // Interpret unclear signals
            const weightedSignals = signalInterpreter.interpretSignals(unclearSignals);
            
            // Form hypothesis from unclear signals
            const hypothesis = hypothesisFormer.formHypothesis(weightedSignals);
            
            // Score confidence
            const confidence = confidenceScorer.scoreConfidence(hypothesis, weightedSignals);
            
            // Conservative interpretation should result in:
            // 1. Lower weights for unclear signals
            const averageWeight = weightedSignals.reduce((sum, s) => sum + s.weight, 0) / weightedSignals.length;
            expect(averageWeight).toBeLessThan(0.7); // Conservative penalty applied
            
            // 2. Conservative language in hypothesis
            const hypothesisText = `${hypothesis.primaryReason} ${hypothesis.supportingEvidence.join(' ')}`.toLowerCase();
            const conservativeKeywords = ['may', 'might', 'could', 'potential', 'possible', 'appropriate'];
            const hasConservativeLanguage = conservativeKeywords.some(keyword => 
              hypothesisText.includes(keyword)
            );
            expect(hasConservativeLanguage).toBe(true);
            
            // 3. Conservative assumptions noted
            expect(hypothesis.conservativeAssumptions.length).toBeGreaterThan(0);
            
            // 4. Confidence should not be HIGH for unclear evidence
            expect(confidence).not.toBe(ConfidenceLevel.HIGH);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 33: Evidence-Based Intent
   * **Validates: Requirements 10.2**
   * 
   * For any intent determination, it should never be assumed without supporting evidence
   */
  describe('Property 33: Evidence-Based Intent', () => {
    it('should never assume intent without supporting evidence', () => {
      fc.assert(
        fc.property(
          generateWeakEvidenceSignals(),
          (weakSignals) => {
            const weightedSignals = signalInterpreter.interpretSignals(weakSignals);
            const hypothesis = hypothesisFormer.formHypothesis(weightedSignals);
            
            // Check that hypothesis is grounded in actual evidence
            if (hypothesis.supportingEvidence.length > 0) {
              // Each piece of supporting evidence should reference actual signal content
              hypothesis.supportingEvidence.forEach(evidence => {
                const evidenceMatchesSignal = weakSignals.some(signal => 
                  evidence.toLowerCase().includes(signal.description.toLowerCase().substring(0, 10))
                );
                // Evidence should either match signal content or be explicitly conservative
                const isConservativeEvidence = evidence.toLowerCase().includes('weak signal') ||
                                             evidence.toLowerCase().includes('no supporting evidence');
                
                expect(evidenceMatchesSignal || isConservativeEvidence).toBe(true);
              });
            } else {
              // If no supporting evidence, hypothesis should be explicitly conservative
              const isConservativeHypothesis = hypothesis.primaryReason.toLowerCase().includes('general business') ||
                                             hypothesis.primaryReason.toLowerCase().includes('timing may be appropriate');
              expect(isConservativeHypothesis).toBe(true);
            }
            
            // Conservative assumptions should acknowledge lack of evidence
            const assumptionsText = hypothesis.conservativeAssumptions.join(' ').toLowerCase();
            const acknowledgesLackOfEvidence = assumptionsText.includes('no specific intent') ||
                                            assumptionsText.includes('insufficient') ||
                                            assumptionsText.includes('weak signal') ||
                                            assumptionsText.includes('limited evidence');
            
            if (weakSignals.length === 0 || weakSignals.every(s => s.relevanceScore < 0.3)) {
              expect(acknowledgesLackOfEvidence).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 34: Grounded Value Propositions
   * **Validates: Requirements 10.3**
   * 
   * For any generated content, value propositions should not be exaggerated and data should not be fabricated
   */
  describe('Property 34: Grounded Value Propositions', () => {
    it('should not exaggerate value propositions or fabricate data', () => {
      fc.assert(
        fc.property(
          generateValidProspectData(),
          generateValidIntentSignals(),
          (prospectData, signals) => {
            const weightedSignals = signalInterpreter.interpretSignals(signals);
            const hypothesis = hypothesisFormer.formHypothesis(weightedSignals);
            const confidence = confidenceScorer.scoreConfidence(hypothesis, weightedSignals);
            
            // Generate message strategy based on confidence
            const strategy = {
              type: confidence === ConfidenceLevel.HIGH ? StrategyType.DIRECT_VALUE_ALIGNMENT :
                    confidence === ConfidenceLevel.MEDIUM ? StrategyType.INSIGHT_LED_OBSERVATION :
                    StrategyType.SOFT_CURIOSITY,
              toneGuidelines: ['professional', 'respectful'],
              contentFocus: 'business relevance',
              callToActionLevel: confidence === ConfidenceLevel.HIGH ? CallToActionLevel.DIRECT :
                               confidence === ConfidenceLevel.MEDIUM ? CallToActionLevel.SOFT :
                               CallToActionLevel.NONE
            };
            
            const message = messageGenerator.generateMessage(strategy, hypothesis, prospectData);
            
            // Check for exaggerated claims
            const exaggeratedTerms = [
              'guaranteed', 'proven results', 'best ever', 'revolutionary', 'game-changing',
              'incredible', 'amazing', 'unbelievable', 'phenomenal', 'extraordinary',
              'will definitely', 'always works', 'never fails', 'instant success'
            ];
            
            const messageLower = message.toLowerCase();
            const hasExaggeratedClaims = exaggeratedTerms.some(term => 
              messageLower.includes(term)
            );
            expect(hasExaggeratedClaims).toBe(false);
            
            // Check for fabricated data (specific numbers, percentages, statistics not in input)
            const fabricatedDataPatterns = [
              /\d+%\s*(increase|improvement|growth|roi)/gi,
              /\$\d+[kmb]?\s*(saved|revenue|profit)/gi,
              /\d+x\s*(faster|better|more)/gi,
              /within\s+\d+\s+(days|weeks|months)/gi
            ];
            
            const hasFabricatedData = fabricatedDataPatterns.some(pattern => 
              pattern.test(message)
            );
            expect(hasFabricatedData).toBe(false);
            
            // Check for grounded language
            const groundedLanguage = [
              'may', 'might', 'could', 'potentially', 'sometimes', 'often',
              'in my experience', 'based on', 'according to', 'suggests'
            ];
            
            const hasGroundedLanguage = groundedLanguage.some(phrase => 
              messageLower.includes(phrase)
            );
            
            // For low confidence, should definitely have grounded language
            if (confidence === ConfidenceLevel.LOW) {
              expect(hasGroundedLanguage).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 35: Uncertainty Acknowledgment
   * **Validates: Requirements 10.4**
   * 
   * For any low confidence scenario, the messaging should acknowledge uncertainty
   */
  describe('Property 35: Uncertainty Acknowledgment', () => {
    it('should acknowledge uncertainty when confidence is low', () => {
      fc.assert(
        fc.property(
          generateLowConfidenceScenario(),
          ({ prospectData, signals, strategy }) => {
            const weightedSignals = signalInterpreter.interpretSignals(signals);
            const hypothesis = hypothesisFormer.formHypothesis(weightedSignals);
            const confidence = confidenceScorer.scoreConfidence(hypothesis, weightedSignals);
            
            // Generate message
            const message = messageGenerator.generateMessage(strategy, hypothesis, prospectData);
            
            // Generate reasoning summary
            const reasoning = `${confidence.toLowerCase()} confidence assessment based on available signals. ${hypothesis.primaryReason}`;
            
            // Assemble output (which should add uncertainty acknowledgment for low confidence)
            const output = outputAssembler.assembleOutput(
              message,
              confidence,
              reasoning,
              ['Alternative 1', 'Alternative 2'],
              {
                workflowSteps: ['test'],
                executionTime: 100,
                auditLog: [],
                version: '1.0.0'
              }
            );
            
            if (confidence === ConfidenceLevel.LOW) {
              // Check message for uncertainty acknowledgment
              const messageLower = message.toLowerCase();
              const uncertaintyPhrases = [
                'might', 'may', 'could', 'potentially', 'if the timing seems right',
                'no pressure', 'when the timing works', 'though', 'recognize',
                'understand', 'every situation is unique'
              ];
              
              const hasUncertaintyInMessage = uncertaintyPhrases.some(phrase => 
                messageLower.includes(phrase)
              );
              expect(hasUncertaintyInMessage).toBe(true);
              
              // Check reasoning summary for uncertainty acknowledgment
              const reasoningLower = output.reasoningSummary.toLowerCase();
              const uncertaintyInReasoning = [
                'may vary', 'uncertainties', 'cannot be guaranteed', 
                'limitations', 'not possible', 'though'
              ];
              
              const hasUncertaintyInReasoning = uncertaintyInReasoning.some(phrase => 
                reasoningLower.includes(phrase)
              );
              expect(hasUncertaintyInReasoning).toBe(true);
              
              // Follow-up timing should be conservative (longer) for low confidence
              expect(output.suggestedFollowUpTiming).toBe(FollowUpTiming.ONE_MONTH);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 36: Safety Over Persuasiveness
   * **Validates: Requirements 10.5**
   * 
   * For any scenario where business safety conflicts with message persuasiveness, safety should be prioritized
   */
  describe('Property 36: Safety Over Persuasiveness', () => {
    it('should prioritize business safety over message persuasiveness', () => {
      fc.assert(
        fc.property(
          generateRiskyScenario(),
          ({ prospectData, signals, strategy }) => {
            const weightedSignals = signalInterpreter.interpretSignals(signals);
            const hypothesis = hypothesisFormer.formHypothesis(weightedSignals);
            const confidence = confidenceScorer.scoreConfidence(hypothesis, weightedSignals);
            
            // Generate message
            const message = messageGenerator.generateMessage(strategy, hypothesis, prospectData);
            
            // Evaluate authenticity (which includes safety checks)
            const authenticityResult = authenticityFilter.evaluateAuthenticity(message, confidence);
            
            // Safety prioritization should result in:
            // 1. Conservative confidence scoring for risky scenarios
            if (signals.some((s: IntentSignal) => s.relevanceScore < 0.3) && signals.length < 2) {
              expect(confidence).toBe(ConfidenceLevel.LOW);
            }
            
            // 2. Higher authenticity standards (more likely to trigger revision)
            if (authenticityResult.issues.length > 1) {
              expect(authenticityResult.revisionRequired).toBe(true);
            }
            
            // 3. No high-pressure sales language
            const highPressureTerms = [
              'urgent', 'limited time', 'act now', 'don\'t miss out', 'exclusive deal',
              'today only', 'immediate action', 'once in a lifetime'
            ];
            
            const messageLower = message.toLowerCase();
            const hasHighPressureLanguage = highPressureTerms.some(term => 
              messageLower.includes(term)
            );
            expect(hasHighPressureLanguage).toBe(false);
            
            // 4. Conservative call-to-action for uncertain scenarios
            if (confidence !== ConfidenceLevel.HIGH) {
              const aggressiveCallToActions = [
                'let\'s schedule a call', 'book a meeting', 'set up a demo',
                'hop on a call', 'jump on a call'
              ];
              
              const hasAggressiveCallToAction = aggressiveCallToActions.some(cta => 
                messageLower.includes(cta)
              );
              expect(hasAggressiveCallToAction).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// Generator functions for test data

function generateUnclearEvidenceSignals(): fc.Arbitrary<IntentSignal[]> {
  return fc.array(
    fc.record({
      type: fc.constantFrom(...Object.values(SignalType)),
      description: fc.string({ minLength: 5, maxLength: 30 }), // Shorter, less detailed descriptions
      timestamp: fc.date({ 
        min: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Up to 90 days old
        max: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)  // At least 15 days old
      }),
      relevanceScore: fc.float({ min: Math.fround(0.3), max: Math.fround(0.7) }), // Mid-range scores (unclear)
      source: fc.string({ minLength: 3, maxLength: 20 }),
      metadata: fc.constant(undefined)
    }),
    { minLength: 1, maxLength: 3 }
  );
}

function generateWeakEvidenceSignals(): fc.Arbitrary<IntentSignal[]> {
  return fc.array(
    fc.record({
      type: fc.constantFrom(...Object.values(SignalType)),
      description: fc.oneof(
        fc.constant('might be relevant'),
        fc.constant('could indicate interest'),
        fc.constant('possibly suggests timing'),
        fc.string({ minLength: 3, maxLength: 15 }) // Very short descriptions
      ),
      timestamp: fc.date({ 
        min: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // Up to 120 days old
        max: new Date()
      }),
      relevanceScore: fc.float({ min: Math.fround(0.01), max: Math.fround(0.4) }), // Low relevance scores
      source: fc.string({ minLength: 3, maxLength: 15 }),
      metadata: fc.constant(undefined)
    }),
    { minLength: 0, maxLength: 2 } // Few or no signals
  );
}

function generateValidProspectData(): fc.Arbitrary<any> {
  return fc.record({
    role: fc.constantFrom('CEO', 'CTO', 'VP Engineering', 'Director of Sales', 'Marketing Manager'),
    companyContext: fc.record({
      name: fc.string({ minLength: 3, maxLength: 20 }),
      industry: fc.constantFrom('Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail'),
      size: fc.constantFrom(...Object.values(CompanySize)),
      recentEvents: fc.option(fc.array(fc.string({ minLength: 5, maxLength: 30 }), { maxLength: 2 }))
    }),
    contactDetails: fc.record({
      email: fc.emailAddress(),
      name: fc.string({ minLength: 5, maxLength: 30 }),
      linkedinUrl: fc.option(fc.webUrl()),
      phoneNumber: fc.option(fc.string({ minLength: 10, maxLength: 15 }))
    }),
    additionalContext: fc.option(fc.dictionary(fc.string(), fc.string()))
  });
}

function generateValidIntentSignals(): fc.Arbitrary<IntentSignal[]> {
  return fc.array(
    fc.record({
      type: fc.constantFrom(...Object.values(SignalType)),
      description: fc.string({ minLength: 10, maxLength: 100 }),
      timestamp: fc.date({ 
        min: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        max: new Date()
      }),
      relevanceScore: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }),
      source: fc.string({ minLength: 5, maxLength: 30 }),
      metadata: fc.option(fc.dictionary(fc.string(), fc.string()))
    }),
    { minLength: 1, maxLength: 4 }
  );
}

function generateLowConfidenceScenario(): fc.Arbitrary<any> {
  return fc.record({
    prospectData: generateValidProspectData(),
    signals: generateWeakEvidenceSignals(),
    strategy: fc.record({
      type: fc.constant(StrategyType.SOFT_CURIOSITY),
      toneGuidelines: fc.constant(['gentle', 'curious', 'non-pushy']),
      contentFocus: fc.constant('exploratory discussion'),
      callToActionLevel: fc.constant(CallToActionLevel.NONE)
    })
  });
}

function generateRiskyScenario(): fc.Arbitrary<any> {
  return fc.record({
    prospectData: generateValidProspectData(),
    signals: fc.oneof(
      fc.constant([]), // No signals
      fc.array(
        fc.record({
          type: fc.constantFrom(...Object.values(SignalType)),
          description: fc.oneof(
            fc.constant('urgent need'),
            fc.constant('immediate opportunity'),
            fc.constant('critical situation'),
            fc.string({ minLength: 3, maxLength: 10 }) // Very short descriptions
          ),
          timestamp: fc.date({ 
            min: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // Very old
            max: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
          }),
          relevanceScore: fc.float({ min: Math.fround(0.01), max: Math.fround(0.3) }), // Very low relevance
          source: fc.string({ minLength: 3, maxLength: 10 }),
          metadata: fc.constant(undefined)
        }),
        { minLength: 1, maxLength: 1 } // Single weak signal
      )
    ),
    strategy: fc.record({
      type: fc.constantFrom(...Object.values(StrategyType)),
      toneGuidelines: fc.array(fc.string({ minLength: 3, maxLength: 15 }), { maxLength: 3 }),
      contentFocus: fc.string({ minLength: 5, maxLength: 30 }),
      callToActionLevel: fc.constantFrom(...Object.values(CallToActionLevel))
    })
  });
}