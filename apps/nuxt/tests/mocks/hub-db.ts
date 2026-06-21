import { vi } from 'vitest'

export * as schema from '../../server/db/schema'

export const db = {
	select: vi.fn(() => {
		throw new Error('Mock db.select was not configured.')
	}),
	insert: vi.fn(() => {
		throw new Error('Mock db.insert was not configured.')
	}),
	update: vi.fn(() => {
		throw new Error('Mock db.update was not configured.')
	}),
	delete: vi.fn(() => {
		throw new Error('Mock db.delete was not configured.')
	})
}
