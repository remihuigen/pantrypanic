export const DEFAULT_CATEGORY_KEY = 'default'
export const DEFAULT_CATEGORY_LABEL = 'Zonder categorie'

export type CategorySection = {
	key: string
	categoryId: string | null
	itemIds: string[]
	label: string
}

/**
 * Moves one rendered list item to the end of a target category section without duplicating it.
 *
 * @param sections - Current rendered category sections.
 * @param itemId - Dragged list item id.
 * @param targetSectionKey - Category section key that should receive the item.
 * @returns Cloned sections with the item appended to the target tail.
 */
export function moveItemToSectionTail(
	sections: CategorySection[],
	itemId: string,
	targetSectionKey: string
) {
	const targetSectionExists = sections.some((section) => section.key === targetSectionKey)

	if (!targetSectionExists) {
		return sections.map((section) => ({ ...section, itemIds: [...section.itemIds] }))
	}

	return sections.map((section) => {
		const filteredItemIds = section.itemIds.filter((existingItemId) => existingItemId !== itemId)

		if (section.key !== targetSectionKey) {
			return {
				...section,
				itemIds: filteredItemIds
			}
		}

		return {
			...section,
			itemIds: [...filteredItemIds, itemId]
		}
	})
}
