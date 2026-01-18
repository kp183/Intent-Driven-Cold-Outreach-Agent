/**
 * System constants and configuration values
 */

export const SYSTEM_CONSTANTS = {
  // Message generation limits
  MAX_MESSAGE_WORDS: 120,
  MIN_INTENT_SIGNALS: 2,
  
  // Confidence scoring thresholds
  HIGH_CONFIDENCE_THRESHOLD: 0.8,
  MEDIUM_CONFIDENCE_THRESHOLD: 0.5,
  
  // Timing constants
  SIGNAL_FRESHNESS_DAYS: 30,
  MAX_REVISION_ATTEMPTS: 3,
  
  // System metadata
  SYSTEM_VERSION: '1.0.0',
  WORKFLOW_STEPS: [
    'input_validation',
    'signal_interpretation', 
    'hypothesis_formation',
    'confidence_scoring',
    'strategy_selection',
    'message_generation',
    'authenticity_evaluation',
  ],
} as const;

export const BUZZWORDS = [
  'synergy',
  'leverage',
  'paradigm',
  'disruptive',
  'innovative',
  'cutting-edge',
  'game-changer',
  'revolutionary',
  'best-in-class',
  'world-class',
  'seamless',
  'robust',
  'scalable',
  'optimize',
  'maximize',
  'streamline',
] as const;

export const SALES_CLICHES = [
  'circle back',
  'touch base',
  'low-hanging fruit',
  'move the needle',
  'boil the ocean',
  'think outside the box',
  'hit the ground running',
  'quick win',
  'no-brainer',
  'win-win',
] as const;