/**
 * Shared Utilities for Search Module
 * 
 * Common utilities used across search modules
 */

import { Request } from "express";

// Re-export getUserId from centralized auth utilities
export { getUserId } from "../utils/auth";

/**
 * Normalize a score to be within valid range (30-100)
 */
export function normalizeScore(score: number): number {
  return Math.min(Math.max(Math.round(score), 30), 100);
}

/**
 * Calculate average of an array of numbers
 */
export function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

/**
 * Calculate improvement based on recent results
 */
export function calculateImprovement(results: any[]): number {
  if (results.length < 2) return 0;
  
  const recent = results.slice(0, Math.min(5, results.length));
  const older = results.slice(Math.min(5, results.length));
  
  if (older.length === 0) return 0;
  
  const recentAvg = calculateAverage(recent.map(r => r.overallScore || 0));
  const olderAvg = calculateAverage(older.map(r => r.overallScore || 0));
  
  return Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
}