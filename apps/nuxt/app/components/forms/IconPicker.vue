<script setup lang="ts">
import { getIcon } from '#shared/utils/icons'
import type { ListIconOption } from '~/utils/listIconOptions'

import { LIST_ICON_OPTIONS } from '~/utils/listIconOptions'

const ICON_PICKER_PLACEHOLDER_ICON = getIcon('smile')
const model = defineModel<string | undefined>()

const { disabled = false } = defineProps<{
	disabled?: boolean
}>()

const selectedOption = computed(() =>
	LIST_ICON_OPTIONS.find((option) => option.value === model.value)
)
const leadingIcon = computed(() => selectedOption.value?.icon ?? ICON_PICKER_PLACEHOLDER_ICON)

const selectedValue = computed<ListIconOption['value'] | null | undefined>({
	get: () => selectedOption.value?.value,
	set: (value) => {
		model.value = value ?? undefined
	}
})
</script>

<template>
	<USelectMenu
		v-model="selectedValue"
		:items="LIST_ICON_OPTIONS"
		value-key="value"
		label-key="label"
		placeholder="Kies een icoon"
		:search-input="{ placeholder: 'Zoek een icoon...' }"
		:disabled="disabled"
		clear
	>
		<template #leading>
			<UIcon :name="leadingIcon" class="size-4" />
		</template>
	</USelectMenu>
</template>
