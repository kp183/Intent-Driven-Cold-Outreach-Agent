/**
 * StrategySelector - Implements message strategy selection based on confidence levels
 * 
 * This class maps confidence levels to appropriate message strategies following
 * the deterministic rules defined in the requirements:
 * - High confidence → Direct value alignment strategy
 * - Medium confidence → Insight-led observation strategy  
 * - Low confidence → Soft curiosity strategy
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { IStrategySelector } from '../interfaces';
import { ConfidenceLevel, MessageStrategy, StrategyType, CallToActionLevel } from '../types';

export class StrategySelector implements IStrategySelector {
  /**
   * Selects the appropriate message strategy based on confidence level
   * 
   * @param confidenceLevel - The confidence level (High/Medium/Low)
   * @returns MessageStrategy - The selected strategy with guidelines
   * 
   * Requirements:
   * - 5.1: High confidence → Direct value alignment strategy
   * - 5.2: Medium confidence → Insight-led observation strategy
   * - 5.3: Low confidence → Soft curiosity strategy
   * - 5.4: Exactly one strategy per request
   * - 5.5: Deterministic and consistent selection
   */
  selectStrategy(confidenceLevel: ConfidenceLevel): MessageStrategy {
    switch (confidenceLevel) {
      case ConfidenceLevel.HIGH:
        return this.createDirectValueAlignmentStrategy();
      
      case ConfidenceLevel.MEDIUM:
        return this.createInsightLedObservationStrategy();
      
      case ConfidenceLevel.LOW:
        return this.createSoftCuriosityStrategy();
      
      default:
        // This should never happen with proper typing, but provides safety
        throw new Error(`Invalid confidence level: ${confidenceLevel}`);
    }
  }

  /**
   * Creates Direct Value Alignment strategy for High confidence scenarios
   * Used when multiple strong, recent signals provide clear evidence of intent
   */
  private createDirectValueAlignmentStrategy(): MessageStrategy {
    return {
      type: StrategyType.DIRECT_VALUE_ALIGNMENT,
      toneGuidelines: [
        'Confident and direct tone',
        'Reference specific evidence clearly',
        'Connect value proposition to demonstrated needs',
        'Professional but assertive approach'
      ],
      contentFocus: 'Direct connection between prospect signals and value proposition',
      callToActionLevel: CallToActionLevel.DIRECT
    };
  }

  /**
   * Creates Insight-Led Observation strategy for Medium confidence scenarios
   * Used when mixed or indirect signals suggest potential interest
   */
  private createInsightLedObservationStrategy(): MessageStrategy {
    return {
      type: StrategyType.INSIGHT_LED_OBSERVATION,
      toneGuidelines: [
        'Thoughtful and observational tone',
        'Share relevant insights or observations',
        'Build credibility through industry knowledge',
        'Respectful and consultative approach'
      ],
      contentFocus: 'Industry insights and observations that relate to prospect context',
      callToActionLevel: CallToActionLevel.SOFT
    };
  }

  /**
   * Creates Soft Curiosity strategy for Low confidence scenarios
   * Used when signals are weak or evidence is insufficient
   */
  private createSoftCuriosityStrategy(): MessageStrategy {
    return {
      type: StrategyType.SOFT_CURIOSITY,
      toneGuidelines: [
        'Gentle and curious tone',
        'Express genuine interest in their situation',
        'Acknowledge uncertainty appropriately',
        'Non-pushy and respectful approach'
      ],
      contentFocus: 'Genuine curiosity about prospect situation and challenges',
      callToActionLevel: CallToActionLevel.NONE
    };
  }
}