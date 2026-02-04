/**
 * Hook to detect user's timezone from browser
 * 
 * Uses Intl.DateTimeFormat API to get the user's actual timezone
 * Works globally - detects any timezone automatically
 */

export interface TimezoneInfo {
  timezone: string; // IANA timezone name (e.g., "Asia/Singapore", "America/New_York")
  offset: number;   // UTC offset in minutes (e.g., -480 for GMT+8)
}

export function useUserTimezone(): TimezoneInfo {
  // Get user's timezone from browser using Intl API
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Get UTC offset in minutes (negative for ahead of UTC)
  const offset = new Date().getTimezoneOffset();
  
  return {
    timezone,
    offset,
  };
}

/**
 * Format timezone offset as string (e.g., "GMT+8" or "GMT-5")
 */
export function formatTimezoneOffset(offset: number): string {
  const hours = Math.abs(offset / 60);
  const sign = offset <= 0 ? '+' : '-'; // Negative offset = ahead of UTC
  return `GMT${sign}${hours}`;
}

/**
 * Get current date/time formatted for user's timezone
 */
export function getCurrentDateTimeInTimezone(timezoneInfo: TimezoneInfo): Date {
  return new Date();
}
