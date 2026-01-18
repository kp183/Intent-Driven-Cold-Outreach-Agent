/**
 * Property-based tests for AuthenticityFilter
 * Tests universal properties that should hold across all valid inputs
 */

import fc from 'fast-check';
import { AuthenticityFilter } from '../AuthenticityFilter';
import {
  ConfidenceLevel,
  AuthenticityResult,
} from '../../types';

describe('AuthenticityFilter Property Tests', () => {
  let authenticityFilter: AuthenticityFilter;

  beforeEach(() => {
    authenticityFilter = new AuthenticityFilter();
  });

  /**
   * Property 22: Template Detection
   * Validates: Requirements 7.1
   * 
   * For any message evaluated by the authenticity filter, templated messages should be correctly identified
   */
  describe('Feature: intent-driven-cold-outreach-agent, Property 22: Template Detection', () => {
    it('should detect template patterns in messages', () => {
      fc.assert(
        fc.property(
          generateTemplatedMessage(),
          generateConfidenceLevel(),
          (templatedMessage, confidenceLevel) => {
            const result = authenticityFilter.evaluateAuthenticity(templatedMessage, confidenceLevel);
            
            // Should detect template issues
            const hasTemplateIssues = result.issues.some(issue => issue.type === 'template');
            expect(hasTemplateIssues).toBe(true);
            
            // Should trigger revision for template issues
            expect(result.revisionRequired).toBe(true);
            
            // Should not be considered authentic
            expect(result.isAuthentic).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not flag non-templated messages as templates', () => {
      fc.assert(
        fc.property(
          generateNonTemplatedMessage(),
          generateConfidenceLevel(),
          (nonTemplatedMessage, confidenceLevel) => {
            const result = authenticityFilter.evaluateAuthenticity(nonTemplatedMessage, confidenceLevel);
            
            // Should not detect template issues in non-templated messages
            const hasTemplateIssues = result.issues.some(issue => issue.type === 'template');
            expect(hasTemplateIssues).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide appropriate suggestions for template issues', () => {
      fc.assert(
        fc.property(
          generateTemplatedMessage(),
          generateConfidenceLevel(),
          (templatedMessage, confidenceLevel) => {
            const result = authenticityFilter.evaluateAuthenticity(templatedMessage, confidenceLevel);
            
            const templateIssues = result.issues.filter(issue => issue.type === 'template');
            if (templateIssues.length > 0) {
              // All template issues should have suggestions
              templateIssues.forEach(issue => {
                expect(issue.suggestion).toBeDefined();
                expect(issue.suggestion!.length).toBeGreaterThan(0);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 23: Artificial Language Detection
   * Validates: Requirements 7.2
   * 
   * For any message with robotic or artificial language patterns, the authenticity filter should detect them
   */
  describe('Feature: intent-driven-cold-outreach-agent, Property 23: Artificial Language Detection', () => {
    it('should detect artificial language patterns in messages', () => {
      fc.assert(
        fc.property(
          generateArtificialMessage(),
          generateConfidenceLevel(),
          (artificialMessage, confidenceLevel) => {
            const result = authenticityFilter.evaluateAuthenticity(artificialMessage, confidenceLevel);
            
            // Should detect artificial language issues
            const hasArtificialIssues = result.issues.some(issue => issue.type === 'artificial_language');
            expect(hasArtificialIssues).toBe(true);
            
            // Artificial language should reduce authenticity score
            expect(result.score).toBeLessThan(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not flag natural language as artificial', () => {
      fc.assert(
        fc.property(
          generateNaturalMessage(),
          generateConfidenceLevel(),
          (naturalMessage, confidenceLevel) => {
            const result = authenticityFilter.evaluateAuthenticity(naturalMessage, confidenceLevel);
            
            // Should not detect artificial language issues in natural messages
            const hasArtificialIssues = result.issues.some(issue => issue.type === 'artificial_language');
            expect(hasArtificialIssues).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide suggestions for artificial language issues', () => {
      fc.assert(
        fc.property(
          generateArtificialMessage(),
          generateConfidenceLevel(),
          (artificialMessage, confidenceLevel) => {
            const result = authenticityFilter.evaluateAuthenticity(artificialMessage, confidenceLevel);
            
            const artificialIssues = result.issues.filter(issue => issue.type === 'artificial_language');
            if (artificialIssues.length > 0) {
              // All artificial language issues should have suggestions
              artificialIssues.forEach(issue => {
                expect(issue.suggestion).toBeDefined();
                expect(issue.suggestion!.length).toBeGreaterThan(0);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 24: Salesiness Appropriateness
   * Validates: Requirements 7.3
   * 
   * For any overly salesy content, the authenticity filter should flag it as inappropriate for the confidence level
   */
  describe('Feature: intent-driven-cold-outreach-agent, Property 24: Salesiness Appropriateness', () => {
    it('should flag high-pressure sales language regardless of confidence level', () => {
      fc.assert(
        fc.property(
          generateHighPressureSalesMessage(),
          generateConfidenceLevel(),
          (salesMessage, confidenceLevel) => {
            const result = authenticityFilter.evaluateAuthenticity(salesMessage, confidenceLevel);
            
            // Should detect overly salesy issues
            const hasSalesyIssues = result.issues.some(issue => issue.type === 'overly_salesy');
            expect(hasSalesyIssues).toBe(true);
            
            // Should trigger revision for high-pressure sales language
            expect(result.revisionRequired).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should flag direct sales language for non-high confidence levels', () => {
      fc.assert(
        fc.property(
          generateDirectSalesMessage(),
          generateNonHighConfidenceLevel(),
          (salesMessage, confidenceLevel) => {
            const result = authenticityFilter.evaluateAuthenticity(salesMessage, confidenceLevel);
            
            // Should detect overly salesy issues for non-high confidence
            const hasSalesyIssues = result.issues.some(issue => issue.type === 'overly_salesy');
            expect(hasSalesyIssues).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow appropriate sales language for high confidence levels', () => {
      fc.assert(
        fc.property(
          generateModerateSalesMessage(),
          fc.constant(ConfidenceLevel.HIGH),
          (salesMessage, confidenceLevel) => {
            const result = authenticityFilter.evaluateAuthenticity(salesMessage, confidenceLevel);
            
            // Should not flag moderate sales language for high confidence
            const hasSalesyIssues = result.issues.some(issue => 
              issue.type === 'overly_salesy' && 
              issue.description.includes('inappropriate for High confidence')
            );
            expect(hasSalesyIssues).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should flag moderate sales language for low confidence levels', () => {
      fc.assert(
        fc.property(
          generateModerateSalesMessage(),
          fc.constant(ConfidenceLevel.LOW),
          (salesMessage, confidenceLevel) => {
            const result = authenticityFilter.evaluateAuthenticity(salesMessage, confidenceLevel);
            
            // Should flag moderate sales language for low confidence
            const hasSalesyIssues = result.issues.some(issue => issue.type === 'overly_salesy');
            expect(hasSalesyIssues).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 25: Revision Trigger
   * Validates: Requirements 7.4
   * 
   * For any message with detected authenticity issues, the system should trigger message revision
   */
  describe('Feature: intent-driven-cold-outreach-agent, Property 25: Revision Trigger', () => {
    it('should trigger revision for messages with high-severity issues', () => {
      fc.assert(
        fc.property(
          generateProblematicMessage(),
          generateConfidenceLevel(),
          (problematicMessage, confidenceLevel) => {
            const result = authenticityFilter.evaluateAuthenticity(problematicMessage, confidenceLevel);
            
            const hasHighSeverityIssues = result.issues.some(issue => issue.severity === 'high');
            if (hasHighSeverityIssues) {
              expect(result.revisionRequired).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should trigger revision for low authenticity scores', () => {
      fc.assert(
        fc.property(
          generateProblematicMessage(),
          generateConfidenceLevel(),
          (problematicMessage, confidenceLevel) => {
            const result = authenticityFilter.evaluateAuthenticity(problematicMessage, confidenceLevel);
            
            if (result.score < 70) {
              expect(result.revisionRequired).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not trigger revision for authentic messages', () => {
      fc.assert(
        fc.property(
          generateAuthenticMessage(),
          generateConfidenceLevel(),
          (authenticMessage, confidenceLevel) => {
            const result = authenticityFilter.evaluateAuthenticity(authenticMessage, confidenceLevel);
            
            // Authentic messages should not require revision
            if (result.isAuthentic) {
              expect(result.revisionRequired).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide revision suggestions when revision is required', () => {
      fc.assert(
        fc.property(
          generateProblematicMessage(),
          generateConfidenceLevel(),
          (problematicMessage, confidenceLevel) => {
            const result = authenticityFilter.evaluateAuthenticity(problematicMessage, confidenceLevel);
            
            if (result.revisionRequired) {
              const suggestions = authenticityFilter.getRevisionSuggestions(result.issues);
              expect(suggestions.length).toBeGreaterThan(0);
              suggestions.forEach(suggestion => {
                expect(suggestion.length).toBeGreaterThan(0);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// Test data generators

function generateConfidenceLevel(): fc.Arbitrary<ConfidenceLevel> {
  return fc.constantFrom(...Object.values(ConfidenceLevel));
}

function generateNonHighConfidenceLevel(): fc.Arbitrary<ConfidenceLevel> {
  return fc.constantFrom(ConfidenceLevel.MEDIUM, ConfidenceLevel.LOW);
}

function generateTemplatedMessage(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant('Hi [Name], I wanted to reach out about [Company] and see if you might be interested in [Product].'),
    fc.constant('Hello {{firstName}}, I noticed {{companyName}} is growing and thought this might be relevant.'),
    fc.constant('Dear ${name}, I came across ${company} and wanted to share something that might help.'),
    fc.constant('Hi <name>, I hope this email finds you well. I wanted to discuss <topic> with <company>.'),
    fc.constant('TEMPLATE: Replace this with personalized content for the prospect.'),
    fc.constant('Hi John, PLACEHOLDER text here. INSERT COMPANY NAME HERE.'),
    fc.constant('The same sentence repeated. The same sentence repeated. The same sentence repeated.')
  );
}

function generateNonTemplatedMessage(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant('Hi Sarah, I noticed TechCorp recently announced their Series B funding. Given your role as VP of Engineering, I thought this timing insight might be relevant.'),
    fc.constant('Hello Michael, Congratulations on your new position at InnovateCo. I came across your company and thought this might be worth exploring.'),
    fc.constant('Hi Emily, I\'ve been tracking similar patterns in the healthcare space, and companies like MedTech often find value in addressing this proactively.'),
    fc.constant('Hello David, I\'m curious about how ScaleUp Inc is approaching data infrastructure, as it seems like it could be relevant given your current growth phase.')
  );
}

function generateArtificialMessage(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant('I am writing to inform you that we would like to bring to your attention our revolutionary solution.'),
    fc.constant('Please be advised that our cutting-edge technology can provide synergistic benefits to your organization.'),
    fc.constant('Furthermore, moreover, additionally, we believe that consequently, therefore, thus our solution will be beneficial.'),
    fc.constant('This is to notify you that in accordance with our discussion, we are pleased to present our state-of-the-art offering.'),
    fc.constant('Pursuant to our previous correspondence, we would like to leverage our paradigm-shifting solution for your enterprise-grade requirements.'),
    fc.constant('This is an extremely long sentence that goes on and on without any natural breaks or pauses and contains way too many words to be considered natural human communication patterns which makes it sound robotic and artificial.')
  );
}

function generateNaturalMessage(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant('Hi John, I noticed your company recently raised funding. Thought this might be timely for your infrastructure planning.'),
    fc.constant('Hello Sarah, Congratulations on the new role! I came across InnovateCo and thought this could be relevant.'),
    fc.constant('Hi Michael, I\'ve been working with similar companies in your space. Would this be worth a brief conversation?'),
    fc.constant('Hello Emily, Given your recent technology initiatives, I thought this insight might be helpful.')
  );
}

function generateHighPressureSalesMessage(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant('LIMITED TIME OFFER! Act now before this exclusive deal expires!'),
    fc.constant('Don\'t miss out on this once in a lifetime opportunity! Today only special promotion!'),
    fc.constant('URGENT: Immediate action required! This exclusive deal won\'t last long!'),
    fc.constant('Act now or lose this amazing opportunity forever! Limited time offer expires soon!')
  );
}

function generateDirectSalesMessage(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant('Buy now and get started immediately with our solution!'),
    fc.constant('Purchase today and book a demo now to see the benefits!'),
    fc.constant('Sign up now and let\'s close this deal this week!'),
    fc.constant('Ready to move forward? Schedule a call today and get started immediately!')
  );
}

function generateModerateSalesMessage(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant('Would you be interested in learning more about how this could benefit your team?'),
    fc.constant('Let\'s explore this opportunity and see how it might apply to your situation.'),
    fc.constant('I\'d like to show you how other companies in your space have approached this challenge.'),
    fc.constant('This could benefit your organization. Would you like to discuss how it might work for you?')
  );
}

function generateProblematicMessage(): fc.Arbitrary<string> {
  return fc.oneof(
    generateTemplatedMessage(),
    generateArtificialMessage(),
    generateHighPressureSalesMessage(),
    fc.constant('Amazing incredible unbelievable fantastic outstanding revolutionary groundbreaking cutting-edge solution!'),
    fc.constant('Hi [Name], I am writing to inform you that furthermore, moreover, additionally we have a LIMITED TIME OFFER!')
  );
}

function generateAuthenticMessage(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant('Hi Sarah, I noticed TechCorp\'s recent growth and thought this timing might be relevant to your infrastructure planning.'),
    fc.constant('Hello Michael, Congratulations on your new role at InnovateCo. I thought this insight might be worth exploring.'),
    fc.constant('Hi Emily, I\'ve been working with similar healthcare companies. Would this be worth a brief conversation?'),
    fc.constant('Hello David, Given ScaleUp Inc\'s current phase, I\'m curious how you\'re approaching this challenge.')
  );
}