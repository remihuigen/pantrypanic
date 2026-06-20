/**
 * Returns a localized date string
 * @param date - The date to localize
 * @param locale - The locale to use for formatting
 * @returns A localized date string
 */
export function formatDate(date: string | Date, locale: string = 'en-US') {
	return new Date(date).toLocaleDateString(locale, {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	})
}
