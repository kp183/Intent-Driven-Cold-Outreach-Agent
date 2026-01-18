/**
 * MessageGenerator - Generates human-sounding outreach messages
 * 
 * Implements message generation with:
 * - 120-word limit enforcement
 * - Hypothesis-based relevance inclusion
 * - Buzzword and cliché avoidance
 * - Call-to-action restriction for non-High confidence
 * 
 * Requirements: 6.1, 6.3, 6.4, 6.5
 */

import { IMessageGenerator } from '../interfaces';
import {
  MessageStrategy,
  IntentHypothesis,
  ProspectData,
  StrategyType,
  CallToActionLevel,
  ConfidenceLevel,
} from '../types';

export class MessageGenerator implements IMessageGenerator {
  private readonly WORD_LIMIT = 120;
  
  // Common buzzwords and clichés to avoid
  private readonly BUZZWORDS = [
    'synergy', 'leverage', 'paradigm', 'disruptive', 'innovative',
    'cutting-edge', 'revolutionary', 'game-changer', 'best-in-class',
    'world-class', 'industry-leading', 'next-generation', 'state-of-the-art',
    'turnkey', 'seamless', 'robust', 'scalable', 'enterprise-grade',
    'mission-critical', 'value-add', 'low-hanging fruit', 'circle back',
    'touch base', 'move the needle', 'boil the ocean', 'think outside the box'
  ];

  private readonly SALES_CLICHES = [
    'i hope this email finds you well',
    'i wanted to reach out',
    'i hope you don\'t mind me reaching out',
    'i came across your profile',
    'i thought you might be interested',
    'quick question for you',
    'i\'d love to pick your brain',
    'do you have 15 minutes',
    'are you the right person to speak with',
    'i don\'t want to take up too much of your time'
  ];

  generateMessage(
    strategy: MessageStrategy,
    hypothesis: IntentHypothesis,
    prospectData: ProspectData
  ): string {
    const messageComponents = this.buildMessageComponents(strategy, hypothesis, prospectData);
    let message = this.assembleMessage(messageComponents);
    
    // Ensure word limit compliance
    message = this.enforceWordLimit(message);
    
    // Validate against buzzwords and clichés
    message = this.removeBuzzwordsAndCliches(message);
    
    return message;
  }

  private buildMessageComponents(
    strategy: MessageStrategy,
    hypothesis: IntentHypothesis,
    prospectData: ProspectData
  ): MessageComponents {
    const greeting = this.generateGreeting(prospectData);
    const relevanceStatement = this.generateRelevanceStatement(hypothesis, prospectData);
    const valueProposition = this.generateValueProposition(strategy, hypothesis, prospectData);
    const callToAction = this.generateCallToAction(strategy);
    const closing = this.generateClosing();

    return {
      greeting,
      relevanceStatement,
      valueProposition,
      callToAction,
      closing,
    };
  }

  private generateGreeting(prospectData: ProspectData): string {
    const name = prospectData.contactDetails.name.split(' ')[0];
    return `Hi ${name},`;
  }

  private generateRelevanceStatement(
    hypothesis: IntentHypothesis,
    prospectData: ProspectData
  ): string {
    // Include hypothesis-based relevance (Requirement 6.3)
    const primaryReason = hypothesis.primaryReason;
    const companyName = prospectData.companyContext.name;
    
    // Create a natural connection based on the hypothesis
    if (primaryReason.toLowerCase().includes('funding') || primaryReason.toLowerCase().includes('growth')) {
      return `I noticed ${companyName}'s recent growth momentum and thought it might be relevant to your role as ${prospectData.role}.`;
    } else if (primaryReason.toLowerCase().includes('technology') || primaryReason.toLowerCase().includes('adoption')) {
      return `Given ${companyName}'s technology initiatives, I thought this might be timely for your work in ${prospectData.role}.`;
    } else if (primaryReason.toLowerCase().includes('job') || primaryReason.toLowerCase().includes('role')) {
      return `Congratulations on your role at ${companyName}. I thought this might be relevant as you settle into your position.`;
    } else {
      return `I came across ${companyName} and thought this might be relevant to your work as ${prospectData.role}.`;
    }
  }

  private generateValueProposition(
    strategy: MessageStrategy,
    hypothesis: IntentHypothesis,
    prospectData: ProspectData
  ): string {
    const companyName = prospectData.companyContext.name;
    
    // Implement grounded value proposition validation (Requirement 10.3)
    // Ensure we don't exaggerate or fabricate claims
    
    switch (strategy.type) {
      case StrategyType.DIRECT_VALUE_ALIGNMENT:
        // Avoid exaggerated claims, stay grounded in hypothesis
        return `Based on ${hypothesis.primaryReason.toLowerCase()}, there may be alignment with what we're seeing other ${prospectData.companyContext.industry} companies consider.`;
        
      case StrategyType.INSIGHT_LED_OBSERVATION:
        // Provide conservative insights without overstating capabilities
        return `I've observed similar patterns in the ${prospectData.companyContext.industry} space, and companies like ${companyName} sometimes find value in exploring this area.`;
        
      case StrategyType.SOFT_CURIOSITY:
        // Acknowledge uncertainty appropriately (Requirement 10.4)
        return `I'm curious about how ${companyName} approaches this area, as it might be relevant given your current context, though I recognize every situation is unique.`;
        
      default:
        return `This might be worth exploring given ${companyName}'s current situation, though I understand priorities can vary.`;
    }
  }

