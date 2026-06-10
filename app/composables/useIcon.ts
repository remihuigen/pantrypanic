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
		archive: 'i-lucide-archive'
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
