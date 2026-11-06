// `en-US` medium, e.g. `Jul 10, 2024`; UTC so the prerendered date matches
// the client's on hydration and doesn't depend on the build machine's timezone
const date_formatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

/**
 * Formats a date as its UTC calendar date, like `Jul 10, 2024`, independent of
 * the runtime's timezone.
 */
export const format_date = (date: string | number | Date): string =>
	date_formatter.format(typeof date === 'string' ? new Date(date) : date);
