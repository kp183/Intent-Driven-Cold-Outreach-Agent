/**
 * ConfidenceScorer - Assigns High/Medium/Low confidence levels based on signal strength
 * 
 * Requirements addressed:
 * - 4.1: Assign exactly one confidence level: High, Medium, or Low
 * - 4.2: Assign High confidence when multiple strong, recent signals exist
 * - 4.3: Assign Medium confidence when mixed or indirect signals exist
 * - 4.4: Assign Low confidence when weak or assumed signals exist
 * - 4.5: Confidence level directly controls message tone and approach
 * - 1.2: Automatically reduce confidence scoring for weak or insufficient signals
 */

import { IConfidenceScorer } from '../interfaces';
import { IntentHypothesis, WeightedSignal, ConfidenceLevel, SignalType } from '../types';

export class ConfidenceScorer implements IConfidenceScorer {
  // Thresholds for confidence scoring
  private readonly HIGH_CONFIDENCE_MIN_SIGNALS = 2;
  private readonly HIGH_CONFIDENCE_MIN_WEIGHT = 0.7;
  private readonly HIGH_CONFIDENCE_MIN_FRESHNESS = 0.6;
  private readonly HIGH_CONFIDENCE_MIN_RELEVANCE = 0.7;
  
  private readonly MEDIUM_CONFIDENCE_MIN_WEIGHT = 0.3; // Lowered from 0.35
  private readonly MEDIUM_CONFIDENCE_MIN_FRESHNESS = 0.15; // Lowered from 0.2
  
  private readonly WEAK_SIGNAL_THRESHOLD = 0.3;

  /**
   * Assigns exactly one confidence level based on hypothesis and supporting signals
   * Uses deterministic scoring rules based on signal strength
   * Implements uncertainty acknowledgment for low confidence (Requirement 10.4)
   */
  scoreConfidence(hypothesis: IntentHypothesis, signals: WeightedSignal[]): ConfidenceLevel {
    // Validate inputs
    if (!hypothesis || !signals || signals.length === 0) {
      return ConfidenceLevel.LOW;
    }

    // Filter out invalid signals
    const validSignals = signals.filter(signal => 
      signal.weight && !isNaN(signal.weight) && signal.weight > 0
    );

    if (validSignals.length === 0) {
      return ConfidenceLevel.LOW;
    }

    // Check for conservative assumptions that force low confidence (Requirement 10.4)
    if (this.hasConservativeIndicators(hypothesis)) {
      return ConfidenceLevel.LOW;
    }

    // Apply safety prioritization over persuasiveness (Requirement 10.5)
    const safetyAdjustedConfidence = this.applySafetyPrioritization(hypothesis, validSignals);
    if (safetyAdjustedConfidence !== null) {
      return safetyAdjustedConfidence;
    }

    // Calculate signal metrics
    const signalMetrics = this.calculateSignalMetrics(validSignals);
    
    // Apply deterministic scoring rules
    if (this.meetsHighConfidenceCriteria(signalMetrics, validSignals)) {
      return ConfidenceLevel.HIGH;
    }
    
    if (this.meetsMediumConfidenceCriteria(signalMetrics, validSignals)) {
      return ConfidenceLevel.MEDIUM;
    }
    
    return ConfidenceLevel.LOW;
  }

  /**
   * Applies safety prioritization over persuasiveness
   * Requirement 10.5: Prioritize business safety over message persuasiveness
   */
  private applySafetyPrioritization(hypothesis: IntentHypothesis, signals: WeightedSignal[]): ConfidenceLevel | null {
    // Check for risky assumptions in hypothesis
    const riskyAssumptions = [
      'urgent', 'immediate', 'critical', 'must act', 'limited time',
      'exclusive', 'special offer', 'guaranteed', 'proven results'
    ];
    
    const hypothesisText = `${hypothesis.primaryReason} ${hypothesis.supportingEvidence.join(' ')}`.toLowerCase();
    const hasRiskyLanguage = riskyAssumptions.some(assumption => 
      hypothesisText.includes(assumption)
    );
    
    if (hasRiskyLanguage) {
      return ConfidenceLevel.LOW; // Safety over persuasiveness
    }
    
    // Check for weak evidence that could lead to inappropriate outreach
    const weakEvidenceCount = signals.filter(signal => signal.weight < 0.3).length;
    const totalSignals = signals.length;
    
    // If more than 80% of signals are weak, prioritize safety (was 60%, now more lenient)
    if (weakEvidenceCount / totalSignals > 0.8) {
      return ConfidenceLevel.LOW;
    }
    
    // Check for conflicting signals that create uncertainty
    const signalTypes = new Set(signals.map(s => s.type));
    const hasConflictingTypes = signalTypes.size > 3 && signals.length > 3; // More lenient: allow up to 3 different types
    
    if (hasConflictingTypes) {
      // Multiple different signal types may indicate unclear situation
      const averageWeight = signals.reduce((sum, s) => sum + s.weight, 0) / signals.length;
      if (averageWeight < 0.5) { // More lenient: was 0.6, now 0.5
        return ConfidenceLevel.LOW; // Err on side of caution
      }
    }
    
    return null; // No safety override needed
  }

