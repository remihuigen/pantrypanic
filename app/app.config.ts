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
			}
		}
	}
})
