import {
	DEFAULT_CATEGORY_KEY,
	moveItemToSectionTail
} from '~/utils/listItemGrid'
import { describe, expect, it } from 'vitest'

describe('listItemGrid helpers', () => {
	it('moves a dragged item to the tail of another category section', () => {
		expect(
			moveItemToSectionTail(
				[
					{
						key: 'produce',
						categoryId: 'produce',
						itemIds: ['li-1', 'li-2'],
						label: 'Groente'
					},
					{
						key: DEFAULT_CATEGORY_KEY,
						categoryId: null,
						itemIds: ['li-3'],
						label: 'Zonder categorie'
					}
				],
				'li-2',
				DEFAULT_CATEGORY_KEY
			)
		).toEqual([
			{
				key: 'produce',
				categoryId: 'produce',
				itemIds: ['li-1'],
				label: 'Groente'
			},
			{
				key: DEFAULT_CATEGORY_KEY,
				categoryId: null,
				itemIds: ['li-3', 'li-2'],
				label: 'Zonder categorie'
			}
		])
	})

	it('keeps a single copy when moving within the same category section', () => {
		expect(
			moveItemToSectionTail(
				[
					{
						key: 'produce',
						categoryId: 'produce',
						itemIds: ['li-1', 'li-2', 'li-3'],
						label: 'Groente'
					}
				],
				'li-1',
				'produce'
			)
		).toEqual([
			{
				key: 'produce',
				categoryId: 'produce',
				itemIds: ['li-2', 'li-3', 'li-1'],
				label: 'Groente'
			}
		])
	})
})
