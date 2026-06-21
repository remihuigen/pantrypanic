<script setup lang="ts">
import { getIcon } from '#shared/utils/icons'

const settingsStore = useSettingsStore()
const toast = useToast()
const confirm = useConfirmDialog()
const query = shallowRef('')
const mergeTargets = ref<Record<string, string>>({})
const isEditModalOpen = shallowRef(false)
const selectedItemForEdit = shallowRef<{
	id: string
	name: string
	defaultUnit?: string
	categoryId?: string
} | null>(null)
const categoryOptions = computed(() =>
	settingsStore.categories.map((category) => ({
		label: category.name,
		value: category.id
	}))
)

watchDebounced(
	query,
	() => {
		void settingsStore.fetchItems(query.value)
	},
	{ debounce: 250 }
)

function startEdit(item: (typeof settingsStore.items)[number]) {
	selectedItemForEdit.value = {
		id: item.id,
		name: item.name,
		defaultUnit: item.defaultUnit,
		categoryId: item.categoryId
	}
	isEditModalOpen.value = true
}

function closeEditModal() {
	isEditModalOpen.value = false
	selectedItemForEdit.value = null
}

async function saveItem(payload: {
	itemId: string
	input: {
		name: string
		defaultUnit: string | null
		categoryId: string | null
	}
}) {
	try {
		await settingsStore.updateItem(payload.itemId, payload.input)
		closeEditModal()
		toast.add({ title: 'Item opgeslagen.', color: 'success', icon: getIcon('check') })
	} catch (error) {
		toast.add({
			title:
				error && typeof error === 'object' && 'message' in error
					? String((error as { message?: string }).message)
					: 'Item kon niet worden opgeslagen.',
			color: 'error',
			icon: getIcon('error')
		})
	}
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
				<div class="space-y-3">
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

		<SettingsItemEditModal
			v-model:open="isEditModalOpen"
			:item="selectedItemForEdit"
			:category-options="categoryOptions"
			:is-saving="settingsStore.isSaving"
			@save="saveItem"
			@update:open="
				(open) => {
					if (!open) {
						closeEditModal()
					}
				}
			"
		/>
	</div>
</template>
