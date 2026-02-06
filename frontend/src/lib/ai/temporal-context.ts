import type { TimezoneInfo } from '@/hooks/useUserTimezone';

/**
 * Generate current date/time context string for AI prompts
 *
 * This provides temporal awareness to Gemini API (which doesn't know current time by default)
 * Follows Claude web interface pattern of including current date at start of conversation
 *
 * Based on best practices:
 * - https://medium.com/google-cloud/importance-of-time-information-in-gemini-and-current-time-handling-cef266704039
 * - https://medium.com/@jamestang/best-practices-for-handling-dates-in-structured-output-in-llm-2efc159e1854
 */
export function getCurrentDateTimeContext(timezoneInfo?: TimezoneInfo): string {
  const now = new Date();

  // Use user's timezone if provided, otherwise UTC
  const timezone = timezoneInfo?.timezone || 'UTC';

  // Format date in user's timezone
  const dateStr = now.toLocaleDateString('en-US', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format time in user's timezone (24-hour format)
  const timeStr = now.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // Calculate UTC offset for display
  const offsetMinutes = timezoneInfo?.offset ?? 0;
  const offsetHours = Math.abs(offsetMinutes / 60);
  const offsetSign = offsetMinutes <= 0 ? '+' : '-';
  const offsetStr = `GMT${offsetSign}${offsetHours}`;

  return `Current Date & Time: ${dateStr}, ${timeStr} (${timezone}, ${offsetStr})
For date calculations, use this as "today" and "now".`;
}

/**
 * Parse a date string and convert to ISO 8601 format
 * Handles various input formats and returns standardized output
 */
export function normalizeToISODate(dateInput: string, timezoneInfo?: TimezoneInfo): string {
  const date = new Date(dateInput);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateInput}`);
  }

  return date.toISOString();
}

/**
 * Get example date conversions for prompts
 * Shows AI how to convert relative dates to specific ISO dates
 */
export function getDateConversionExamples(timezoneInfo?: TimezoneInfo): string {
  const now = new Date();
  const timezone = timezoneInfo?.timezone || 'UTC';

  // Calculate next 2nd of month
  const next2nd = new Date(now);
  next2nd.setDate(2);
  if (next2nd <= now) {
    next2nd.setMonth(next2nd.getMonth() + 1);
  }

  // Calculate next Friday
  const nextFriday = new Date(now);
  const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
  nextFriday.setDate(now.getDate() + daysUntilFriday);

  // Calculate tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return `Date Conversion Examples:
- User says "2nd of each month" → Calculate next 2nd → "${next2nd.toISOString()}"
- User says "next Friday" → Calculate specific date → "${nextFriday.toISOString()}"
- User says "March 15th" → Add year if missing → "${new Date(now.getFullYear(), 2, 15).toISOString()}"
- User says "tomorrow" → Add 1 day to current date → "${tomorrow.toISOString()}"
- User says "end of month" → Calculate last day → "${new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()}"`;
}
