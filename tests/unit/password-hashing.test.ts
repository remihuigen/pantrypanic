import { describe, expect, it } from 'vitest'

import {
	hashUserPassword,
	isUserPasswordHash,
	userPasswordNeedsRehash,
	verifyUserPasswordHash
} from '../../server/utils/password-hashing'

describe('password hashing', () => {
	it('hashes and verifies user passwords', async () => {
		const hash = await hashUserPassword('correct horse battery staple')

		expect(hash).not.toBe('correct horse battery staple')
		expect(isUserPasswordHash(hash)).toBe(true)
		await expect(verifyUserPasswordHash(hash, 'correct horse battery staple')).resolves.toBe(true)
		await expect(verifyUserPasswordHash(hash, 'wrong password')).resolves.toBe(false)
	})

	it('treats legacy plain text values as needing rehash', () => {
		expect(isUserPasswordHash('plain text')).toBe(false)
		expect(userPasswordNeedsRehash('plain text')).toBe(true)
	})

	it('does not require rehash for freshly generated hashes', async () => {
		const hash = await hashUserPassword('secret')

		expect(userPasswordNeedsRehash(hash)).toBe(false)
	})
})
