<script setup lang="ts">
const settingsStore = useSettingsStore()
const toast = useToast()
const { getIcon } = useIcon()
const confirm = useConfirmDialog()
const query = ref('')
const newCategoryName = ref('')
const editingId = ref<string | null>(null)
const mergeTargets = ref<Record<string, string>>({})
const draft = reactive({ name: '' })
const initialDraft = shallowRef(normalizeDraft(draft))
const currentDraft = computed(() => normalizeDraft(draft))
const { isDirty: isDraftDirty, resetInitialValue: resetInitialDraft } = useFormState(
	initialDraft,
	currentDraft
)

watchDebounced(
	query,
	() => {
		void settingsStore.fetchCategories(query.value)
	},
	{ debounce: 250 }
)

function startEdit(category: (typeof settingsStore.categories)[number]) {
	editingId.value = category.id
	draft.name = category.name
	initialDraft.value = normalizeDraft(draft)
	resetInitialDraft(initialDraft)
}

async function createCategory() {
	const name = newCategoryName.value.trim()

	if (!name) return

	await settingsStore.createCategory({ name })
	newCategoryName.value = ''
	toast.add({ title: 'Categorie toegevoegd.', color: 'success', icon: 'i-lucide-check' })
}

async function saveCategory(categoryId: string) {
	if (!isDraftDirty.value) return

	await settingsStore.updateCategory(categoryId, { name: draft.name })
	editingId.value = null
	toast.add({ title: 'Categorie opgeslagen.', color: 'success', icon: 'i-lucide-check' })
}

async function mergeCategory(categoryId: string) {
	const targetCategoryId = mergeTargets.value[categoryId]
	if (!targetCategoryId) return

	await settingsStore.mergeCategory(categoryId, targetCategoryId)
	toast.add({ title: 'Categorieën samengevoegd.', color: 'success', icon: 'i-lucide-check' })
}

async function deleteCategory(category: (typeof settingsStore.categories)[number]) {
	if ((category.usageCount ?? 0) > 0) {
		const ok = await confirm({
			title: 'Categorie verwijderen?',
			description: 'Items in deze categorie blijven bestaan, maar verliezen hun categorie.',
			color: 'error'
		})

		if (!ok) return
	}

	await settingsStore.deleteCategory(category.id)
	toast.add({ title: 'Categorie verwijderd.', color: 'success', icon: 'i-lucide-check' })
}

function normalizeDraft(value: { name: string }) {
	return {
		name: value.name.trim()
	}
}
</script>

<template>
	<div class="space-y-4">
		<UPageCard
			:title="`Categorieën (${settingsStore.categories.length})`"
			description="Beheer categorieën voor items en boodschappenlijsten."
			variant="naked"
			orientation="horizontal"
		>
			<UInput
				v-model="query"
				:icon="getIcon('search')"
				placeholder="Zoeken"
				class="max-w-120"
			/>
		</UPageCard>

		<UPageCard variant="subtle">
			<UForm
				class="flex flex-col items-start gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto]"
				@submit.prevent="createCategory"
			>
				<UInput v-model="newCategoryName" placeholder="Nieuwe categorie" />
				<UButton icon="i-lucide-plus" :disabled="!newCategoryName.trim()" type="submit">
					Toevoegen
				</UButton>
			</UForm>
		</UPageCard>

		<UPageCard variant="subtle" :ui="{ body: 'space-y-3 grid' }">
			<UPageCard
				v-for="category in settingsStore.categories"
				:key="category.id"
				class="border-default rounded-md border"
			>
				<div v-if="editingId === category.id" class="grid gap-2">
					<UInput v-model="draft.name" />
					<div class="flex gap-2">
						<UButton
							icon="i-lucide-save"
							:disabled="!isDraftDirty"
							@click="saveCategory(category.id)"
						>
							Opslaan
						</UButton>
						<UButton color="neutral" variant="ghost" @click="editingId = null">
							Annuleren
						</UButton>
					</div>
				</div>

				<div v-else class="space-y-3">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="truncate text-sm font-medium">{{ category.name }}</p>
							<p class="text-muted text-xs">
								{{ category.usageCount ?? 0 }} verwijzingen
							</p>
						</div>
						<div class="flex gap-1">
							<UButton
								icon="i-lucide-pencil"
								variant="ghost"
								@click="startEdit(category)"
							/>
							<UButton
								icon="i-lucide-trash-2"
								color="error"
								variant="ghost"
								@click="deleteCategory(category)"
							/>
						</div>
					</div>
					<div class="flex gap-2">
						<USelectMenu
							v-model="mergeTargets[category.id]"
							value-key="value"
							:items="
								settingsStore.categories
									.filter((candidate) => candidate.id !== category.id)
									.map((candidate) => ({
										label: candidate.name,
										value: candidate.id
									}))
							"
							placeholder="Samenvoegen met"
						/>
						<UButton
							icon="i-lucide-git-merge"
							color="neutral"
							:disabled="!mergeTargets[category.id]"
							@click="mergeCategory(category.id)"
						/>
					</div>
				</div>
			</UPageCard>

			<UEmpty
				v-if="!settingsStore.categories.length"
				title="Er zijn nog geen categorieën aangemaakt"
				variant="naked"
				icon="i-lucide-tags"
			/>
		</UPageCard>
	</div>
</template>
