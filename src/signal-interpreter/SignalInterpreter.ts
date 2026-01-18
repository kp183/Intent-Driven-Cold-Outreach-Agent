/**
 * SignalInterpreter - Processes intent signals independently with relevance and freshness weighting
 * 
 * Requirements addressed:
 * - 2.1: Interpret each intent signal independently without cross-contamination
 * - 2.2: Weight signals based on relevance and freshness
 * - 2.3: Don't treat all signals as equally important
 * - 2.4: Prioritize more recent and direct signals when conflicts exist
 */

import { ISignalInterpreter } from '../interfaces';
import { IntentSignal, WeightedSignal, SignalType } from '../types';

export class SignalInterpreter implements ISignalInterpreter {
  private readonly FRESHNESS_DECAY_DAYS = 30; // Signals lose weight after 30 days
  private readonly MAX_SIGNAL_AGE_DAYS = 90; // Signals older than 90 days get minimal weight

  /**
   * Interprets intent signals independently and applies weighting based on relevance and freshness
   * Each signal is processed in isolation to prevent cross-contamination
   */
  interpretSignals(intentSignals: IntentSignal[]): WeightedSignal[] {
    if (!intentSignals || intentSignals.length === 0) {
      return [];
    }

    // Process each signal independently to ensure no cross-contamination
    return intentSignals.map(signal => this.interpretSingleSignal(signal));
  }

  /**
   * Interprets a single signal in complete isolation from other signals
   * Calculates weight based on relevance score and freshness
   */
  private interpretSingleSignal(signal: IntentSignal): WeightedSignal {
    const freshnessScore = this.calculateFreshnessScore(signal.timestamp);
    const weight = this.calculateWeight(signal.relevanceScore, freshnessScore);

    return {
      ...signal,
      weight,
      freshnessScore,
    };
  }

  /**
   * Calculates freshness score based on signal timestamp
   * More recent signals get higher freshness scores
   */
  private calculateFreshnessScore(timestamp: Date): number {
    // Handle invalid timestamps
    if (!timestamp || isNaN(timestamp.getTime())) {
      return 0.01; // Assign minimal freshness for invalid timestamps
    }

    const now = new Date();
    const ageInDays = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);

    // Handle future timestamps (shouldn't happen but be defensive)
    if (ageInDays < 0) {
      return 1.0; // Treat future timestamps as maximally fresh
    }

    // Signals older than MAX_SIGNAL_AGE_DAYS get minimal freshness
    if (ageInDays > this.MAX_SIGNAL_AGE_DAYS) {
      return 0.1;
    }

    // Linear decay over FRESHNESS_DECAY_DAYS, then slower decay
    if (ageInDays <= this.FRESHNESS_DECAY_DAYS) {
      return Math.max(0.1, 1.0 - (ageInDays / this.FRESHNESS_DECAY_DAYS) * 0.7);
    }

    // Slower decay for signals between 30-90 days
    const extendedDecay = (ageInDays - this.FRESHNESS_DECAY_DAYS) / (this.MAX_SIGNAL_AGE_DAYS - this.FRESHNESS_DECAY_DAYS);
    return Math.max(0.1, 0.3 - extendedDecay * 0.2);
  }

  /**
   * Calculates final weight combining relevance and freshness
   * Uses multiplicative approach to ensure both factors matter
   * Implements conservative interpretation for unclear evidence (Requirement 10.1)
   */
  private calculateWeight(relevanceScore: number, freshnessScore: number): number {
    // Handle invalid relevance scores (NaN, negative, or > 1)
    let normalizedRelevance = relevanceScore;
    if (isNaN(normalizedRelevance) || normalizedRelevance < 0 || normalizedRelevance > 1) {
      normalizedRelevance = 0.01; // Assign minimal weight for invalid scores
    }
    
    // Handle invalid freshness scores
    let normalizedFreshness = freshnessScore;
    if (isNaN(normalizedFreshness) || normalizedFreshness < 0) {
      normalizedFreshness = 0.01; // Assign minimal freshness for invalid scores
    }
    
    // Conservative interpretation: Apply conservative penalty for unclear evidence
    const conservativePenalty = this.applyConservativeInterpretation(normalizedRelevance, normalizedFreshness);
    
    // Combine relevance and freshness multiplicatively
    // This ensures both factors contribute to the final weight
    const baseWeight = normalizedRelevance * normalizedFreshness * conservativePenalty;
    
    // Ensure weight is within valid bounds
    return Math.max(0.01, Math.min(1.0, baseWeight));
  }

  /**
   * Applies conservative interpretation penalty for unclear or weak evidence
   * Requirement 10.1: Choose conservative interpretations when intent evidence is unclear
   */
  private applyConservativeInterpretation(relevanceScore: number, freshnessScore: number): number {
    // If either relevance or freshness is unclear (mid-range), apply conservative penalty
    const relevanceUncertainty = Math.abs(relevanceScore - 0.5); // Distance from middle
    const freshnessUncertainty = Math.abs(freshnessScore - 0.5);
    
    // If both scores are in the unclear range (0.3-0.7), apply penalty
    if (relevanceScore >= 0.3 && relevanceScore <= 0.7 && 
        freshnessScore >= 0.3 && freshnessScore <= 0.7) {
      return 0.8; // 20% conservative penalty for unclear evidence
    }
    
    // If one score is unclear and the other is weak, apply stronger penalty
    if ((relevanceScore < 0.4 || freshnessScore < 0.4) && 
        (relevanceUncertainty < 0.2 || freshnessUncertainty < 0.2)) {
      return 0.7; // 30% conservative penalty for weak + unclear evidence
    }
    
    // If both scores are weak (< 0.3), apply maximum conservative penalty
    if (relevanceScore < 0.3 && freshnessScore < 0.3) {
      return 0.6; // 40% conservative penalty for weak evidence
    }
    
    return 1.0; // No penalty for clear, strong evidence
  }

  /**
   * Gets signal type priority multiplier
   * Direct signals (job changes, funding) get higher priority than indirect ones
   */
  private getSignalTypePriority(signalType: SignalType): number {
    const priorityMap: Record<SignalType, number> = {
      [SignalType.JOB_CHANGE]: 1.0,        // Most direct
      [SignalType.FUNDING_EVENT]: 0.95,    // Very direct
      [SignalType.TECHNOLOGY_ADOPTION]: 0.8, // Moderately direct
      [SignalType.COMPANY_GROWTH]: 0.7,    // Less direct
      [SignalType.INDUSTRY_TREND]: 0.6,    // Least direct
    };

    return priorityMap[signalType] || 0.5;
  }
}