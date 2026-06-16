<script lang="ts" setup>
import { useGesture } from '@vueuse/gesture'

definePageMeta({ layout: 'app' })

const route = useRoute()
const recipesStore = useRecipesStore()
const listsStore = useListsStore()
const toast = useToast()
const { incrementUsage } = useRecipeUsage()
const gestureTarget = useTemplateRef<HTMLElement>('gestureTarget')
const id = computed(() => route.params.id?.toString() ?? '')
const recipe = computed(() => (id.value ? recipesStore.recipesById[id.value] : null))
const items = computed(() => (id.value ? recipesStore.getRecipeItems(id.value) : []))
const pageTitle = computed(
	() => recipe.value?.name ?? (isLoadingRecipe.value ? 'Recept laden...' : 'Recept')
)
const recipeDescription = computed(() => recipe.value?.description)
const recipeSourceUrl = computed(() => recipe.value?.sourceUrl)
const recipeServings = computed(() => recipe.value?.servings)
const recipeLoadError = shallowRef<string | null>(null)
const isLoadingRecipe = shallowRef(false)
const showRecipeItemModal = shallowRef(false)
const showRecipeSettingsModal = shallowRef(false)
const selectedRecipeItemId = shallowRef<string | null>(null)
const isAddingToList = shallowRef(false)
let recipeLoadRequestId = 0
const selectedRecipeItem = computed(() =>
	selectedRecipeItemId.value
		? (recipesStore.recipeItemsById[selectedRecipeItemId.value] ?? null)
		: null
)

const addToListMenuItems = computed(() => [
	listsStore.activeLists.map((list) => ({
		label: list.name,
		icon: 'i-lucide-list-plus',
		onSelect: async () => await addRecipeToList(list.id)
	}))
])

async function refreshRecipe(options: { notifyOnError?: boolean } = {}) {
	const currentRecipeId = id.value

	if (!currentRecipeId) {
		return
	}

	const requestId = ++recipeLoadRequestId
	isLoadingRecipe.value = true

	try {
		await recipesStore.fetchRecipe(currentRecipeId)

		if (requestId !== recipeLoadRequestId) {
			return
		}

		recipeLoadError.value = null
	} catch (error) {
		if (requestId !== recipeLoadRequestId) {
			return
		}

		const message = getErrorMessage(error, 'Recept kon niet worden geladen.')
		recipeLoadError.value = message

		if (options.notifyOnError) {
			toast.add({
				title: message,
				color: 'error',
				duration: 8000,
				icon: 'i-lucide-circle-alert'
			})
		}
	} finally {
		if (requestId === recipeLoadRequestId) {
			isLoadingRecipe.value = false
		}
	}
}

async function refreshLists() {
	try {
		await listsStore.fetchLists('active')
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Lijsten konden niet worden geladen.'),
			color: 'error',
			duration: 8000,
			icon: 'i-lucide-circle-alert'
		})
	}
}

async function reorderRecipeItems(orderedIds: string[]) {
	const currentRecipeId = id.value

	if (!currentRecipeId) {
		return
	}

	try {
		await recipesStore.reorderRecipeItems(currentRecipeId, orderedIds)
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Volgorde kon niet worden opgeslagen.'),
			color: 'error',
			duration: 8000,
			icon: 'i-lucide-circle-alert'
		})

		await refreshRecipe()
	}
}

async function addRecipeToList(listId: string) {
	const currentRecipeId = id.value

	if (!currentRecipeId || isAddingToList.value) {
		return
	}

	isAddingToList.value = true

	try {
		await listsStore.addRecipeToList(currentRecipeId, listId)
		incrementUsage(currentRecipeId)
		toast.add({
			title: 'Recept toegevoegd aan lijst.',
			color: 'success',
			icon: 'i-lucide-check'
		})
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Recept kon niet aan de lijst worden toegevoegd.'),
			color: 'error',
			duration: 8000,
			icon: 'i-lucide-circle-alert'
		})
	} finally {
		isAddingToList.value = false
	}
}

function openCreateRecipeItemModal() {
	selectedRecipeItemId.value = null
	showRecipeItemModal.value = true
}

function openEditRecipeItemModal(recipeItemId: string) {
	selectedRecipeItemId.value = recipeItemId
	showRecipeItemModal.value = true
}

function closeRecipeItemModal() {
	showRecipeItemModal.value = false
	selectedRecipeItemId.value = null
}

function openRecipeSettingsModal() {
	showRecipeSettingsModal.value = true
}

async function handleRecipeDeleted() {
	await navigateTo('/app/recipes')
}

function getErrorMessage(error: unknown, fallback: string) {
	if (error && typeof error === 'object' && 'message' in error) {
		const message = (error as { message?: unknown }).message

		if (typeof message === 'string' && message.length > 0) {
			return message
		}
	}

	if (error instanceof Error && error.message) {
		return error.message
	}

	return fallback
}

