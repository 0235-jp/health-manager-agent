/**
 * Date utility functions for the frontend
 */

/**
 * Format a Date object to YYYY-MM-DD string for input[type="date"]
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get a Date object for N days ago
 */
export function getDateDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}
