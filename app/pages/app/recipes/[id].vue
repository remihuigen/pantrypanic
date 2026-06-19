<script lang="ts" setup>
import { useGesture } from '@vueuse/gesture'
import { getIcon } from '#shared/utils/icons'

definePageMeta({ layout: 'app' })

const route = useRoute()
const recipesStore = useRecipesStore()
const listsStore = useListsStore()
const toast = useToast()
const gestureTarget = useTemplateRef<HTMLElement>('gestureTarget')
const id = computed(() => route.params.id?.toString() ?? '')
const { canAddToList, disabledReason, hasLists, isAddingToList, targetListItems } =
	useRecipeAddToList(id)
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
const showRecipeSkeleton = computed(() => isLoadingRecipe.value && !recipe.value)
const showRecipeItemModal = shallowRef(false)
const showRecipeSettingsModal = shallowRef(false)
const selectedRecipeItemId = shallowRef<string | null>(null)
let recipeLoadRequestId = 0
const selectedRecipeItem = computed(() =>
	selectedRecipeItemId.value
		? (recipesStore.recipeItemsById[selectedRecipeItemId.value] ?? null)
		: null
)

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
				icon: getIcon('error')
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
			icon: getIcon('error')
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
			icon: getIcon('error')
		})

		await refreshRecipe()
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
							:icon="getIcon('plus')"
							size="md"
							square
							class="aspect-square"
							aria-label="Ingredient toevoegen"
							@click="openCreateRecipeItemModal"
						/>
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
				:icon="getIcon('error')"
				title="Recept kon niet worden geladen"
				:description="recipeLoadError"
			/>

			<div v-else-if="showRecipeSkeleton" class="space-y-4">
				<UPageCard variant="subtle" :ui="{ body: 'space-y-4' }">
					<USkeleton class="h-6 w-3/4 max-w-72" />
					<USkeleton class="h-4 w-full" />
					<USkeleton class="h-4 w-5/6" />
					<div class="flex flex-wrap gap-2">
						<USkeleton class="h-7 w-28 rounded-full" />
						<USkeleton class="h-7 w-36 rounded-full" />
						<USkeleton class="h-9 w-44 rounded-lg" />
					</div>
				</UPageCard>

				<div class="grid gap-3">
					<USkeleton class="h-24 w-full rounded-xl" />
					<USkeleton class="h-24 w-full rounded-xl" />
					<USkeleton class="h-24 w-full rounded-xl" />
				</div>

				<UPageCard
					variant="subtle"
					:ui="{
						body: 'space-y-3 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:space-y-0'
					}"
				>
					<div class="space-y-2">
						<USkeleton class="h-5 w-48" />
						<USkeleton class="h-4 w-full max-w-96" />
					</div>
					<USkeleton class="h-10 w-full rounded-lg sm:w-52" />
				</UPageCard>
			</div>

			<UEmpty
				v-else-if="!recipe"
				:icon="getIcon('bookX')"
				title="Recept niet gevonden"
				description="Dit recept bestaat niet meer of is niet beschikbaar."
				variant="subtle"
			>
				<template #actions>
					<UButton to="/app/recipes" color="primary" :icon="getIcon('arrowLeft')">
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
							:icon="getIcon('users')"
						>
							{{ recipeServings }} porties
						</UBadge>
						<UBadge color="neutral" variant="soft" :icon="getIcon('list')">
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
							:icon="getIcon('externalLink')"
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

				<UPageCard
					variant="subtle"
					:ui="{
						body: 'space-y-3 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:space-y-0'
					}"
				>
					<div class="space-y-1">
						<p class="text-highlighted text-sm font-semibold">
							Zet dit recept direct op een lijst
						</p>
						<p class="text-muted text-sm leading-relaxed">
							{{
								disabledReason ??
								'Voeg alle ingredienten van dit recept in een keer toe aan een actieve lijst.'
							}}
						</p>
					</div>

					<UDropdownMenu :items="[targetListItems]" :content="{ align: 'end' }">
						<UButton
							color="primary"
							variant="solid"
							:icon="getIcon('listPlus')"
							:loading="isAddingToList"
							:disabled="!canAddToList"
							class="w-full justify-center sm:w-auto"
						>
							{{ hasLists ? 'Aan lijst toevoegen' : 'Geen lijst beschikbaar' }}
						</UButton>
					</UDropdownMenu>
				</UPageCard>

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
