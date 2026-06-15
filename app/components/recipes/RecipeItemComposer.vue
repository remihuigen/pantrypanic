<script setup lang="ts">
type RecipeItemDraft = {
	name: string
	amount?: number
	unit?: string
	note?: string
}

const props = defineProps<{
	isSaving?: boolean
}>()

const emit = defineEmits<{
	cancel: []
	submit: [draft: RecipeItemDraft]
}>()

const draft = reactive<RecipeItemDraft>({
	name: '',
	amount: undefined,
	unit: undefined,
	note: undefined
})

const canSubmit = computed(() => draft.name.trim().length > 0 && !props.isSaving)

function submitDraft() {
	if (!canSubmit.value) {
		return
	}

	emit('submit', {
		name: draft.name.trim(),
		amount: draft.amount,
		unit: normalizeOptionalText(draft.unit),
		note: normalizeOptionalText(draft.note)
	})
	resetDraft()
}

function resetDraft() {
	Object.assign(draft, {
		name: '',
		amount: undefined,
		unit: undefined,
		note: undefined
	})
}

function normalizeOptionalText(value: string | undefined) {
	const normalized = value?.trim()

	return normalized ? normalized : undefined
}
</script>

<template>
	<UCard variant="subtle" :ui="{ body: 'space-y-3' }">
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px_120px]">
			<UInput v-model="draft.name" placeholder="Ingredient" autofocus />
			<UInputNumber v-model="draft.amount" :min="0.5" :step="0.5" placeholder="Aantal" />
			<UInput v-model="draft.unit" placeholder="Eenheid" />
		</div>
		<UTextarea v-model="draft.note" placeholder="Notitie" :rows="2" />
		<div class="flex justify-end gap-2">
			<UButton color="neutral" variant="soft" @click="emit('cancel')">Annuleren</UButton>
			<UButton
				color="primary"
				icon="i-lucide-plus"
				:loading="props.isSaving"
				:disabled="!canSubmit"
				@click="submitDraft"
			>
				Toevoegen
			</UButton>
		</div>
	</UCard>
</template>
