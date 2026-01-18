/**
 * Utility functions for the Intent-Driven Cold Outreach Agent
 */

import { BUZZWORDS, SALES_CLICHES } from '../constants';

/**
 * Counts words in a text string
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Checks if text contains buzzwords or sales clichés
 */
export function containsBuzzwords(text: string): boolean {
  const lowerText = text.toLowerCase();
  const allProblematicPhrases = [...BUZZWORDS, ...SALES_CLICHES];
  
  return allProblematicPhrases.some(phrase => 
    lowerText.includes(phrase.toLowerCase())
  );
}

/**
 * Calculates freshness score based on timestamp
 */
export function calculateFreshnessScore(timestamp: Date): number {
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24));
  
  // Future dates get score of 1, past dates decay exponentially
  if (daysDiff < 0) {
    return 1; // Future dates are considered maximally fresh
  }
  
  // Fresher signals get higher scores (exponential decay)
  return Math.max(0, Math.exp(-daysDiff / 30));
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generates a unique ID for audit logging
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Deep clones an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}