function blurActiveElement() {
	if (!import.meta.client || !(document.activeElement instanceof HTMLElement)) {
		return
	}

	document.activeElement.blur()
}

useGesture(
	{
		onDragEnd: ({ swipe: [swipeX] }) => {
			if (swipeX > 0) {
				blurActiveElement()
				void navigateTo('/app/recipes')
			}
		}
	},
	{
		domTarget: gestureTarget,
		drag: {
			axis: 'x',
			filterTaps: true,
			swipeDistance: 60
		}
	}
)

watch(
	id,
	(recipeId) => {
		if (!recipeId || !import.meta.client) return
		recipesStore.setActiveRecipe(recipeId)
		void refreshRecipe({ notifyOnError: true })
	},
	{ immediate: true }
)

onMounted(() => {
	void refreshLists()
})

onUnmounted(() => {
	recipesStore.setActiveRecipe(null)
})
</script>

<template>
	<div ref="gestureTarget" class="grow touch-pan-y">
		<PageShell>
			<template #header>
				<PageHeader>
					<span class="break-words">{{ pageTitle }}</span>
					<template #tools>
						<UButton
							color="primary"
							variant="soft"
							icon="i-lucide-plus"
							size="md"
							square
							class="aspect-square"
							aria-label="Ingredient toevoegen"
							@click="openCreateRecipeItemModal"
						/>
						<UDropdownMenu :items="addToListMenuItems" :content="{ align: 'end' }">
							<UButton
								color="neutral"
								variant="soft"
								icon="i-lucide-list-plus"
								size="md"
								square
								class="aspect-square"
								aria-label="Recept op lijst zetten"
								:loading="isAddingToList"
								:disabled="
									listsStore.activeLists.length === 0 || items.length === 0
								"
							/>
						</UDropdownMenu>
						<RecipeActionMenu
							v-if="id"
							:recipe-id="id"
							@edit="openRecipeSettingsModal"
							@deleted="handleRecipeDeleted"
						/>
					</template>
				</PageHeader>
			</template>

			<UAlert
				v-if="recipeLoadError"
				color="error"
				variant="soft"
				icon="i-lucide-circle-alert"
				title="Recept kon niet worden geladen"
				:description="recipeLoadError"
			/>

			<div v-else-if="isLoadingRecipe && !recipe" class="grid min-h-60 place-items-center">
				<AppIcon class="w-16 animate-pulse" />
			</div>

			<UEmpty
				v-else-if="!recipe"
				icon="i-lucide-book-x"
				title="Recept niet gevonden"
				description="Dit recept bestaat niet meer of is niet beschikbaar."
				variant="subtle"
			>
				<template #actions>
					<UButton to="/app/recipes" color="primary" icon="i-lucide-arrow-left">
						Terug naar recepten
					</UButton>
				</template>
			</UEmpty>

			<div v-else class="space-y-4">
				<UPageCard variant="subtle" :ui="{ body: 'space-y-4' }">
					<p v-if="recipeDescription" class="text-muted text-sm leading-relaxed">
						{{ recipeDescription }}
					</p>

					<div class="flex flex-wrap gap-2">
						<UBadge
							v-if="recipeServings"
							color="neutral"
							variant="soft"
							icon="i-lucide-users"
						>
							{{ recipeServings }} porties
						</UBadge>
						<UBadge color="neutral" variant="soft" icon="i-lucide-list">
							{{ items.length }} ingredienten
						</UBadge>
						<UButton
							v-if="recipeSourceUrl"
							:to="recipeSourceUrl"
							target="_blank"
							rel="noopener noreferrer"
							color="primary"
							variant="solid"
							size="sm"
							icon="i-lucide-external-link"
							class="font-semibold shadow-sm"
						>
							Naar origineel recept
						</UButton>
					</div>

					<!-- <p v-if="recipeNotes" class="text-muted text-sm leading-relaxed">
						{{ recipeNotes }}
					</p> -->
				</UPageCard>

				<RecipeItemGrid
					:items="items"
					@add="openCreateRecipeItemModal"
					@edit="openEditRecipeItemModal"
					@reorder="reorderRecipeItems"
				/>

				<RecipeItemModal
					v-if="id"
					v-model:open="showRecipeItemModal"
					:recipe-id="id"
					:item="selectedRecipeItem"
					@saved="closeRecipeItemModal"
					@deleted="closeRecipeItemModal"
				/>

				<RecipeCreateModal
					v-if="id"
					v-model:open="showRecipeSettingsModal"
					:recipe-id="id"
					@updated="() => refreshRecipe()"
				/>
			</div>
		</PageShell>
	</div>
</template>
