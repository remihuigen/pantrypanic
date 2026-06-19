import { useConfirmDialog } from '~/composables/useConfirmDialog'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	create: vi.fn()
}))

vi.mock('~/components/overlays/Confirmation.vue', () => ({
	default: {}
}))

describe('useConfirmDialog', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
		mocks.create.mockReset()
		vi.stubGlobal('useOverlay', () => ({
			create: mocks.create
		}))
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('opens confirmation dialogs and coerces modal results to booleans', async () => {
		const open = vi.fn().mockResolvedValueOnce('confirm').mockResolvedValueOnce(undefined)
		mocks.create.mockReturnValue({ open })
		const confirm = useConfirmDialog()

		await expect(confirm({ title: 'Verwijderen?', color: 'error' })).resolves.toBe(true)
		await expect(confirm({ title: 'Annuleren?' })).resolves.toBe(false)

		expect(mocks.create).toHaveBeenNthCalledWith(
			1,
			expect.anything(),
			expect.objectContaining({
				destroyOnClose: true,
				props: { title: 'Verwijderen?', color: 'error' }
			})
		)
	})
})
