export default defineAppConfig({
	ui: {
		colors: {
			primary: 'pomegranate',
			secondary: 'black-pearl',
			neutral: 'mist'
		},
		formField: {
			slots: {
				label: 'font-bold',
				description: 'mb-2',
				root: 'grid'
			}
		},
		input: {
			slots: {
				root: 'w-full'
			}
		},
		textarea: {
			slots: {
				root: 'w-full'
			}
		},
		inputMenu: {
			slots: {
				root: 'w-full'
			}
		},
		selectMenu: {
			slots: {
				base: 'w-full'
			}
		},
		select: {
			slots: {
				base: 'w-full'
			}
		},
		inputNumber: {
			slots: {
				root: 'w-full'
			}
		},
		alert: {
			slots: {
				title: 'font-bold'
			},
			compoundVariants: [
				{
					variant: 'subtle',
					color: 'warning',
					class: {
						title: 'text-warning-600 dark:text-warning-300',
						description: 'text-warning-600 dark:text-warning-300'
					}
				},
				{
					variant: 'subtle',
					color: 'error',
					class: {
						title: 'text-error-600 dark:text-error-400',
						description: 'text-error-600 dark:text-error-400'
					}
				}
			]
		}
	}
})