  /**
   * Checks if hypothesis contains conservative assumptions that indicate low confidence
   */
  private hasConservativeIndicators(hypothesis: IntentHypothesis): boolean {
    // Check for conservative language in primary reason
    const conservativeKeywords = [
      'may be appropriate',
      'general business discussion',
      'timing may be',
      'potential relevance',
      'assumes business relevance'
    ];
    
    const primaryReasonLower = hypothesis.primaryReason.toLowerCase();
    if (conservativeKeywords.some(keyword => primaryReasonLower.includes(keyword))) {
      return true;
    }

    // Check conservative assumptions
    if (hypothesis.conservativeAssumptions.length > 0) {
      const criticalAssumptions = [
        'no specific intent can be confidently determined',
        'insufficient valid signals',
        'weak signal strength',
        'no supporting evidence available'
      ];
      
      const assumptionsText = hypothesis.conservativeAssumptions.join(' ').toLowerCase();
      if (criticalAssumptions.some(assumption => assumptionsText.includes(assumption))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculates key metrics from signals for confidence scoring
   */
  private calculateSignalMetrics(signals: WeightedSignal[]): SignalMetrics {
    const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);
    const averageWeight = totalWeight / signals.length;
    
    const averageFreshness = signals.reduce((sum, signal) => 
      sum + (signal.freshnessScore || 0), 0) / signals.length;
    
    const averageRelevance = signals.reduce((sum, signal) => 
      sum + (signal.relevanceScore || 0), 0) / signals.length;
    
    const strongSignals = signals.filter(signal => signal.weight >= this.WEAK_SIGNAL_THRESHOLD);
    const weakSignals = signals.filter(signal => signal.weight < this.WEAK_SIGNAL_THRESHOLD);
    
    const directSignals = signals.filter(signal => 
      signal.type === SignalType.JOB_CHANGE || signal.type === SignalType.FUNDING_EVENT
    );
    
    const recentSignals = signals.filter(signal => 
      (signal.freshnessScore || 0) >= this.HIGH_CONFIDENCE_MIN_FRESHNESS
    );

    return {
      totalSignals: signals.length,
      strongSignals: strongSignals.length,
      weakSignals: weakSignals.length,
      directSignals: directSignals.length,
      recentSignals: recentSignals.length,
      totalWeight,
      averageWeight,
      averageFreshness,
      averageRelevance,
      maxWeight: Math.max(...signals.map(s => s.weight)),
      maxFreshness: Math.max(...signals.map(s => s.freshnessScore || 0)),
      maxRelevance: Math.max(...signals.map(s => s.relevanceScore || 0))
    };
  }

  /**
   * Determines if signals meet High confidence criteria
   * High confidence: Multiple strong, recent signals with high relevance
   */
  private meetsHighConfidenceCriteria(metrics: SignalMetrics, _signals: WeightedSignal[]): boolean {
    // Must have minimum number of signals
    if (metrics.totalSignals < this.HIGH_CONFIDENCE_MIN_SIGNALS) {
      return false;
    }

    // Must have strong signals (no weak signals allowed for high confidence)
    if (metrics.weakSignals > 0) {
      return false;
    }

    // Average weight must be high
    if (metrics.averageWeight < this.HIGH_CONFIDENCE_MIN_WEIGHT) {
      return false;
    }

    // Must have good freshness
    if (metrics.averageFreshness < this.HIGH_CONFIDENCE_MIN_FRESHNESS) {
      return false;
    }

    // Must have high relevance
    if (metrics.averageRelevance < this.HIGH_CONFIDENCE_MIN_RELEVANCE) {
      return false;
    }

    // Prefer direct signals for high confidence
    if (metrics.directSignals === 0 && metrics.totalSignals >= 2) {
      // If no direct signals but multiple strong indirect signals, still allow high confidence
      // but require higher thresholds
      return metrics.averageWeight >= 0.8 && metrics.averageFreshness >= 0.7;
    }

    return true;
  }

  /**
   * Determines if signals meet Medium confidence criteria
   * Medium confidence: Mixed or indirect signals with reasonable strength
   */
  private meetsMediumConfidenceCriteria(metrics: SignalMetrics, signals: WeightedSignal[]): boolean {
    // Must have at least one signal
    if (metrics.totalSignals === 0) {
      return false;
    }

    // Average weight must meet minimum threshold
    if (metrics.averageWeight < this.MEDIUM_CONFIDENCE_MIN_WEIGHT) {
      return false;
    }

    // Allow some weak signals but not all weak
    if (metrics.strongSignals === 0) {
      return false;
    }

    // For medium confidence, be extremely lenient with freshness requirements
    // The key insight: medium confidence should primarily be about signal strength, not freshness
    // Only block medium confidence if BOTH freshness AND weights are very poor
    if (metrics.averageFreshness < this.MEDIUM_CONFIDENCE_MIN_FRESHNESS) {
      // If average weight is 0.35 or higher, completely ignore freshness for medium confidence
      if (metrics.averageWeight >= 0.35) {
        return true;
      }
      
      // For weights between 0.3-0.35, be very lenient - only require minimal freshness
      if (metrics.averageWeight >= 0.3) {
        // Allow medium confidence if ANY signal has freshness >= 0.1 (very low bar)
        const hasMinimalFreshness = signals.some(s => (s.freshnessScore || 0) >= 0.1);
        if (!hasMinimalFreshness) {
          return false;
        }
      }
    }

    // For mixed signal scenarios, be very lenient
    const weakSignalRatio = metrics.weakSignals / metrics.totalSignals;
    if (weakSignalRatio > 0.7) {
      // Even with mostly weak signals, allow medium confidence if we have decent strength somewhere
      return metrics.maxWeight >= 0.3 || metrics.averageWeight >= 0.35;
    }

    return true;
  }
}

/**
 * Interface for signal metrics used in confidence scoring
 */
interface SignalMetrics {
  totalSignals: number;
  strongSignals: number;
  weakSignals: number;
  directSignals: number;
  recentSignals: number;
  totalWeight: number;
  averageWeight: number;
  averageFreshness: number;
  averageRelevance: number;
  maxWeight: number;
  maxFreshness: number;
  maxRelevance: number;
}