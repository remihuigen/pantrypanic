const EDITORIAL_LEGACY_REDIRECTS = new Map<string, string>([
	[
		"/blog/i-don't-need-ai-in-my-grocery-list",
		'/blog/i-dont-need-ai-in-my-grocery-list'
	],
	[
		"/blog/ads.-they're-everywhere.-and-somehow-getting-worse",
		'/blog/ads-theyre-everywhere-and-somehow-getting-worse'
	]
])

/**
 * Redirects legacy editorial routes whose original slugs break Nitro prerender link crawling.
 */
export default defineEventHandler((event) => {
	const pathname = getRequestURL(event).pathname
	const redirectTarget = EDITORIAL_LEGACY_REDIRECTS.get(pathname)

	if (redirectTarget) {
		return sendRedirect(event, redirectTarget, 301)
	}
})