  private generateCallToAction(strategy: MessageStrategy): string {
    // Implement call-to-action restriction for non-High confidence (Requirement 6.5)
    // Apply safety prioritization over persuasiveness (Requirement 10.5)
    if (strategy.callToActionLevel === CallToActionLevel.NONE) {
      return 'Would this be worth a brief conversation, if the timing seems right?';
    } else if (strategy.callToActionLevel === CallToActionLevel.SOFT) {
      return 'If this resonates, I\'d be happy to share some insights, though no pressure if the timing isn\'t right.';
    } else if (strategy.callToActionLevel === CallToActionLevel.DIRECT) {
      return 'Would you be open to a brief call this week to discuss how this might apply to your situation?';
    }
    
    return 'Let me know if this would be worth exploring further, when the timing works for you.';
  }

  private generateClosing(): string {
    return 'Best regards';
  }

  private assembleMessage(components: MessageComponents): string {
    return [
      components.greeting,
      '',
      components.relevanceStatement,
      '',
      components.valueProposition,
      '',
      components.callToAction,
      '',
      components.closing,
    ].join('\n');
  }

  private enforceWordLimit(message: string): string {
    const words = message.split(/\s+/).filter(word => word.length > 0);
    
    if (words.length <= this.WORD_LIMIT) {
      return message;
    }

    // Trim to word limit while preserving sentence structure
    const trimmedWords = words.slice(0, this.WORD_LIMIT);
    let trimmedMessage = trimmedWords.join(' ');
    
    // Ensure we end on a complete sentence if possible
    const lastSentenceEnd = Math.max(
      trimmedMessage.lastIndexOf('.'),
      trimmedMessage.lastIndexOf('?'),
      trimmedMessage.lastIndexOf('!')
    );
    
    if (lastSentenceEnd > trimmedMessage.length * 0.8) {
      trimmedMessage = trimmedMessage.substring(0, lastSentenceEnd + 1);
    }
    
    return trimmedMessage;
  }

  private removeBuzzwordsAndCliches(message: string): string {
    let cleanMessage = message;
    
    // Remove buzzwords (case-insensitive)
    this.BUZZWORDS.forEach(buzzword => {
      const regex = new RegExp(`\\b${buzzword}\\b`, 'gi');
      cleanMessage = cleanMessage.replace(regex, this.getBuzzwordReplacement(buzzword));
    });
    
    // Remove sales clichés (case-insensitive)
    this.SALES_CLICHES.forEach(cliche => {
      const regex = new RegExp(cliche.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      cleanMessage = cleanMessage.replace(regex, this.getCliqueReplacement(cliche));
    });
    
    return cleanMessage;
  }

  private getBuzzwordReplacement(buzzword: string): string {
    const replacements: Record<string, string> = {
      'synergy': 'collaboration',
      'leverage': 'use',
      'paradigm': 'approach',
      'disruptive': 'impactful',
      'innovative': 'new',
      'cutting-edge': 'advanced',
      'revolutionary': 'significant',
      'game-changer': 'improvement',
      'best-in-class': 'high-quality',
      'world-class': 'excellent',
      'industry-leading': 'established',
      'next-generation': 'modern',
      'state-of-the-art': 'current',
      'turnkey': 'complete',
      'seamless': 'smooth',
      'robust': 'reliable',
      'scalable': 'flexible',
      'enterprise-grade': 'professional',
      'mission-critical': 'important',
      'value-add': 'benefit',
      'low-hanging fruit': 'easy wins',
      'circle back': 'follow up',
      'touch base': 'connect',
      'move the needle': 'make progress',
      'boil the ocean': 'tackle everything',
      'think outside the box': 'be creative'
    };
    
    return replacements[buzzword.toLowerCase()] || buzzword;
  }

  private getCliqueReplacement(cliche: string): string {
    // For clichés, we typically want to remove them entirely or replace with more natural language
    const replacements: Record<string, string> = {
      'i hope this email finds you well': '',
      'i wanted to reach out': '',
      'i hope you don\'t mind me reaching out': '',
      'i came across your profile': '',
      'i thought you might be interested': '',
      'quick question for you': '',
      'i\'d love to pick your brain': 'I\'d appreciate your perspective',
      'do you have 15 minutes': 'would you have time for a brief conversation',
      'are you the right person to speak with': '',
      'i don\'t want to take up too much of your time': ''
    };
    
    return replacements[cliche.toLowerCase()] || '';
  }

  // Helper method to count words in a message
  public countWords(message: string): number {
    return message.split(/\s+/).filter(word => word.length > 0).length;
  }

  // Helper method to check if message contains buzzwords
  public containsBuzzwords(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return this.BUZZWORDS.some(buzzword => 
      new RegExp(`\\b${buzzword}\\b`, 'i').test(lowerMessage)
    );
  }

  // Helper method to check if message contains clichés
  public containsCliches(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return this.SALES_CLICHES.some(cliche => 
      lowerMessage.includes(cliche)
    );
  }

  // Helper method to check if message has call-to-action for non-high confidence
  public hasInappropriateCallToAction(message: string, strategy: MessageStrategy): boolean {
    if (strategy.callToActionLevel === CallToActionLevel.NONE) {
      const strongCallToActions = [
        'let\'s schedule a call',
        'book a meeting',
        'set up a demo',
        'hop on a call',
        'jump on a call'
      ];
      
      const lowerMessage = message.toLowerCase();
      return strongCallToActions.some(cta => lowerMessage.includes(cta));
    }
    
    return false;
  }
}

interface MessageComponents {
  greeting: string;
  relevanceStatement: string;
  valueProposition: string;
  callToAction: string;
  closing: string;
}