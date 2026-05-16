/**
 * Currency Formatting Utility
 * Ensures consistent display of CR (Credits) throughout the application
 */

/**
 * Format a number as CR (Credits) with 2 decimal places
 * @param amount - The numeric amount to format
 * @returns Formatted string with " CR" suffix (e.g., "100.00 CR")
 */
export function formatCR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '0 CR';
  }
  
  const numAmount = Number(amount);
  
  if (isNaN(numAmount)) {
    return '0 CR';
  }
  
  return `${numAmount.toFixed(2)} CR`;
}

/**
 * Format CR for display (no decimals if whole number)
 * @param amount - The numeric amount to format
 * @returns Formatted string with " CR" suffix (e.g., "100 CR" or "100.50 CR")
 */
export function formatCRDisplay(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '0 CR';
  }
  
  const numAmount = Number(amount);
  
  if (isNaN(numAmount)) {
    return '0 CR';
  }
  
  // Check if it's a whole number
  if (numAmount % 1 === 0) {
    return `${numAmount} CR`;
  }
  
  return `${numAmount.toFixed(2)} CR`;
}

/**
 * Parse a CR string back to a number
 * @param crString - String in format "100 CR" or "100.50 CR"
 * @returns Numeric value or 0 if invalid
 */
export function parseCR(crString: string): number {
  if (!crString || typeof crString !== 'string') {
    return 0;
  }
  
  // Remove " CR" suffix and parse
  const numStr = crString.replace(/\s*CR\s*$/i, '').trim();
  const num = parseFloat(numStr);
  
  return isNaN(num) ? 0 : num;
}
