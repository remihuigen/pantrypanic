<script setup lang="ts">
import { getIcon } from '#shared/utils/icons'

const settingsStore = useSettingsStore()
const toast = useToast()
const confirm = useConfirmDialog()
const query = ref('')
const editingId = ref<string | null>(null)
const mergeTargets = ref<Record<string, string>>({})
const draft = reactive({
	name: '',
	defaultUnit: '',
	categoryId: ''
})
const initialDraft = shallowRef(normalizeDraft(draft))
const currentDraft = computed(() => normalizeDraft(draft))
const { isDirty: isDraftDirty, resetInitialValue: resetInitialDraft } = useFormState(
	initialDraft,
	currentDraft
)

watchDebounced(
	query,
	() => {
		void settingsStore.fetchItems(query.value)
	},
	{ debounce: 250 }
)

function startEdit(item: (typeof settingsStore.items)[number]) {
	editingId.value = item.id
	draft.name = item.name
	draft.defaultUnit = item.defaultUnit ?? ''
	draft.categoryId = item.categoryId ?? ''
	initialDraft.value = normalizeDraft(draft)
	resetInitialDraft(initialDraft)
}

async function saveItem(itemId: string) {
	if (!isDraftDirty.value) return

	await settingsStore.updateItem(itemId, {
		name: draft.name,
		defaultUnit: draft.defaultUnit || null,
		categoryId: draft.categoryId || null
	})
	editingId.value = null
	toast.add({ title: 'Item opgeslagen.', color: 'success', icon: getIcon('check') })
}

async function mergeItem(itemId: string) {
	const targetItemId = mergeTargets.value[itemId]
	if (!targetItemId) return

	await settingsStore.mergeItem(itemId, targetItemId)
	toast.add({ title: 'Items samengevoegd.', color: 'success', icon: getIcon('check') })
}

async function deleteItem(item: (typeof settingsStore.items)[number]) {
	if (item.activeListItemUsageCount > 0) {
		const ok = await confirm({
			title: 'Item verwijderen?',
			description:
				'Dit item wordt nog gebruikt in één van je lijstjes. Weet je zeker dat je het wilt verwijderen?',
			color: 'error'
		})

		if (!ok) return
	}

	await settingsStore.deleteItem(item.id)
	toast.add({ title: 'Item verwijderd.', color: 'success', icon: getIcon('check') })
}

function normalizeDraft(value: { name: string; defaultUnit: string; categoryId: string }) {
	return {
		name: value.name.trim(),
		defaultUnit: value.defaultUnit.trim() || null,
		categoryId: value.categoryId || null
	}
}
</script>

<template>
	<div class="space-y-4">
		<UPageCard
			:title="`Itemkluis (${settingsStore.items.length})`"
			description="Hier vind je alle items die je ooit hebt aangemaakt."
			variant="naked"
			orientation="horizontal"
		>
			<UInput
				v-model="query"
				:icon="getIcon('search')"
				placeholder="Zoeken"
				class="max-w-120"
				size="xl"
			/>
		</UPageCard>
		<UPageCard variant="subtle" :ui="{ body: 'space-y-3 grid' }">
			<UPageCard
				v-for="item in settingsStore.items"
				:key="item.id"
				class="border-default rounded-md border"
			>
				<div v-if="editingId === item.id" class="grid gap-2">
					<UInput v-model="draft.name" size="lg" />

					<UInput v-model="draft.defaultUnit" placeholder="Eenheid" size="lg" />
					<USelectMenu
						v-model="draft.categoryId"
						value-key="value"
						:items="
							settingsStore.categories.map((category) => ({
								label: category.name,
								value: category.id
							}))
						"
						placeholder="Categorie"
						clearable
						:autofocus="false"
						size="lg"
					/>
					<div class="flex gap-2">
						<UButton
							:icon="getIcon('save')"
							:disabled="!isDraftDirty"
							@click="saveItem(item.id)"
						>
							Opslaan
						</UButton>
						<UButton color="neutral" variant="ghost" @click="editingId = null"
							>Annuleren</UButton
						>
					</div>
				</div>

				<div v-else class="space-y-3">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="truncate text-sm font-medium">{{ item.name }}</p>
							<p class="text-muted text-xs">
								{{ item.usageCount }} verwijzingen
								<span v-if="item.categoryName"> - {{ item.categoryName }}</span>
							</p>
						</div>
						<div class="flex gap-1">
							<UButton
								:icon="getIcon('pencil')"
								variant="ghost"
								@click="startEdit(item)"
							/>
							<UButton
								:icon="getIcon('trash')"
								color="error"
								variant="ghost"
								@click="deleteItem(item)"
							/>
						</div>
					</div>
					<div class="flex gap-2">
						<USelectMenu
							v-model="mergeTargets[item.id]"
							value-key="value"
							:items="
								settingsStore.items
									.filter((candidate) => candidate.id !== item.id)
									.map((candidate) => ({
										label: candidate.name,
										value: candidate.id
									}))
							"
							placeholder="Samenvoegen met"
						/>
						<UButton
							:icon="getIcon('merge')"
							color="neutral"
							@click="mergeItem(item.id)"
						/>
					</div>
				</div>
			</UPageCard>

			<UEmpty
				v-if="!settingsStore.items.length"
				title="Er zijn nog geen items aangemaakt"
				variant="naked"
				:icon="getIcon('listCheck')"
			/>
		</UPageCard>
	</div>
</template>
