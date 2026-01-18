/**
 * AuthenticityFilter - Validates message authenticity and spam characteristics
 * 
 * Implements authenticity evaluation with:
 * - Template detection logic
 * - Artificial language pattern detection
 * - Salesiness appropriateness checking
 * - Revision trigger mechanism
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { IAuthenticityFilter } from '../interfaces';
import {
  AuthenticityResult,
  AuthenticityIssue,
  ConfidenceLevel,
} from '../types';

export class AuthenticityFilter implements IAuthenticityFilter {
  // Template patterns that indicate templated messages
  private readonly TEMPLATE_PATTERNS = [
    /\[.*?\]/g, // Placeholder brackets like [Name], [Company]
    /\{\{.*?\}\}/g, // Template variables like {{name}}, {{company}}
    /\$\{.*?\}/g, // Template literals like ${name}, ${company}
    /<.*?>/g, // HTML-like placeholders like <name>, <company>
    /\bTEMPLATE\b/gi, // Literal "TEMPLATE" text
    /\bPLACEHOLDER\b/gi, // Literal "PLACEHOLDER" text
    /\bINSERT.*?HERE\b/gi, // "INSERT X HERE" patterns
    /\bFILL.*?IN\b/gi, // "FILL X IN" patterns
  ];

  // Artificial/robotic language patterns
  private readonly ARTIFICIAL_PATTERNS = [
    // Overly formal/robotic phrases
    /\bi am writing to inform you\b/gi,
    /\bplease be advised that\b/gi,
    /\bkindly be informed\b/gi,
    /\bthis is to notify you\b/gi,
    /\bwe would like to bring to your attention\b/gi,
    /\bfor your information\b/gi,
    /\bplease find attached\b/gi,
    /\bas per our discussion\b/gi,
    /\bin accordance with\b/gi,
    /\bpursuant to\b/gi,
    
    // Repetitive structures
    /(\b\w+\b)(\s+\1){2,}/gi, // Same word repeated 3+ times
    
    // Overly complex sentence structures
    /\b(furthermore|moreover|additionally|consequently|therefore|thus|hence)\b.*?\b(furthermore|moreover|additionally|consequently|therefore|thus|hence)\b/gi,
    
    // Unnatural transitions
    /\bthat being said\b.*?\bthat being said\b/gi,
    /\bin conclusion\b.*?\bin conclusion\b/gi,
  ];

  // Sales-heavy language patterns by confidence level
  private readonly SALES_PATTERNS = {
    // High-pressure sales language (inappropriate for any confidence level)
    HIGH_PRESSURE: [
      /\blimited time offer\b/gi,
      /\bact now\b/gi,
      /\bdon't miss out\b/gi,
      /\bonce in a lifetime\b/gi,
      /\bexclusive deal\b/gi,
      /\bspecial promotion\b/gi,
      /\btoday only\b/gi,
      /\burgent\b/gi,
      /\bimmediate action required\b/gi,
    ],
    
    // Direct sales language (only appropriate for HIGH confidence)
    DIRECT_SALES: [
      /\bbuy now\b/gi,
      /\bpurchase today\b/gi,
      /\bsign up now\b/gi,
      /\bget started immediately\b/gi,
      /\bbook a demo now\b/gi,
      /\bschedule a call today\b/gi,
      /\blet's close this deal\b/gi,
      /\bready to move forward\b/gi,
    ],
    
    // Moderate sales language (appropriate for MEDIUM+ confidence)
    MODERATE_SALES: [
      /\bwould you be interested in\b/gi,
      /\blet's explore this opportunity\b/gi,
      /\bi'd like to show you\b/gi,
      /\bthis could benefit your\b/gi,
      /\bwould you like to learn more\b/gi,
      /\blet's discuss how\b/gi,
    ],
  };

  // Buzzwords that indicate overly promotional content
  private readonly PROMOTIONAL_BUZZWORDS = [
    'amazing', 'incredible', 'unbelievable', 'fantastic', 'outstanding',
    'exceptional', 'extraordinary', 'phenomenal', 'spectacular', 'magnificent',
    'guaranteed', 'proven', 'certified', 'award-winning', 'industry-leading',
    'market-leading', 'best-in-class', 'world-class', 'premium', 'exclusive',
    'revolutionary', 'groundbreaking', 'cutting-edge', 'state-of-the-art',
    'game-changing', 'life-changing', 'transformative', 'disruptive'
  ];

  evaluateAuthenticity(
    message: string,
    confidenceLevel: ConfidenceLevel
  ): AuthenticityResult {
    const issues: AuthenticityIssue[] = [];
    
    // Check for template patterns (Requirement 7.1)
    const templateIssues = this.detectTemplatePatterns(message);
    issues.push(...templateIssues);
    
    // Check for artificial language patterns (Requirement 7.2)
    const artificialIssues = this.detectArtificialLanguage(message);
    issues.push(...artificialIssues);
    
    // Check for salesiness appropriateness (Requirement 7.3)
    const salesinessIssues = this.checkSalesinessAppropriateness(message, confidenceLevel);
    issues.push(...salesinessIssues);
    
    // Calculate overall authenticity score
    const score = this.calculateAuthenticityScore(issues);
    
    // Determine if revision is required (Requirement 7.4)
    const revisionRequired = this.shouldTriggerRevision(issues, score);
    
    return {
      isAuthentic: score >= 70 && !revisionRequired,
      issues,
      revisionRequired,
      score,
    };
  }

  private detectTemplatePatterns(message: string): AuthenticityIssue[] {
    const issues: AuthenticityIssue[] = [];
    
    this.TEMPLATE_PATTERNS.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches && matches.length > 0) {
        issues.push({
          type: 'template',
          description: `Template pattern detected: ${matches.join(', ')}`,
          severity: 'high',
          suggestion: 'Replace template placeholders with actual personalized content'
        });
      }
    });
    
    // Check for repeated identical phrases (template-like behavior)
    const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceMap = new Map<string, number>();
    
    sentences.forEach(sentence => {
      const normalized = sentence.trim().toLowerCase();
      if (normalized.length > 10) { // Only check substantial sentences
        sentenceMap.set(normalized, (sentenceMap.get(normalized) || 0) + 1);
      }
    });
    
    sentenceMap.forEach((count, sentence) => {
      if (count > 1) {
        issues.push({
          type: 'template',
          description: `Repeated sentence detected: "${sentence.substring(0, 50)}..."`,
          severity: 'high', // Changed from 'medium' to 'high' to ensure revision trigger
          suggestion: 'Vary sentence structure and content to avoid repetition'
        });
      }
    });
    
    return issues;
  }

  private detectArtificialLanguage(message: string): AuthenticityIssue[] {
    const issues: AuthenticityIssue[] = [];
    
    this.ARTIFICIAL_PATTERNS.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches && matches.length > 0) {
        issues.push({
          type: 'artificial_language',
          description: `Artificial language pattern detected: ${matches[0]}`,
          severity: 'medium',
          suggestion: 'Use more natural, conversational language'
        });
      }
    });
    
    // Check for overly long sentences (often artificial)
    const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
    sentences.forEach(sentence => {
      const wordCount = sentence.trim().split(/\s+/).length;
      if (wordCount > 30) {
        issues.push({
          type: 'artificial_language',
          description: `Overly long sentence detected (${wordCount} words)`,
          severity: 'low',
          suggestion: 'Break long sentences into shorter, more natural ones'
        });
      }
    });
    
    // Check for excessive use of formal connectors
    const formalConnectors = message.match(/\b(furthermore|moreover|additionally|consequently|therefore|thus|hence|nevertheless|nonetheless)\b/gi);
    if (formalConnectors && formalConnectors.length > 2) {
      issues.push({
        type: 'artificial_language',
        description: `Excessive formal connectors: ${formalConnectors.join(', ')}`,
        severity: 'medium',
        suggestion: 'Use simpler transitions and more conversational flow'
      });
    }
    
    return issues;
  }

  private checkSalesinessAppropriateness(
    message: string,
    confidenceLevel: ConfidenceLevel
  ): AuthenticityIssue[] {
    const issues: AuthenticityIssue[] = [];
    
    // High-pressure sales language is never appropriate
    this.SALES_PATTERNS.HIGH_PRESSURE.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches && matches.length > 0) {
        issues.push({
          type: 'overly_salesy',
          description: `High-pressure sales language: ${matches[0]}`,
          severity: 'high',
          suggestion: 'Remove high-pressure sales tactics and use consultative approach'
        });
      }
    });
    
    // Direct sales language only appropriate for HIGH confidence
    if (confidenceLevel !== ConfidenceLevel.HIGH) {
      this.SALES_PATTERNS.DIRECT_SALES.forEach(pattern => {
        const matches = message.match(pattern);
        if (matches && matches.length > 0) {
          issues.push({
            type: 'overly_salesy',
            description: `Direct sales language inappropriate for ${confidenceLevel} confidence: ${matches[0]}`,
            severity: 'high',
            suggestion: 'Use softer, more exploratory language appropriate for confidence level'
          });
        }
      });
    }
    
    // Moderate sales language only appropriate for MEDIUM+ confidence
    if (confidenceLevel === ConfidenceLevel.LOW) {
      this.SALES_PATTERNS.MODERATE_SALES.forEach(pattern => {
        const matches = message.match(pattern);
        if (matches && matches.length > 0) {
          issues.push({
            type: 'overly_salesy',
            description: `Moderate sales language inappropriate for LOW confidence: ${matches[0]}`,
            severity: 'medium',
            suggestion: 'Use curiosity-based language instead of sales-oriented phrases'
          });
        }
      });
    }
    
    // Check for excessive promotional buzzwords
    const buzzwordMatches = this.PROMOTIONAL_BUZZWORDS.filter(buzzword => 
      new RegExp(`\\b${buzzword}\\b`, 'gi').test(message)
    );
    
    if (buzzwordMatches.length > 2) {
      issues.push({
        type: 'overly_salesy',
        description: `Excessive promotional buzzwords: ${buzzwordMatches.join(', ')}`,
        severity: 'medium',
        suggestion: 'Reduce promotional language and focus on specific, factual benefits'
      });
    }
    
    return issues;
  }

  private calculateAuthenticityScore(issues: AuthenticityIssue[]): number {
    let score = 100;
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          score -= 25;
          break;
        case 'medium':
          score -= 15;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });
    
    return Math.max(0, score);
  }

  private shouldTriggerRevision(issues: AuthenticityIssue[], score: number): boolean {
    // Apply safety prioritization over persuasiveness (Requirement 10.5)
    // Be more conservative about triggering revisions to ensure safety
    
    // Trigger revision if score is too low (lowered threshold for safety)
    if (score < 75) { // Increased from 70 for more conservative approach
      return true;
    }
    
    // Trigger revision if there are any high-severity issues
    const hasHighSeverityIssues = issues.some(issue => issue.severity === 'high');
    if (hasHighSeverityIssues) {
      return true;
    }
    
    // Trigger revision if there are too many medium-severity issues (lowered threshold)
    const mediumSeverityCount = issues.filter(issue => issue.severity === 'medium').length;
    if (mediumSeverityCount > 1) { // Reduced from 2 for more conservative approach
      return true;
    }
    
    // Trigger revision if there are too many total issues (new safety check)
    if (issues.length > 3) {
      return true;
    }
    
    return false;
  }

  // Helper methods for testing and validation

  public hasTemplatePatterns(message: string): boolean {
    return this.TEMPLATE_PATTERNS.some(pattern => pattern.test(message));
  }

  public hasArtificialLanguage(message: string): boolean {
    return this.ARTIFICIAL_PATTERNS.some(pattern => pattern.test(message));
  }

  public hasSalesinessIssues(message: string, confidenceLevel: ConfidenceLevel): boolean {
    const issues = this.checkSalesinessAppropriateness(message, confidenceLevel);
    return issues.length > 0;
  }

  public getRevisionSuggestions(issues: AuthenticityIssue[]): string[] {
    return issues
      .filter(issue => issue.suggestion)
      .map(issue => issue.suggestion!)
      .filter((suggestion, index, array) => array.indexOf(suggestion) === index); // Remove duplicates
  }
}