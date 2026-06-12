declare module '#auth-utils' {
	interface User {
		id: number
		name: string
		email: string
		avatarPathname?: string
	}

	interface UserSession {
		loggedInAt?: string
		activeHouseholdId?: string
	}
}

export {}
