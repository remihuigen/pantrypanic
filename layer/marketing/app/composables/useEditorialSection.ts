import { getIcon } from '#shared/utils/icons'

export type EditorialSectionKey = 'blog' | 'legal'

export type EditorialAuthor = {
	name: string
	avatar: string
	to?: string
}

export type EditorialPage = {
	path: string
	title: string
	description: string
	shortTitle?: string
	authors?: EditorialAuthor[]
	dateCreated: string | Date
	dateUpdated: string | Date
	body?: unknown
}

type EditorialSectionConfig = {
	collection: EditorialSectionKey
	pageTitle: string
	heroTitle: string
	heroDescription: string
	breadcrumbIcon: string
	displayDateField: 'dateCreated' | 'dateUpdated'
	sortField?: 'dateCreated' | 'dateUpdated'
	structuredDataType: 'blog' | 'none'
}

const SECTION_CONFIG: Record<EditorialSectionKey, EditorialSectionConfig> = {
	blog: {
		collection: 'blog',
		pageTitle: 'Blog',
		heroTitle: 'Notes from Aisle 7',
		heroDescription:
			'Dispatches on grocery chaos, overbuilt software, and the tiny domestic systems that keep a household from quietly collapsing.',
		breadcrumbIcon: getIcon('blog'),
		displayDateField: 'dateCreated',
		sortField: 'dateCreated',
		structuredDataType: 'blog'
	},
	legal: {
		collection: 'legal',
		pageTitle: 'The Fine Print',
		heroTitle: 'The Fine Print',
		heroDescription:
			'Policies, terms, and the boring-but-important details behind Pantry Panic. Plain English, minimal legal theater.',
		breadcrumbIcon: getIcon('legal'),
		displayDateField: 'dateUpdated',
		structuredDataType: 'none'
	}
}

/**
 * Returns the shared content-section configuration for blog and legal marketing routes.
 *
 * @param section - Editorial section key resolved from the current route entry.
 * @returns Shared route, content, and SEO configuration for the section.
 */
export function useEditorialSection(section: EditorialSectionKey): EditorialSectionConfig {
	return SECTION_CONFIG[section]
}

/**
 * Returns the preferred breadcrumb or surround label for an editorial page.
 *
 * @param page - Editorial page content entry.
 * @returns Short title when available, otherwise the full title.
 */
export function getEditorialLabel(page: Pick<EditorialPage, 'shortTitle' | 'title'>): string {
	return page.shortTitle || page.title
}

/**
 * Returns the section-specific date value that should be shown in the UI.
 *
 * @param page - Editorial page content entry.
 * @param section - Editorial section configuration.
 * @returns The date selected for display on cards and detail pages.
 */
export function getEditorialDisplayDate(
	page: Pick<EditorialPage, 'dateCreated' | 'dateUpdated'>,
	section: Pick<EditorialSectionConfig, 'displayDateField'>
): string | Date {
	return page[section.displayDateField]
}
