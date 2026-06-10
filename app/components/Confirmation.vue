<script lang="ts" setup>
import type { ConfirmDialogProps } from '~/composables/useConfirmDialog'

withDefaults(defineProps<ConfirmDialogProps>(), {
	actions: () => [
		{
			label: 'Sluit',
			color: 'neutral',
			variant: 'soft',
			mode: 'cancel'
		},
		{
			label: 'Bevestigen',
			color: 'primary',
			variant: 'solid',
			mode: 'confirm'
		}
	]
})

const emits = defineEmits<{
	close: [value: boolean]
}>()
</script>

<template>
	<UModal
		:title="title"
		:description="description"
		:dismissible="true"
		:ui="{ footer: 'justify-end' }"
		:close="{
			size: 'xs'
		}"
	>
		<template #footer>
			<UButton
				v-for="(action, index) in actions"
				:key="index"
				:label="action.label"
				:color="action.mode === 'confirm' ? (color ?? action.color) : action.color"
				:variant="action.variant"
				:autofocus="action.mode === 'confirm'"
				@click="
					'mode' in action ? emits('close', action.mode === 'confirm') : action.onClick
				"
			/>
		</template>
	</UModal>
</template>
