/**
 * HypothesisFormer - Forms single primary hypothesis from weighted signals
 * 
 * Requirements addressed:
 * - 3.1: Form exactly one primary hypothesis answering "Why might this prospect care right now?"
 * - 3.2: Hypothesis grounded only in provided signals without inventing facts or motivations
 * - 3.3: Form conservative hypothesis or decline to proceed when insufficient signals exist
 * - 3.4: Hypothesis specific enough to guide message strategy selection
 */

import { IHypothesisFormer } from '../interfaces';
import { WeightedSignal, IntentHypothesis, SignalType } from '../types';

export class HypothesisFormer implements IHypothesisFormer {
  private readonly MIN_SIGNAL_WEIGHT_THRESHOLD = 0.3; // Minimum weight for a signal to be considered strong
  private readonly MIN_TOTAL_WEIGHT_THRESHOLD = 0.5; // Minimum total weight to form confident hypothesis
  private readonly MIN_SIGNALS_FOR_HYPOTHESIS = 1; // Minimum number of signals needed

  /**
   * Forms exactly one primary hypothesis from weighted signals
   * Returns conservative hypothesis if signals are insufficient
   */
  formHypothesis(weightedSignals: WeightedSignal[]): IntentHypothesis {
    // Validate input
    if (!weightedSignals || weightedSignals.length === 0) {
      return this.createConservativeHypothesis('No intent signals provided');
    }

    // Filter out signals with invalid or very low weights
    const validSignals = weightedSignals.filter(signal => 
      signal.weight && !isNaN(signal.weight) && signal.weight > 0.01
    );

    if (validSignals.length < this.MIN_SIGNALS_FOR_HYPOTHESIS) {
      return this.createConservativeHypothesis('Insufficient valid signals');
    }

    // Sort signals by weight (highest first) to prioritize strongest evidence
    const sortedSignals = validSignals.sort((a, b) => b.weight - a.weight);
    
    // Calculate total signal strength
    const totalWeight = sortedSignals.reduce((sum, signal) => sum + signal.weight, 0);
    
    // Identify strongest signals for hypothesis formation
    const strongSignals = sortedSignals.filter(signal => signal.weight >= this.MIN_SIGNAL_WEIGHT_THRESHOLD);
    
    // If total weight is below threshold or no strong signals, create conservative hypothesis
    if (totalWeight < this.MIN_TOTAL_WEIGHT_THRESHOLD || strongSignals.length === 0) {
      return this.createConservativeHypothesis('Weak signal strength', sortedSignals);
    }

    // Form hypothesis based on strongest signals
    return this.createEvidenceBasedHypothesis(strongSignals, sortedSignals);
  }

  /**
   * Creates conservative hypothesis when signals are insufficient or unclear
   */
  private createConservativeHypothesis(reason: string, signals?: WeightedSignal[]): IntentHypothesis {
    const supportingEvidence = signals ? 
      signals.slice(0, 2).map(signal => `Weak signal: ${signal.description}`) : 
      ['No supporting evidence available'];

    return {
      primaryReason: 'Timing may be appropriate for general business discussion',
      supportingEvidence,
      confidenceFactors: ['Conservative approach due to limited evidence'],
      conservativeAssumptions: [
        reason,
        'No specific intent can be confidently determined',
        'General business relevance assumed only'
      ]
    };
  }

  /**
   * Creates evidence-based hypothesis from strong signals
   * Ensures hypothesis is grounded only in provided evidence
   * Implements evidence-based intent determination (Requirement 10.2)
   */
  private createEvidenceBasedHypothesis(strongSignals: WeightedSignal[], allSignals: WeightedSignal[]): IntentHypothesis {
    // Use the strongest signal as the primary basis for hypothesis
    const primarySignal = strongSignals[0];
    
    // Ensure evidence-based intent determination (Requirement 10.2)
    if (!this.hasValidEvidence(primarySignal)) {
      return this.createConservativeHypothesis('Primary signal lacks sufficient evidence', allSignals);
    }
    
    // Form primary reason based on signal type and description - grounded in evidence only
    const primaryReason = this.formulatePrimaryReason(primarySignal);
    
    // Gather supporting evidence from all strong signals - only factual evidence
    const supportingEvidence = strongSignals
      .filter(signal => this.hasValidEvidence(signal))
      .map(signal => `${this.getSignalTypeDescription(signal.type)}: ${signal.description}`);
    
    // If no valid supporting evidence, create conservative hypothesis
    if (supportingEvidence.length === 0) {
      return this.createConservativeHypothesis('No valid supporting evidence found', allSignals);
    }
    
    // Identify confidence factors based on signal characteristics
    const confidenceFactors = this.identifyConfidenceFactors(strongSignals);
    
    // Note any conservative assumptions made
    const conservativeAssumptions = this.identifyConservativeAssumptions(strongSignals, allSignals);

    return {
      primaryReason,
      supportingEvidence,
      confidenceFactors,
      conservativeAssumptions
    };
  }

