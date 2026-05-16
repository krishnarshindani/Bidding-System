/**
 * Property-Based Tests for Currency Formatting
 * Feature: auction-completion-winner-management
 * Property 11: Currency Formatting Consistency
 * Validates: Requirements 5.1-5.7
 */

import { describe, it, expect } from 'vitest';
import { formatCR, formatCRDisplay, parseCR } from './currency';

describe('Currency Formatting - Property 11: Currency Formatting Consistency', () => {
  describe('formatCR', () => {
    it('should always append " CR" suffix to numeric amounts', () => {
      const testCases = [0, 1, 10, 100, 1000, 50.5, 99.99, 123.456];
      
      testCases.forEach(amount => {
        const result = formatCR(amount);
        expect(result).toMatch(/\s+CR$/);
        expect(result).toContain(' CR');
      });
    });

    it('should format whole numbers with 2 decimal places', () => {
      expect(formatCR(100)).toBe('100.00 CR');
      expect(formatCR(50)).toBe('50.00 CR');
      expect(formatCR(0)).toBe('0.00 CR');
    });

    it('should format decimal numbers with 2 decimal places', () => {
      expect(formatCR(100.5)).toBe('100.50 CR');
      expect(formatCR(99.99)).toBe('99.99 CR');
      expect(formatCR(123.456)).toBe('123.46 CR'); // Rounds to 2 decimals
    });

    it('should handle null and undefined gracefully', () => {
      expect(formatCR(null)).toBe('0 CR');
      expect(formatCR(undefined)).toBe('0 CR');
    });

    it('should handle NaN gracefully', () => {
      expect(formatCR(NaN)).toBe('0 CR');
      expect(formatCR(Number('invalid'))).toBe('0 CR');
    });

    it('should handle negative numbers', () => {
      expect(formatCR(-50)).toBe('-50.00 CR');
      expect(formatCR(-99.99)).toBe('-99.99 CR');
    });

    it('should handle very large numbers', () => {
      expect(formatCR(1000000)).toBe('1000000.00 CR');
      expect(formatCR(999999.99)).toBe('999999.99 CR');
    });
  });

  describe('formatCRDisplay', () => {
    it('should always append " CR" suffix to numeric amounts', () => {
      const testCases = [0, 1, 10, 100, 1000, 50.5, 99.99];
      
      testCases.forEach(amount => {
        const result = formatCRDisplay(amount);
        expect(result).toMatch(/\s+CR$/);
        expect(result).toContain(' CR');
      });
    });

    it('should format whole numbers without decimals', () => {
      expect(formatCRDisplay(100)).toBe('100 CR');
      expect(formatCRDisplay(50)).toBe('50 CR');
      expect(formatCRDisplay(0)).toBe('0 CR');
      expect(formatCRDisplay(1000)).toBe('1000 CR');
    });

    it('should format decimal numbers with 2 decimal places', () => {
      expect(formatCRDisplay(100.5)).toBe('100.50 CR');
      expect(formatCRDisplay(99.99)).toBe('99.99 CR');
      expect(formatCRDisplay(50.1)).toBe('50.10 CR');
    });

    it('should handle null and undefined gracefully', () => {
      expect(formatCRDisplay(null)).toBe('0 CR');
      expect(formatCRDisplay(undefined)).toBe('0 CR');
    });

    it('should handle NaN gracefully', () => {
      expect(formatCRDisplay(NaN)).toBe('0 CR');
    });

    it('should distinguish between whole and decimal numbers', () => {
      // Whole numbers - no decimals
      expect(formatCRDisplay(100.0)).toBe('100 CR');
      expect(formatCRDisplay(50.00)).toBe('50 CR');
      
      // Decimal numbers - show decimals
      expect(formatCRDisplay(100.01)).toBe('100.01 CR');
      expect(formatCRDisplay(50.50)).toBe('50.50 CR');
    });
  });

  describe('parseCR', () => {
    it('should parse CR strings back to numbers', () => {
      expect(parseCR('100 CR')).toBe(100);
      expect(parseCR('50.50 CR')).toBe(50.50);
      expect(parseCR('99.99 CR')).toBe(99.99);
    });

    it('should handle strings without CR suffix', () => {
      expect(parseCR('100')).toBe(100);
      expect(parseCR('50.50')).toBe(50.50);
    });

    it('should handle invalid inputs gracefully', () => {
      expect(parseCR('')).toBe(0);
      expect(parseCR('invalid')).toBe(0);
      expect(parseCR('abc CR')).toBe(0);
    });

    it('should handle null and undefined gracefully', () => {
      expect(parseCR(null as any)).toBe(0);
      expect(parseCR(undefined as any)).toBe(0);
    });

    it('should handle case-insensitive CR suffix', () => {
      expect(parseCR('100 cr')).toBe(100);
      expect(parseCR('100 CR')).toBe(100);
      expect(parseCR('100 Cr')).toBe(100);
    });
  });

  describe('Property: All currency displays must end with " CR"', () => {
    it('should never return a string without " CR" suffix for valid numbers', () => {
      const amounts = [0, 1, 10, 50, 100, 500, 1000, 50.5, 99.99, 123.45];
      
      amounts.forEach(amount => {
        const formatted = formatCR(amount);
        const displayed = formatCRDisplay(amount);
        
        expect(formatted.endsWith(' CR')).toBe(true);
        expect(displayed.endsWith(' CR')).toBe(true);
        
        // Should not contain $ or dollars
        expect(formatted).not.toContain('$');
        expect(formatted).not.toContain('dollar');
        expect(displayed).not.toContain('$');
        expect(displayed).not.toContain('dollar');
      });
    });
  });

  describe('Property: Null/undefined handling consistency', () => {
    it('should always return "0 CR" for null or undefined', () => {
      expect(formatCR(null)).toBe('0 CR');
      expect(formatCR(undefined)).toBe('0 CR');
      expect(formatCRDisplay(null)).toBe('0 CR');
      expect(formatCRDisplay(undefined)).toBe('0 CR');
    });
  });

  describe('Property: Round-trip consistency', () => {
    it('should maintain value through format and parse cycle', () => {
      const amounts = [0, 1, 10, 50, 100, 500, 1000];
      
      amounts.forEach(amount => {
        const formatted = formatCRDisplay(amount);
        const parsed = parseCR(formatted);
        expect(parsed).toBe(amount);
      });
    });

    it('should handle decimal round-trip with precision', () => {
      const formatted = formatCR(50.50);
      const parsed = parseCR(formatted);
      expect(parsed).toBe(50.50);
    });
  });
});
