import type { ButtonProps } from '@nuxt/ui'

import Confirmation from '~/components/Confirmation.vue'

export interface ConfirmDialogProps {
	title: string
	description?: string
	color?: ButtonProps['color']
	actions?: (ButtonProps & { mode?: 'confirm' | 'cancel' })[]
}

/**
 * Creates programmatic confirmation dialogs backed by the shared confirmation modal.
 *
 * @returns A function that opens a confirmation dialog and resolves to true when confirmed.
 */
export const useConfirmDialog = () => {
	const overlay = useOverlay()

	/**
	 * Opens a confirmation dialog with the provided copy and actions.
	 *
	 * @param options - Dialog title, description, color, and optional action buttons.
	 * @returns A promise resolving to the user's confirmation choice.
	 */
	return (options: ConfirmDialogProps): Promise<boolean> => {
		const modal = overlay.create(Confirmation, {
			destroyOnClose: true,
			props: options
		})

		return modal.open().then(Boolean)
	}
}
