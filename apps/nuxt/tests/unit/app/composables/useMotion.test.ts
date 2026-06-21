import { useMotion } from '~/composables/useMotion'
import { describe, expect, it } from 'vitest'

describe('useMotion', () => {
	it('builds entry, scroll, and stagger motion presets', () => {
		const { enterMotion, scrollMotion, staggerMotion } = useMotion()

		expect(enterMotion()).toEqual({
			initial: { opacity: 0, y: 16 },
			animate: { opacity: 1, y: 0 },
			transition: { duration: 0.6, delay: 0 }
		})
		expect(scrollMotion(0.2)).toEqual({
			initial: { opacity: 0, y: 16 },
			whileInView: { opacity: 1, y: 0 },
			inViewOptions: { once: true, amount: 1 },
			transition: { duration: 0.6, delay: 0.2 }
		})
		expect(staggerMotion(3)).toEqual({
			initial: { opacity: 0 },
			whileInView: { opacity: 1 },
			inViewOptions: { once: true, amount: 1 },
			transition: { duration: 0.6, delay: 0.24 }
		})
	})
})
