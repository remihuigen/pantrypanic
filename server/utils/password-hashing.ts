import { Hash } from '@adonisjs/hash'
import { Scrypt } from '@adonisjs/hash/drivers/scrypt'

let passwordHasher: Hash | undefined

/**
 * Hashes a plain user password using the same scrypt format used by nuxt-auth-utils.
 *
 * @param password - Plain text password submitted through the user API.
 * @returns A PHC-formatted scrypt password hash.
 */
export async function hashUserPassword(password: string): Promise<string> {
	return getPasswordHasher().make(password)
}

/**
 * Verifies a plain user password against a stored scrypt hash.
 *
 * @param hashedPassword - Stored PHC-formatted scrypt password hash.
 * @param plainPassword - Plain text password submitted during login.
 * @returns Whether the plain password matches the stored hash.
 */
export async function verifyUserPasswordHash(
	hashedPassword: string,
	plainPassword: string
): Promise<boolean> {
	return getPasswordHasher().verify(hashedPassword, plainPassword)
}

/**
 * Checks whether a stored user password value is a valid scrypt hash.
 *
 * @param value - Stored password column value.
 * @returns Whether the value is a PHC-formatted scrypt hash.
 */
export function isUserPasswordHash(value: string): boolean {
	return getPasswordHasher().isValidHash(value)
}

/**
 * Checks whether an existing user password hash should be refreshed.
 *
 * @param hashedPassword - Stored PHC-formatted scrypt password hash.
 * @returns Whether the hash parameters differ from the current scrypt defaults.
 */
export function userPasswordNeedsRehash(hashedPassword: string): boolean {
	if (!isUserPasswordHash(hashedPassword)) {
		return true
	}

	return getPasswordHasher().needsReHash(hashedPassword)
}

function getPasswordHasher(): Hash {
	passwordHasher ??= new Hash(new Scrypt({}))

	return passwordHasher
}
