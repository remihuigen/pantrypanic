declare module '@nuxt/content' {
	export function defineCollection<T>(_collection: T): T
	export function defineContentConfig<T>(_config: T): T
}
