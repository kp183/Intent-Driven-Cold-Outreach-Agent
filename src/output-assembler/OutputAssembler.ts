/**
 * OutputAssembler - Assembles structured output with all required fields
 * 
 * Implements structured output generation with:
 * - All required fields (confidence, reasoning, messages, timing, metadata)
 * - Alternative message generation (exactly 2 alternatives)
 * - Follow-up timing suggestions based on confidence
 * - Internal reasoning concealment
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import { IOutputAssembler, IMessageGenerator } from '../interfaces';
import {
  StructuredOutput,
  ConfidenceLevel,
  FollowUpTiming,
  ProcessingMetadata,
  MessageStrategy,
  IntentHypothesis,
  ProspectData,
  StrategyType,
  CallToActionLevel,
} from '../types';

export class OutputAssembler implements IOutputAssembler {
  constructor(private messageGenerator: IMessageGenerator) {}

  assembleOutput(
    message: string,
    confidence: ConfidenceLevel,
    reasoning: string,
    alternatives: [string, string],
    metadata: ProcessingMetadata
  ): StructuredOutput {
    // Ensure internal reasoning concealment (Requirement 8.6)
    const concealedReasoning = this.concealInternalReasoning(reasoning);
    
    // Generate follow-up timing based on confidence (Requirement 8.5)
    const followUpTiming = this.suggestFollowUpTiming(confidence);
    
    // Clean metadata to remove internal details (Requirement 8.6)
    const cleanedMetadata = this.cleanProcessingMetadata(metadata);

    return {
      intentConfidence: confidence, // Requirement 8.1
      reasoningSummary: concealedReasoning, // Requirement 8.2
      recommendedMessage: message, // Requirement 8.3
      alternativeMessages: alternatives, // Requirement 8.4 - exactly 2 alternatives
      suggestedFollowUpTiming: followUpTiming, // Requirement 8.5
      processingMetadata: cleanedMetadata,
    };
  }

  /**
   * Generates exactly 2 alternative messages with different approaches
   * Requirements: 8.4
   */
  generateAlternativeMessages(
    originalStrategy: MessageStrategy,
    hypothesis: IntentHypothesis,
    prospectData: ProspectData,
    confidence: ConfidenceLevel
  ): [string, string] {
    const alternativeStrategies = this.getAlternativeStrategies(originalStrategy, confidence);
    
    let alternative1 = this.messageGenerator.generateMessage(
      alternativeStrategies[0],
      hypothesis,
      prospectData
    );
    
    let alternative2 = this.messageGenerator.generateMessage(
      alternativeStrategies[1],
      hypothesis,
      prospectData
    );

    // Ensure alternatives are different by adding distinguishing elements if they're identical
    if (alternative1 === alternative2) {
      alternative1 = this.addDistinguishingElement(alternative1, 'conversational');
      alternative2 = this.addDistinguishingElement(alternative2, 'analytical');
    }

    return [alternative1, alternative2];
  }

  /**
   * Adds distinguishing elements to ensure message alternatives are different
   */
  private addDistinguishingElement(message: string, approach: 'conversational' | 'analytical'): string {
    const lines = message.split('\n');
    const greeting = lines[0] || 'Hi,';
    const body = lines.slice(1, -2).join('\n') || '';
    const closing = lines.slice(-2).join('\n') || 'Best regards';

    let distinguishingPhrase = '';
    if (approach === 'conversational') {
      distinguishingPhrase = 'I thought this might resonate with your current priorities.';
    } else {
      distinguishingPhrase = 'The timing seems particularly relevant given current market conditions.';
    }

    // Insert the distinguishing phrase before the closing
    const modifiedBody = body ? `${body}\n\n${distinguishingPhrase}` : distinguishingPhrase;
    
    return [greeting, modifiedBody, closing].filter(part => part.trim()).join('\n\n');
  }

  /**
   * Suggests follow-up timing based on confidence level
   * Requirements: 8.5
   */
  private suggestFollowUpTiming(confidence: ConfidenceLevel): FollowUpTiming {
    switch (confidence) {
      case ConfidenceLevel.HIGH:
        return FollowUpTiming.ONE_WEEK; // High confidence warrants quicker follow-up
      case ConfidenceLevel.MEDIUM:
        return FollowUpTiming.TWO_WEEKS; // Medium confidence needs more time
      case ConfidenceLevel.LOW:
        return FollowUpTiming.ONE_MONTH; // Low confidence requires patient approach
      default:
        return FollowUpTiming.TWO_WEEKS;
    }
  }

  /**
   * Conceals internal reasoning and chain-of-thought from end users
   * Requirements: 8.6
   * Implements uncertainty acknowledgment for low confidence (Requirement 10.4)
   */
  private concealInternalReasoning(reasoning: string): string {
    // Remove internal processing details and technical jargon
    let concealed = reasoning;
    
    // Remove technical workflow references
    const technicalTerms = [
      'workflow step',
      'signal interpretation',
      'hypothesis formation',
      'confidence scoring',
      'strategy selection',
      'authenticity filter',
      'processing pipeline',
      'algorithm',
      'weighted signal',
      'audit log',
      'validation result',
      'processing metadata'
    ];
    
    technicalTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      concealed = concealed.replace(regex, '');
    });
    
    // Remove internal reasoning markers
    const internalMarkers = [
      'Step 1:',
      'Step 2:',
      'Step 3:',
      'Step 4:',
      'Step 5:',
      'Step 6:',
      'Step 7:',
      'Internal note:',
      'Processing:',
      'Debug:',
      'Chain-of-thought:',
      'Reasoning chain:'
    ];
    
    internalMarkers.forEach(marker => {
      const regex = new RegExp(`${marker}.*?(?=\\n|$)`, 'gi');
      concealed = concealed.replace(regex, '');
    });
    
    // Clean up extra whitespace and ensure 1-2 sentence limit
    concealed = concealed.replace(/\s+/g, ' ').trim();
    
    // Implement uncertainty acknowledgment for low confidence (Requirement 10.4)
    if (concealed.toLowerCase().includes('low confidence')) {
      concealed = this.addUncertaintyAcknowledgment(concealed);
    }
    
    // If reasoning is too technical, empty, or very short, provide a contextual summary
    if (concealed.length < 10 || this.containsTechnicalJargon(concealed)) {
      // Generate varied generic summaries based on input characteristics
      const hash = this.simpleHash(reasoning);
      const summaries = [
        'Based on available signals, this approach was selected as most appropriate, though certainty levels may vary.',
        'The timing and relevance factors suggest this messaging strategy, while acknowledging potential uncertainties.',
        'Analysis indicates this approach offers engagement potential, though outcomes cannot be guaranteed.',
        'Current signals support this outreach methodology, while recognizing limitations in available information.',
        'Available information points to this communication approach, though complete certainty is not possible.'
      ];
      concealed = summaries[hash % summaries.length];
    } else {
      // Ensure it's 1-2 sentences maximum (Requirement 8.2)
      const sentences = concealed.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length > 2) {
        concealed = sentences.slice(0, 2).join('. ') + '.';
      } else if (sentences.length > 0) {
        // Ensure proper sentence ending
        concealed = sentences.join('. ').trim();
        if (!concealed.match(/[.!?]$/)) {
          concealed += '.';
        }
      } else {
        // No valid sentences found, use fallback with uncertainty acknowledgment
        const hash = this.simpleHash(reasoning);
        const summaries = [
          'Based on available signals, this approach was selected as most appropriate, though certainty levels may vary.',
          'The timing and relevance factors suggest this messaging strategy, while acknowledging potential uncertainties.',
          'Analysis indicates this approach offers engagement potential, though outcomes cannot be guaranteed.',
          'Current signals support this outreach methodology, while recognizing limitations in available information.',
          'Available information points to this communication approach, though complete certainty is not possible.'
        ];
        concealed = summaries[hash % summaries.length];
      }
    }
    
    return concealed;
  }

  /**
   * Adds uncertainty acknowledgment for low confidence scenarios
   * Requirement 10.4: Acknowledge uncertainty when confidence is low
   */
  private addUncertaintyAcknowledgment(reasoning: string): string {
    const uncertaintyPhrases = [
      ', though certainty levels may vary',
      ', while acknowledging potential uncertainties',
      ', though outcomes cannot be guaranteed',
      ', while recognizing limitations in available information',
      ', though complete certainty is not possible'
    ];
    
    // Select uncertainty phrase based on reasoning content
    const hash = this.simpleHash(reasoning);
    const selectedPhrase = uncertaintyPhrases[hash % uncertaintyPhrases.length];
    
    // Add uncertainty acknowledgment before the final period
    if (reasoning.endsWith('.')) {
      return reasoning.slice(0, -1) + selectedPhrase + '.';
    } else {
      return reasoning + selectedPhrase + '.';
    }
  }

  /**
   * Simple hash function to generate consistent but varied outputs
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Cleans processing metadata to remove internal implementation details
   * Requirements: 8.6
   */
  private cleanProcessingMetadata(metadata: ProcessingMetadata): ProcessingMetadata {
    return {
      workflowSteps: metadata.workflowSteps.map(step => 
        this.sanitizeWorkflowStep(step)
      ),
      executionTime: metadata.executionTime,
      auditLog: metadata.auditLog.map(entry => ({
        ...entry,
        details: undefined, // Remove internal details
      })),
      version: metadata.version,
    };
  }

  /**
   * Sanitizes workflow step names to remove internal implementation details
   */
  private sanitizeWorkflowStep(step: string): string {
    const stepMappings: Record<string, string> = {
      'input_validation': 'Input Processing',
      'signal_interpretation': 'Signal Analysis',
      'hypothesis_formation': 'Intent Analysis',
      'confidence_scoring': 'Confidence Assessment',
      'strategy_selection': 'Approach Selection',
      'message_generation': 'Message Creation',
      'authenticity_filtering': 'Quality Review',
      'output_assembly': 'Output Preparation'
    };
    
    return stepMappings[step] || step;
  }

  /**
   * Gets alternative message strategies for generating different approaches
   */
  private getAlternativeStrategies(
    originalStrategy: MessageStrategy,
    _confidence: ConfidenceLevel
  ): [MessageStrategy, MessageStrategy] {
    const baseStrategy = originalStrategy.type;
    
    // Create variations of the original strategy with different tones/approaches
    const alternative1: MessageStrategy = {
      type: baseStrategy,
      toneGuidelines: this.getAlternativeToneGuidelines(originalStrategy, 'variant1'),
      contentFocus: this.getAlternativeContentFocus(originalStrategy, 'variant1'),
      callToActionLevel: originalStrategy.callToActionLevel,
    };
    
    const alternative2: MessageStrategy = {
      type: baseStrategy,
      toneGuidelines: this.getAlternativeToneGuidelines(originalStrategy, 'variant2'),
      contentFocus: this.getAlternativeContentFocus(originalStrategy, 'variant2'),
      callToActionLevel: originalStrategy.callToActionLevel,
    };
    
    return [alternative1, alternative2];
  }

  /**
   * Generates alternative tone guidelines for message variations
   */
  private getAlternativeToneGuidelines(
    originalStrategy: MessageStrategy,
    variant: 'variant1' | 'variant2'
  ): string[] {
    const baseGuidelines = originalStrategy.toneGuidelines;
    
    if (variant === 'variant1') {
      return [
        ...baseGuidelines,
        'more conversational and personal',
        'focus on shared industry challenges',
        'use specific examples and case studies'
      ];
    } else {
      return [
        ...baseGuidelines,
        'more data-driven and analytical',
        'emphasize specific business outcomes',
        'include market trends and insights'
      ];
    }
  }

  /**
   * Generates alternative content focus for message variations
   */
  private getAlternativeContentFocus(
    originalStrategy: MessageStrategy,
    variant: 'variant1' | 'variant2'
  ): string {
    const baseFocus = originalStrategy.contentFocus;
    
    if (variant === 'variant1') {
      return `${baseFocus} with emphasis on industry trends and peer insights - conversational approach`;
    } else {
      return `${baseFocus} with focus on specific business metrics and outcomes - analytical approach`;
    }
  }

  /**
   * Checks if text contains technical jargon that should be concealed
   */
  private containsTechnicalJargon(text: string): boolean {
    const jargonTerms = [
      'algorithm', 'pipeline', 'workflow', 'metadata', 'validation',
      'processing', 'scoring', 'weighting', 'interpretation', 'formation'
    ];
    
    const lowerText = text.toLowerCase();
    return jargonTerms.some(term => lowerText.includes(term));
  }
}