declare module '@nuxt/content' {
	export function defineCollection<T>(collection: T): T
	export function defineContentConfig<T>(config: T): T
}