  /**
   * Validates that a signal has sufficient evidence for intent determination
   * Requirement 10.2: Never assume intent without supporting evidence
   */
  private hasValidEvidence(signal: WeightedSignal): boolean {
    // Check for minimum evidence requirements
    if (!signal.description || signal.description.trim().length < 10) {
      return false; // Description too short to be meaningful evidence
    }
    
    // Check for vague or assumptive language that indicates weak evidence
    const vagueIndicators = [
      'might', 'could', 'possibly', 'perhaps', 'maybe', 'likely',
      'seems', 'appears', 'suggests', 'indicates', 'implies',
      'assumed', 'estimated', 'projected', 'expected'
    ];
    
    const descriptionLower = signal.description.toLowerCase();
    const vagueCount = vagueIndicators.filter(indicator => 
      descriptionLower.includes(indicator)
    ).length;
    
    // If more than 2 vague indicators, consider evidence insufficient
    if (vagueCount > 2) {
      return false;
    }
    
    // Check for specific factual indicators
    const factualIndicators = [
      'announced', 'confirmed', 'reported', 'published', 'stated',
      'hired', 'appointed', 'promoted', 'launched', 'acquired',
      'raised', 'received', 'completed', 'signed', 'implemented'
    ];
    
    const hasFactualBasis = factualIndicators.some(indicator => 
      descriptionLower.includes(indicator)
    );
    
    // Require either factual basis or high relevance score for valid evidence
    return hasFactualBasis || signal.relevanceScore >= 0.7;
  }

  /**
   * Formulates primary reason based on the strongest signal
   * Stays grounded in provided evidence without inventing facts
   * Implements grounded value proposition validation (Requirement 10.3)
   */
  private formulatePrimaryReason(primarySignal: WeightedSignal): string {
    // Ensure we don't exaggerate value propositions (Requirement 10.3)
    const conservativeReasons: Record<SignalType, string> = {
      [SignalType.JOB_CHANGE]: 'Recent role change may create new priorities and decision-making authority',
      [SignalType.FUNDING_EVENT]: 'Recent funding may enable new initiatives and technology investments',
      [SignalType.TECHNOLOGY_ADOPTION]: 'Technology changes may indicate evolving business needs',
      [SignalType.COMPANY_GROWTH]: 'Company growth may create new operational challenges and opportunities',
      [SignalType.INDUSTRY_TREND]: 'Industry developments may influence strategic planning and priorities'
    };

    const baseReason = conservativeReasons[primarySignal.type] || 'Business context suggests potential relevance';
    
    // Validate that we're not fabricating data (Requirement 10.3)
    if (!this.isGroundedInEvidence(baseReason, primarySignal)) {
      return 'General business timing may be appropriate for discussion';
    }
    
    // Add timing context if signal is very fresh, but stay conservative
    if (primarySignal.freshnessScore > 0.8) {
      return `${baseReason} (recent development)`;
    }
    
    return baseReason;
  }

