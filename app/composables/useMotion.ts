export const useMotion = () => {
	function enterMotion(delay: number = 0) {
		return {
			initial: { opacity: 0, y: 16 },
			animate: { opacity: 1, y: 0 },
			transition: { duration: 0.6, delay }
		}
	}

	function scrollMotion(delay: number = 0) {
		return {
			initial: { opacity: 0, y: 16 },
			whileInView: { opacity: 1, y: 0 },
			inViewOptions: { once: true, amount: 1 },
			transition: { duration: 0.6, delay }
		}
	}

	function staggerMotion(index: number = 0) {
		return {
			initial: { opacity: 0 },
			whileInView: { opacity: 1 },
			inViewOptions: { once: true, amount: 1 },
			transition: { duration: 0.6, delay: index * 0.08 }
		}
	}

	return { enterMotion, scrollMotion, staggerMotion }
}
