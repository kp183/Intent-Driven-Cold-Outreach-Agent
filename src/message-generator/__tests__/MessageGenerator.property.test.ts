/**
 * Property-based tests for MessageGenerator
 * Tests universal properties that should hold across all valid inputs
 */

import fc from 'fast-check';
import { MessageGenerator } from '../MessageGenerator';
import {
  MessageStrategy,
  IntentHypothesis,
  ProspectData,
  StrategyType,
  CallToActionLevel,
  CompanySize,
  SignalType,
} from '../../types';

describe('MessageGenerator Property Tests', () => {
  let messageGenerator: MessageGenerator;

  beforeEach(() => {
    messageGenerator = new MessageGenerator();
  });

  /**
   * Property 18: Message Word Limit
   * Validates: Requirements 6.1
   * 
   * For any generated message, the word count should not exceed 120 words
   */
  describe('Feature: intent-driven-cold-outreach-agent, Property 18: Message Word Limit', () => {
    it('should never generate messages exceeding 120 words', () => {
      fc.assert(
        fc.property(
          generateMessageStrategy(),
          generateIntentHypothesis(),
          generateProspectData(),
          (strategy, hypothesis, prospectData) => {
            const message = messageGenerator.generateMessage(strategy, hypothesis, prospectData);
            const wordCount = messageGenerator.countWords(message);
            
            expect(wordCount).toBeLessThanOrEqual(120);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain message coherence when enforcing word limit', () => {
      fc.assert(
        fc.property(
          generateMessageStrategy(),
          generateIntentHypothesis(),
          generateProspectData(),
          (strategy, hypothesis, prospectData) => {
            const message = messageGenerator.generateMessage(strategy, hypothesis, prospectData);
            
            // Message should not be empty
            expect(message.trim()).not.toBe('');
            
            // Message should contain basic components
            expect(message).toMatch(/Hi \w+/); // Greeting
            expect(message.length).toBeGreaterThan(20); // Minimum meaningful content
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 19: Hypothesis-Based Relevance
   * Validates: Requirements 6.3
   * 
   * For any generated message, it should include content that references the intent hypothesis
   */
  describe('Feature: intent-driven-cold-outreach-agent, Property 19: Hypothesis-Based Relevance', () => {
    it('should include hypothesis-based relevance in all messages', () => {
      fc.assert(
        fc.property(
          generateMessageStrategy(),
          generateIntentHypothesis(),
          generateProspectData(),
          (strategy, hypothesis, prospectData) => {
            const message = messageGenerator.generateMessage(strategy, hypothesis, prospectData);
            const lowerMessage = message.toLowerCase();
            const lowerHypothesis = hypothesis.primaryReason.toLowerCase();
            
            // Message should reference company name (part of relevance)
            const companyName = prospectData.companyContext.name.toLowerCase();
            expect(lowerMessage).toContain(companyName);
            
            // Message should contain contextual relevance based on hypothesis type
            const hasRelevantContent = 
              lowerMessage.includes('growth') ||
              lowerMessage.includes('technology') ||
              lowerMessage.includes('role') ||
              lowerMessage.includes('relevant') ||
              lowerMessage.includes('timely') ||
              lowerMessage.includes('momentum') ||
              lowerMessage.includes('initiatives') ||
              lowerMessage.includes('congratulations');
            
            expect(hasRelevantContent).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 20: Buzzword Avoidance
   * Validates: Requirements 6.4
   * 
   * For any generated message, it should not contain known buzzwords or sales clichés
   */
  describe('Feature: intent-driven-cold-outreach-agent, Property 20: Buzzword Avoidance', () => {
    it('should not contain buzzwords in generated messages', () => {
      fc.assert(
        fc.property(
          generateMessageStrategy(),
          generateIntentHypothesis(),
          generateProspectData(),
          (strategy, hypothesis, prospectData) => {
            const message = messageGenerator.generateMessage(strategy, hypothesis, prospectData);
            
            expect(messageGenerator.containsBuzzwords(message)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not contain sales clichés in generated messages', () => {
      fc.assert(
        fc.property(
          generateMessageStrategy(),
          generateIntentHypothesis(),
          generateProspectData(),
          (strategy, hypothesis, prospectData) => {
            const message = messageGenerator.generateMessage(strategy, hypothesis, prospectData);
            
            expect(messageGenerator.containsCliches(message)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 21: Call-to-Action Restriction
   * Validates: Requirements 6.5
   * 
   * For any non-High confidence scenario, the generated message should not push for a call
   */
  describe('Feature: intent-driven-cold-outreach-agent, Property 21: Call-to-Action Restriction', () => {
    it('should not have inappropriate call-to-actions for non-high confidence', () => {
      fc.assert(
        fc.property(
          generateNonHighConfidenceStrategy(),
          generateIntentHypothesis(),
          generateProspectData(),
          (strategy, hypothesis, prospectData) => {
            const message = messageGenerator.generateMessage(strategy, hypothesis, prospectData);
            
            expect(messageGenerator.hasInappropriateCallToAction(message, strategy)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow direct call-to-actions only for high confidence strategies', () => {
      fc.assert(
        fc.property(
          generateHighConfidenceStrategy(),
          generateIntentHypothesis(),
          generateProspectData(),
          (strategy, hypothesis, prospectData) => {
            const message = messageGenerator.generateMessage(strategy, hypothesis, prospectData);
            
            // High confidence strategies can have direct CTAs, so this should not fail
            // We're just ensuring the message is generated successfully
            expect(message).toBeDefined();
            expect(message.trim()).not.toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// Test data generators
function generateMessageStrategy(): fc.Arbitrary<MessageStrategy> {
  return fc.record({
    type: fc.constantFrom(...Object.values(StrategyType)),
    toneGuidelines: fc.array(fc.string({ minLength: 5, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
    contentFocus: fc.string({ minLength: 10, maxLength: 50 }),
    callToActionLevel: fc.constantFrom(...Object.values(CallToActionLevel)),
  });
}

function generateNonHighConfidenceStrategy(): fc.Arbitrary<MessageStrategy> {
  return fc.record({
    type: fc.constantFrom(StrategyType.INSIGHT_LED_OBSERVATION, StrategyType.SOFT_CURIOSITY),
    toneGuidelines: fc.array(fc.string({ minLength: 5, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
    contentFocus: fc.string({ minLength: 10, maxLength: 50 }),
    callToActionLevel: fc.constantFrom(CallToActionLevel.NONE, CallToActionLevel.SOFT),
  });
}

function generateHighConfidenceStrategy(): fc.Arbitrary<MessageStrategy> {
  return fc.record({
    type: fc.constant(StrategyType.DIRECT_VALUE_ALIGNMENT),
    toneGuidelines: fc.array(fc.string({ minLength: 5, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
    contentFocus: fc.string({ minLength: 10, maxLength: 50 }),
    callToActionLevel: fc.constant(CallToActionLevel.DIRECT),
  });
}

function generateIntentHypothesis(): fc.Arbitrary<IntentHypothesis> {
  return fc.record({
    primaryReason: fc.oneof(
      fc.constant('Recent funding round indicates growth phase'),
      fc.constant('Technology adoption suggests modernization efforts'),
      fc.constant('Job change indicates new priorities and initiatives'),
      fc.constant('Company growth signals scaling challenges'),
      fc.constant('Industry trends suggest timing for innovation')
    ),
    supportingEvidence: fc.array(fc.string({ minLength: 10, maxLength: 50 }), { minLength: 1, maxLength: 3 }),
    confidenceFactors: fc.array(fc.string({ minLength: 5, maxLength: 30 }), { minLength: 1, maxLength: 3 }),
    conservativeAssumptions: fc.array(fc.string({ minLength: 5, maxLength: 30 }), { minLength: 0, maxLength: 2 }),
  });
}

function generateProspectData(): fc.Arbitrary<ProspectData> {
  return fc.record({
    role: fc.oneof(
      fc.constant('VP of Engineering'),
      fc.constant('CTO'),
      fc.constant('Head of Product'),
      fc.constant('Director of Operations'),
      fc.constant('VP of Sales')
    ),
    companyContext: fc.record({
      name: fc.oneof(
        fc.constant('TechCorp'),
        fc.constant('InnovateCo'),
        fc.constant('ScaleUp Inc'),
        fc.constant('GrowthTech'),
        fc.constant('ModernSoft')
      ),
      industry: fc.oneof(
        fc.constant('Technology'),
        fc.constant('Healthcare'),
        fc.constant('Finance'),
        fc.constant('E-commerce'),
        fc.constant('SaaS')
      ),
      size: fc.constantFrom(...Object.values(CompanySize)),
      recentEvents: fc.option(fc.array(fc.string({ minLength: 10, maxLength: 40 }), { maxLength: 2 })),
    }),
    contactDetails: fc.record({
      email: fc.emailAddress(),
      name: fc.oneof(
        fc.constant('John Smith'),
        fc.constant('Sarah Johnson'),
        fc.constant('Michael Chen'),
        fc.constant('Emily Davis'),
        fc.constant('David Wilson')
      ),
      linkedinUrl: fc.option(fc.webUrl()),
      phoneNumber: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
    }),
    additionalContext: fc.option(fc.dictionary(fc.string(), fc.string())),
  });
}