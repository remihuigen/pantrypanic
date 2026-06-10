import { db, schema } from 'hub:db'
import { and, asc, eq, ne } from 'drizzle-orm'
import { createError } from 'h3'
import { z } from 'zod'

import { seedInitialDomainData } from '#server/utils/domain-data'
import { hashUserPassword } from './password-hashing'

const userIdSchema = z.coerce.number().int().positive()

const userEmailSchema = z.email().trim().toLowerCase()

export const userListQuerySchema = z.object({
	limit: z
		.preprocess(firstQueryValue, z.coerce.number().int().min(1).max(100).default(50)),
	offset: z
		.preprocess(firstQueryValue, z.coerce.number().int().min(0).default(0)),
	email: z.preprocess(firstQueryValue, userEmailSchema.optional())
})

export const createUserBodySchema = z.strictObject({
	name: z.string().trim().min(1).max(120),
	email: userEmailSchema,
	password: z.string().min(1).max(1024)
})

export const updateUserBodySchema = z
	.strictObject({
		name: z.string().trim().min(1).max(120).optional(),
		email: userEmailSchema.optional(),
		password: z.string().min(1).max(1024).optional()
	})
	.refine(value => value.name !== undefined || value.email !== undefined || value.password !== undefined, {
		error: 'At least one user field must be provided'
	})

type UserRow = typeof schema.users.$inferSelect

/**
 * Converts a database user row to the public API response shape.
 *
 * @param user - User row returned by Drizzle.
 * @returns User data safe to return from API routes.
 */
export function serializeUser(user: UserRow) {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		createdAt: user.createdAt
	}
}

/**
 * Parses and validates a route parameter as a positive user id.
 *
 * @param value - Raw route parameter value.
 * @returns Positive integer user id.
 */
export function parseUserId(value: unknown): number {
	const result = userIdSchema.safeParse(value)

	if (!result.success) {
		throw createValidationError('Invalid user id', result.error)
	}

	return result.data
}

/**
 * Parses user API query input and converts validation failures to HTTP errors.
 *
 * @template T - Parsed schema output type.
 * @param schema - Zod schema used to parse the query.
 * @param query - Raw query object from the request.
 * @param message - Error message used for failed validation.
 * @returns Parsed query data.
 */
export function parseUserQuery<T>(schema: z.ZodType<T>, query: unknown, message: string): T {
	const result = schema.safeParse(query)

	if (!result.success) {
		throw createValidationError(message, result.error)
	}

	return result.data
}

/**
 * Lists users in stable id order with pagination and optional email filtering.
 *
 * @param options - Pagination and filter options.
 * @returns Public user records.
 */
export async function listUsers(options: { limit: number, offset: number, email?: string }) {
	const rows = await db
		.select()
		.from(schema.users)
		.where(options.email === undefined ? undefined : eq(schema.users.email, options.email))
		.orderBy(asc(schema.users.id))
		.limit(options.limit)
		.offset(options.offset)

	return rows.map(serializeUser)
}

/**
 * Finds one user by id.
 *
 * @param userId - User id to read.
 * @returns Public user record.
 * @throws HTTP 404 when the user does not exist.
 */
export async function getUserById(userId: number) {
	const user = await findUserById(userId)

	if (!user) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Not Found',
			message: 'User not found'
		})
	}

	const createdUser = assertReturnedUser(user)

	await seedInitialDomainData(createdUser.id)

	return serializeUser(createdUser)
}

/**
 * Creates a user after checking email uniqueness.
 *
 * @param input - Validated create-user payload.
 * @returns Created public user record.
 * @throws HTTP 409 when the email is already in use.
 */
export async function createUser(input: z.infer<typeof createUserBodySchema>) {
	await assertEmailAvailable(input.email)
	const hashedPassword = await hashUserPassword(input.password)

	const [user] = await db
		.insert(schema.users)
		.values({
			name: input.name,
			email: input.email,
			password: hashedPassword,
			createdAt: new Date()
		})
		.returning()

	return serializeUser(assertReturnedUser(user))
}

/**
 * Updates one or more fields for an existing user.
 *
 * @param userId - User id to update.
 * @param input - Validated partial update payload.
 * @returns Updated public user record.
 * @throws HTTP 404 when the user does not exist.
 * @throws HTTP 409 when the requested email is already in use.
 */
export async function updateUser(userId: number, input: z.infer<typeof updateUserBodySchema>) {
	const existing = await findUserById(userId)

	if (!existing) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Not Found',
			message: 'User not found'
		})
	}

	if (input.email !== undefined) {
		await assertEmailAvailable(input.email, userId)
	}

	const [user] = await db
		.update(schema.users)
		.set({
			...(input.name !== undefined ? { name: input.name } : {}),
			...(input.email !== undefined ? { email: input.email } : {}),
			...(input.password !== undefined ? { password: await hashUserPassword(input.password) } : {})
		})
		.where(eq(schema.users.id, userId))
		.returning()

	return serializeUser(assertReturnedUser(user))
}

/**
 * Deletes an existing user by id.
 *
 * @param userId - User id to delete.
 * @throws HTTP 404 when the user does not exist.
 */
export async function deleteUser(userId: number) {
	const [user] = await db
		.delete(schema.users)
		.where(eq(schema.users.id, userId))
		.returning()

	if (!user) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Not Found',
			message: 'User not found'
		})
	}
}

/**
 * Finds one user by email including the password hash for authentication.
 *
 * @param email - Normalized email address to look up.
 * @returns User row with password data, or undefined when not found.
 */
export async function findUserForAuthentication(email: string) {
	const [user] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.email, email))
		.limit(1)

	return user
}

/**
 * Replaces a user's stored password value with a new password hash.
 *
 * @param userId - User id to update.
 * @param passwordHash - PHC-formatted scrypt password hash.
 */
export async function updateUserPasswordHash(userId: number, passwordHash: string) {
	await db
		.update(schema.users)
		.set({ password: passwordHash })
		.where(eq(schema.users.id, userId))
}

async function findUserById(userId: number) {
	const [user] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.limit(1)

	return user
}

async function assertEmailAvailable(email: string, exceptUserId?: number) {
	const [user] = await db
		.select({ id: schema.users.id })
		.from(schema.users)
		.where(
			exceptUserId === undefined
				? eq(schema.users.email, email)
				: and(eq(schema.users.email, email), ne(schema.users.id, exceptUserId))
		)
		.limit(1)

	if (user) {
		throw createError({
			statusCode: 409,
			statusMessage: 'Conflict',
			message: 'A user with this email already exists.'
		})
	}
}

function firstQueryValue(value: unknown): unknown {
	return Array.isArray(value) ? value[0] : value
}

function assertReturnedUser(user: UserRow | undefined): UserRow {
	if (!user) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Internal Server Error',
			message: 'User write did not return a row.'
		})
	}

	return user
}

function createValidationError(message: string, error: z.ZodError): never {
	throw createError({
		statusCode: 400,
		statusMessage: 'Bad Request',
		message,
		data: z.flattenError(error)
	})
}
