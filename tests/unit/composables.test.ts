import { useConfirmDialog } from '~/composables/useConfirmDialog'
import { useIcon } from '~/composables/useIcon'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	create: vi.fn()
}))

vi.mock('~/components/Confirmation.vue', () => ({
	default: {}
}))

describe('small composables', () => {
	beforeEach(() => {
		mocks.create.mockReset()
		vi.stubGlobal('useOverlay', () => ({
			create: mocks.create
		}))
	})

	it('resolves configured icon names by key', () => {
		const { getIcon } = useIcon()

		expect(getIcon('list')).toBe('lucide-list')
		expect(getIcon('settings')).toBe('lucide-settings')
		expect(getIcon('download')).toBe('lucide:download')
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
