import { v7 as uuidv7 } from 'uuid'

/**
 * Creates a UUID v7 text id for domain tables.
 *
 * @returns A UUID v7 string.
 */
export function createDomainId(): string {
	return uuidv7()
}
