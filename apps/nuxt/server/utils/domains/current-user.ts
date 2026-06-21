import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

import { throwNotFound } from './base'

/**
 * Returns the current authenticated user.
 *
 * @param userId - Authenticated user id.
 * @returns Public current user payload.
 */
export async function getCurrentUser(userId: number) {
	const [user] = await db
		.select({
			id: schema.users.id,
			name: schema.users.name,
			email: schema.users.email
		})
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.limit(1)

	if (!user) {
		throwNotFound()
	}

	return {
		user: {
			id: String(user.id),
			username: user.email,
			displayName: user.name
		}
	}
}
