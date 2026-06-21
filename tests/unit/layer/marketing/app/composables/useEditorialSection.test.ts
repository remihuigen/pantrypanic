import { getIcon } from '#shared/utils/icons'
import {
	getEditorialDisplayDate,
	getEditorialLabel,
	useEditorialSection
} from '~/../layer/marketing/app/composables/useEditorialSection'
import { describe, expect, it } from 'vitest'

describe('layer/marketing/app/composables/useEditorialSection.ts', () => {
	it('returns the expected blog section configuration', () => {
		expect(useEditorialSection('blog')).toMatchObject({
			collection: 'blog',
			pageTitle: 'Blog',
			heroTitle: 'Notes from Aisle 7',
			breadcrumbIcon: getIcon('blog'),
			displayDateField: 'dateCreated',
			sortField: 'dateCreated',
			structuredDataType: 'blog'
		})
	})

	it('returns the expected legal section configuration', () => {
		expect(useEditorialSection('legal')).toMatchObject({
			collection: 'legal',
			pageTitle: 'The Fine Print',
			heroTitle: 'The Fine Print',
			breadcrumbIcon: getIcon('legal'),
			displayDateField: 'dateUpdated',
			structuredDataType: 'none'
		})
	})

	it('prefers the short title when building editorial labels', () => {
		expect(getEditorialLabel({ title: 'Long Title', shortTitle: 'Short' })).toBe('Short')
	})

	it('falls back to the full title when no short title is present', () => {
		expect(getEditorialLabel({ title: 'Long Title' })).toBe('Long Title')
	})

	it('returns the section-specific display date', () => {
		const page = {
			dateCreated: '2026-06-18',
			dateUpdated: '2026-06-19'
		}

		expect(getEditorialDisplayDate(page, useEditorialSection('blog'))).toBe('2026-06-18')
		expect(getEditorialDisplayDate(page, useEditorialSection('legal'))).toBe('2026-06-19')
	})
})
