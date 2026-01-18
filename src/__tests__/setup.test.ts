/**
 * Basic setup tests to verify project configuration
 */

import fc from 'fast-check';
import { countWords, containsBuzzwords, calculateFreshnessScore } from '../utils';
import { SignalType, ConfidenceLevel, StrategyType } from '../types';

describe('Project Setup', () => {
  test('TypeScript compilation works', () => {
    expect(true).toBe(true);
  });

  test('Jest configuration works', () => {
    expect(jest).toBeDefined();
  });

  test('fast-check property testing works', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n + 0 === n;
      })
    );
  });

  test('Types are properly exported', () => {
    expect(SignalType.JOB_CHANGE).toBe('job_change');
    expect(ConfidenceLevel.HIGH).toBe('High');
    expect(StrategyType.DIRECT_VALUE_ALIGNMENT).toBe('direct_value_alignment');
  });

  test('Utility functions work correctly', () => {
    expect(countWords('hello world')).toBe(2);
    expect(countWords('')).toBe(0);
    expect(containsBuzzwords('This is synergy')).toBe(true);
    expect(containsBuzzwords('This is normal text')).toBe(false);
    
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(calculateFreshnessScore(now)).toBeGreaterThan(calculateFreshnessScore(yesterday));
  });
});

describe('Property-Based Testing Setup', () => {
  test('Word counting property', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (words) => {
        const text = words.join(' ');
        const count = countWords(text);
        return count >= 0;
      })
    );
  });

  test('Freshness score property', () => {
    fc.assert(
      fc.property(fc.date(), (date) => {
        const score = calculateFreshnessScore(date);
        return score >= 0 && score <= 1;
      })
    );
  });
});