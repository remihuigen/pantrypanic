export default defineNitroPlugin((nitroApp) => {
	nitroApp.hooks.hook('request', (event) => {
		event.context.$authorization = {
			resolveServerUser: async () => {
				const session = await getUserSession(event)

				return session.user ?? null
			}
		}
	})
})
