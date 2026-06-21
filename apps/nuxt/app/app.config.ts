const controlPaddingBySize = [
	{ size: 'xs', class: { base: 'px-2.5 py-1.5' } },
	{ size: 'sm', class: { base: 'px-3 py-2' } },
	{ size: 'md', class: { base: 'px-3.5 py-2' } },
	{ size: 'lg', class: { base: 'px-4 py-2.5' } },
	{ size: 'xl', class: { base: 'px-4 py-3' } }
]

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
			},
			compoundVariants: controlPaddingBySize
		},
		textarea: {
			slots: {
				root: 'w-full'
			},
			compoundVariants: controlPaddingBySize
		},
		inputMenu: {
			slots: {
				root: 'w-full'
			},
			compoundVariants: controlPaddingBySize
		},
		selectMenu: {
			slots: {
				base: 'w-full',
				itemTrailingIcon: 'size-4!',
				item: 'items-center!'
			},
			compoundVariants: controlPaddingBySize
		},
		select: {
			slots: {
				base: 'w-full',
				itemTrailingIcon: 'size-4!',
				item: 'items-center!'
			},
			compoundVariants: controlPaddingBySize
		},
		inputNumber: {
			slots: {
				root: 'w-full'
			},
			compoundVariants: controlPaddingBySize
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
		},
		breadcrumb: {
			slots: {
				linkLeadingIcon: 'size-4!',
				separatorIcon: 'size-3.5'
			}
		}
	}
})
