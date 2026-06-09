declare module '#auth-utils' {
	interface User {
		id: number
		name: string
		email: string
	}

	interface UserSession {
		loggedInAt?: string
	}
}

export {}
