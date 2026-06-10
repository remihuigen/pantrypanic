export default defineAppConfig({
	ui: {
		colors: {
			primary: 'pomegranate',
			secondary: 'black-pearl',
			neutral: 'mist'
		},
		formField: {
			slots: {
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
		}
	}
})
