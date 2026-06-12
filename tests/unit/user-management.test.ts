import { db } from 'hub:db'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
	createUser,
	createUserListQuerySchema,
	deleteUser,
	findUserForAuthentication,
	getUserById,
	listUsers,
	parseUserId,
	parseUserQuery,
	serializeUser,
	updateUser,
	updateUserBodySchema,
	updateUserPasswordHash
} from '../../server/utils/user-management'
import { userSchema } from '../../shared/utils/schemas/domain'
import {
	createDeleteBuilder,
	createInsertBuilder,
	createSelectBuilder,
	createUpdateBuilder
} from './test-db'

const mocks = vi.hoisted(() => ({
	hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
	seedInitialDomainData: vi.fn()
}))

vi.mock('#server/utils/domains/seed', () => ({
	seedInitialDomainData: mocks.seedInitialDomainData
}))

describe('user management utilities', () => {
	beforeEach(() => {
		vi.mocked(db.select).mockReset()
		vi.mocked(db.insert).mockReset()
		vi.mocked(db.update).mockReset()
		vi.mocked(db.delete).mockReset()
		mocks.hashPassword.mockClear()
		mocks.seedInitialDomainData.mockClear()
		vi.stubGlobal('hashPassword', mocks.hashPassword)
		vi.stubGlobal('useRuntimeConfig', () => ({
			pantry: {
				defaultUserListLimit: 50,
				maxUserListLimit: 100
			}
		}))
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('serializes user rows without passwords', () => {
		const createdAt = new Date('2026-01-01T00:00:00Z')

		expect(
			serializeUser({
				id: 1,
				name: 'Admin',
				email: 'admin@example.com',
				password: 'secret',
				createdAt
			})
		).toEqual({
			id: 1,
			name: 'Admin',
			email: 'admin@example.com',
			createdAt
		})
	})

	it('parses user ids and converts invalid ids to HTTP errors', () => {
		expect(parseUserId('12')).toBe(12)
		expectHttpError(() => parseUserId('0'), { statusCode: 400, message: 'Invalid user id' })
		expectHttpError(() => parseUserId('abc'), { statusCode: 400, message: 'Invalid user id' })
	})

	it('parses user query defaults and normalizes email', () => {
		expect(
			parseUserQuery(
				createUserListQuerySchema(),
				{ email: ['ADMIN@EXAMPLE.COM'] },
				'Invalid query'
			)
		).toEqual({
			limit: 50,
			offset: 0,
			email: 'admin@example.com'
		})
	})

	it('parses user query defaults from runtime config', () => {
		vi.stubGlobal('useRuntimeConfig', () => ({
			pantry: {
				defaultUserListLimit: 12,
				maxUserListLimit: 20
			}
		}))

		expect(parseUserQuery(createUserListQuerySchema(), {}, 'Invalid query')).toEqual({
			limit: 12,
			offset: 0
		})
	})

	it('validates create and update user bodies', () => {
		expect(
			userSchema.parse({
				name: ' Admin ',
				email: 'ADMIN@EXAMPLE.COM',
				password: 'secret'
			})
		).toEqual({
			name: 'Admin',
			email: 'admin@example.com',
			password: 'secret'
		})

		expect(updateUserBodySchema.parse({ name: 'Updated' })).toEqual({ name: 'Updated' })
		expect(() => updateUserBodySchema.parse({})).toThrow()
	})

	it('lists users with public serialization', async () => {
		const rows = [createUserRow({ id: 1 }), createUserRow({ id: 2, email: 'two@example.com' })]
		vi.mocked(db.select).mockReturnValue(createSelectBuilder(rows) as never)

		await expect(listUsers({ limit: 10, offset: 0 })).resolves.toEqual(rows.map(serializeUser))
	})

	it('gets users by id and seeds domain data for the found user', async () => {
		const user = createUserRow({ id: 7 })
		vi.mocked(db.select).mockReturnValue(createSelectBuilder([user]) as never)

		await expect(getUserById(7)).resolves.toEqual(serializeUser(user))

		expect(mocks.seedInitialDomainData).toHaveBeenCalledWith(7)
	})

	it('throws 404 when a user is missing', async () => {
		vi.mocked(db.select).mockReturnValue(createSelectBuilder([]) as never)

		await expect(getUserById(404)).rejects.toMatchObject({
			statusCode: 404,
			message: 'User not found'
		})
	})

	it('creates users with hashed passwords', async () => {
		const user = createUserRow({ id: 3, email: 'new@example.com' })
		vi.mocked(db.select).mockReturnValue(createSelectBuilder([]) as never)
		vi.mocked(db.insert).mockReturnValue(createInsertBuilder([user]) as never)

		await expect(
			createUser({ name: 'New', email: 'new@example.com', password: 'secret' })
		).resolves.toEqual(serializeUser(user))

		expect(mocks.hashPassword).toHaveBeenCalledWith('secret')
	})

	it('rejects duplicate user emails', async () => {
		vi.mocked(db.select).mockReturnValue(createSelectBuilder([{ id: 1 }]) as never)

		await expect(
			createUser({ name: 'Admin', email: 'admin@example.com', password: 'secret' })
		).rejects.toMatchObject({
			statusCode: 409,
			message: 'A user with this email already exists.'
		})
	})

	it('throws a 500 when a user write returns no row', async () => {
		vi.mocked(db.select).mockReturnValue(createSelectBuilder([]) as never)
		vi.mocked(db.insert).mockReturnValue(createInsertBuilder([]) as never)

		await expect(
			createUser({ name: 'New', email: 'new@example.com', password: 'secret' })
		).rejects.toMatchObject({
			statusCode: 500,
			message: 'User write did not return a row.'
		})
	})

	it('updates users and hashes changed passwords', async () => {
		const existing = createUserRow({ id: 1 })
		const updated = createUserRow({ id: 1, name: 'Updated', email: 'updated@example.com' })
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([existing]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
		vi.mocked(db.update).mockReturnValue(createUpdateBuilder([updated]) as never)

		await expect(
			updateUser(1, {
				name: 'Updated',
				email: 'updated@example.com',
				password: 'new-secret'
			})
		).resolves.toEqual(serializeUser(updated))

		expect(mocks.hashPassword).toHaveBeenCalledWith('new-secret')
	})

	it('rejects updates for missing users or duplicate emails', async () => {
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([]) as never)

		await expect(updateUser(1, { name: 'Nope' })).rejects.toMatchObject({ statusCode: 404 })

		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([createUserRow({ id: 1 })]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ id: 2 }]) as never)

		await expect(updateUser(1, { email: 'taken@example.com' })).rejects.toMatchObject({
			statusCode: 409
		})
	})

	it('deletes users and reports missing rows', async () => {
		vi.mocked(db.delete).mockReturnValueOnce(
			createDeleteBuilder([createUserRow({ id: 1 })]) as never
		)

		await expect(deleteUser(1)).resolves.toBeUndefined()

		vi.mocked(db.delete).mockReturnValueOnce(createDeleteBuilder([]) as never)
		await expect(deleteUser(2)).rejects.toMatchObject({
			statusCode: 404,
			message: 'User not found'
		})
	})

	it('finds users for authentication and updates password hashes', async () => {
		const user = createUserRow({ email: 'admin@example.com' })
		vi.mocked(db.select).mockReturnValue(createSelectBuilder([user]) as never)
		vi.mocked(db.update).mockReturnValue(createUpdateBuilder() as never)

		await expect(findUserForAuthentication('admin@example.com')).resolves.toBe(user)
		await expect(updateUserPasswordHash(1, 'hash')).resolves.toBeUndefined()
	})
})

function createUserRow(
	overrides: Partial<{
		id: number
		name: string
		email: string
		password: string
		createdAt: Date
	}> = {}
) {
	return {
		id: 1,
		name: 'Admin',
		email: 'admin@example.com',
		password: 'hash',
		createdAt: new Date('2026-01-01T00:00:00Z'),
		...overrides
	}
}

function expectHttpError(fn: () => unknown, expected: { statusCode: number; message?: string }) {
	try {
		fn()
		throw new Error('Expected function to throw.')
	} catch (error) {
		expect(error).toMatchObject(expected)
	}
}
