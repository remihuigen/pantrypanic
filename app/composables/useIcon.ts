/**
 * Provides the canonical icon names used by app navigation and actions.
 *
 * @returns Icon lookup methods.
 */
export const useIcon = () => {
	const icons = {
		list: 'lucide-list',
		recipe: 'lucide-book',
		planner: 'lucide-calendar',
		settings: 'lucide-settings',
		plus: 'lucide-plus',
		archive: 'i-lucide-archive',
		check: 'i-lucide-check',
		new: 'lucide:sparkles',
		download: 'lucide:download',
		trash: 'i-lucide-trash-2',
		leave: 'i-lucide-log-out',
		copy: 'i-lucide-copy',
		search: 'i-lucide-search',
		right: 'i-lucide-chevron-right',
		cloud: 'i-lucide-cloud',
		warn: 'lucide:triangle-alert',
		error: 'lucide:circle-alert',
		blog: 'lucide:newspaper'
	} as const

	/**
	 * Resolves an icon key to its configured icon name.
	 *
	 * @param key - Icon key from the local icon map.
	 * @returns The icon name for the requested key.
	 */
	const getIcon = (key: keyof typeof icons) => icons[key]

	return {
		getIcon
	}
}
