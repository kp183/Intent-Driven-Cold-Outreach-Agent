/**
 * Jest test setup configuration
 * Configures fast-check for property-based testing
 */

import fc from 'fast-check';

// Configure fast-check for consistent property-based testing
fc.configureGlobal({
  numRuns: 100, // Minimum 100 iterations as specified in design
  seed: 42, // Fixed seed for reproducible tests during development
  verbose: true,
});

// Global test timeout for property-based tests
jest.setTimeout(30000);

// Custom matchers for property-based testing
expect.extend({
  toSatisfyProperty(received: unknown, property: (value: unknown) => boolean) {
    const pass = property(received);
    if (pass) {
      return {
        message: (): string => `Expected ${received} not to satisfy the property`,
        pass: true,
      };
    } else {
      return {
        message: (): string => `Expected ${received} to satisfy the property`,
        pass: false,
      };
    }
  },
});

// Declare custom matcher types for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toSatisfyProperty(property: (value: unknown) => boolean): R;
    }
  }
}