  /**
   * Validates that the reason is grounded in actual evidence
   * Requirement 10.3: Never exaggerate value propositions or fabricate data
   */
  private isGroundedInEvidence(reason: string, signal: WeightedSignal): boolean {
    // Check if the signal description supports the reason
    const _reasonKeywords = reason.toLowerCase().split(' ');
    const signalDescription = signal.description.toLowerCase();
    
    // For job change signals, verify description mentions role/position changes
    if (signal.type === SignalType.JOB_CHANGE) {
      const jobChangeKeywords = ['hired', 'promoted', 'appointed', 'joined', 'role', 'position'];
      return jobChangeKeywords.some(keyword => signalDescription.includes(keyword));
    }
    
    // For funding signals, verify description mentions funding/investment
    if (signal.type === SignalType.FUNDING_EVENT) {
      const fundingKeywords = ['funding', 'investment', 'raised', 'capital', 'round', 'investor'];
      return fundingKeywords.some(keyword => signalDescription.includes(keyword));
    }
    
    // For technology signals, verify description mentions technology/tech changes
    if (signal.type === SignalType.TECHNOLOGY_ADOPTION) {
      const techKeywords = ['technology', 'tech', 'system', 'platform', 'software', 'tool'];
      return techKeywords.some(keyword => signalDescription.includes(keyword));
    }
    
    // For growth signals, verify description mentions growth indicators
    if (signal.type === SignalType.COMPANY_GROWTH) {
      const growthKeywords = ['growth', 'expansion', 'scaling', 'hiring', 'revenue', 'market'];
      return growthKeywords.some(keyword => signalDescription.includes(keyword));
    }
    
    // For industry trends, verify description mentions industry/market changes
    if (signal.type === SignalType.INDUSTRY_TREND) {
      const trendKeywords = ['industry', 'market', 'trend', 'sector', 'regulation', 'compliance'];
      return trendKeywords.some(keyword => signalDescription.includes(keyword));
    }
    
    // If we can't verify the evidence, be conservative
    return false;
  }

  /**
   * Gets human-readable description for signal type
   */
  private getSignalTypeDescription(signalType: SignalType): string {
    const descriptions: Record<SignalType, string> = {
      [SignalType.JOB_CHANGE]: 'Role transition',
      [SignalType.FUNDING_EVENT]: 'Funding activity',
      [SignalType.TECHNOLOGY_ADOPTION]: 'Technology change',
      [SignalType.COMPANY_GROWTH]: 'Growth indicator',
      [SignalType.INDUSTRY_TREND]: 'Industry trend'
    };

    return descriptions[signalType] || 'Business signal';
  }

  /**
   * Identifies factors that increase confidence in the hypothesis
   */
  private identifyConfidenceFactors(strongSignals: WeightedSignal[]): string[] {
    const factors: string[] = [];
    
    // Multiple strong signals increase confidence
    if (strongSignals.length > 1) {
      factors.push(`Multiple supporting signals (${strongSignals.length})`);
    }
    
    // Recent signals increase confidence
    const recentSignals = strongSignals.filter(signal => signal.freshnessScore > 0.7);
    if (recentSignals.length > 0) {
      factors.push(`Recent developments (${recentSignals.length} signals)`);
    }
    
    // High relevance signals increase confidence
    const highRelevanceSignals = strongSignals.filter(signal => signal.relevanceScore > 0.8);
    if (highRelevanceSignals.length > 0) {
      factors.push(`High relevance indicators (${highRelevanceSignals.length} signals)`);
    }
    
    // Direct signal types increase confidence
    const directSignals = strongSignals.filter(signal => 
      signal.type === SignalType.JOB_CHANGE || signal.type === SignalType.FUNDING_EVENT
    );
    if (directSignals.length > 0) {
      factors.push(`Direct business signals (${directSignals.length})`);
    }
    
    return factors.length > 0 ? factors : ['Single supporting signal available'];
  }

  /**
   * Identifies conservative assumptions made in hypothesis formation
   */
  private identifyConservativeAssumptions(strongSignals: WeightedSignal[], allSignals: WeightedSignal[]): string[] {
    const assumptions: string[] = [];
    
    // Note if we're ignoring weak signals
    const weakSignals = allSignals.filter(signal => signal.weight < this.MIN_SIGNAL_WEIGHT_THRESHOLD);
    if (weakSignals.length > 0) {
      assumptions.push(`${weakSignals.length} weak signals not considered in primary hypothesis`);
    }
    
    // Note if signals are not very recent
    const oldSignals = strongSignals.filter(signal => signal.freshnessScore < 0.5);
    if (oldSignals.length > 0) {
      assumptions.push(`Some signals may be dated (${oldSignals.length})`);
    }
    
    // Note if we only have indirect signals
    const indirectSignals = strongSignals.filter(signal => 
      signal.type === SignalType.INDUSTRY_TREND || signal.type === SignalType.COMPANY_GROWTH
    );
    if (indirectSignals.length === strongSignals.length) {
      assumptions.push('Hypothesis based on indirect signals only');
    }
    
    // Always include general conservative note
    assumptions.push('Hypothesis assumes business relevance without guaranteeing specific interest');
    
    return assumptions;
  }
}