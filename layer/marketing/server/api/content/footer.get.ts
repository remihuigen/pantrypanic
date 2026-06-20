import { queryCollection } from '@nuxt/content/server'

export default defineEventHandler(async (event) => {
	const blogData = await queryCollection(event, 'blog').order('dateCreated', 'DESC').limit(5).all()

	const legalData = await queryCollection(event, 'legal').all()

	return {
		blog: blogData.map((item) => ({ label: item.shortTitle ?? item.title, to: item.path })),
		legal: legalData.map((item) => ({ label: item.title, to: item.path }))
	}
})
