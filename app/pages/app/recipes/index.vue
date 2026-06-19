<script lang="ts" setup>
import { getIcon } from '#shared/utils/icons'

definePageMeta({ layout: 'app' })

const recipesStore = useRecipesStore()
const listsStore = useListsStore()
const toast = useToast()
const { getUsageCount } = useRecipeUsage()

const searchQuery = shallowRef('')
const showCreateRecipeModal = shallowRef(false)
const showEditRecipeModal = shallowRef(false)
const editRecipeId = shallowRef<string | null>(null)
const isLoadingRecipes = shallowRef(false)
const recipeLoadError = shallowRef<string | null>(null)
const showRecipesSkeleton = computed(
	() =>
		(isLoadingRecipes.value || recipesStore.isLoading) &&
		recipesStore.activeRecipes.length === 0 &&
		!recipeLoadError.value
)

const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase())
const hasSearchQuery = computed(() => normalizedSearchQuery.value.length > 0)
const recipesWithMeta = computed(() =>
	recipesStore.activeRecipes.map((recipe) => ({
		...recipe,
		itemCount: recipesStore.getRecipeItems(recipe.id).length,
		sourceUrl: recipesStore.recipesById[recipe.id]?.sourceUrl,
		usageCount: getUsageCount(recipe.id)
	}))
)
const filteredRecipes = computed(() => {
	if (!hasSearchQuery.value) {
		return recipesWithMeta.value
	}

	return recipesWithMeta.value.filter((recipe) =>
		[recipe.name, recipe.description, recipe.sourceUrl]
			.filter((value): value is string => Boolean(value))
			.some((value) => value.toLowerCase().includes(normalizedSearchQuery.value))
	)
})
const favoriteRecipes = computed(() =>
	recipesWithMeta.value
		.filter((recipe) => recipe.usageCount > 0)
		.sort(
			(left, right) =>
				right.usageCount - left.usageCount || left.name.localeCompare(right.name)
		)
		.slice(0, 8)
)

async function refreshRecipes() {
	isLoadingRecipes.value = true

	try {
		const recipes = await recipesStore.fetchRecipes({ status: 'active' })
		await Promise.all(
			recipes.map((recipe) => recipesStore.fetchRecipe(recipe.id).catch(() => undefined))
		)
		recipeLoadError.value = null
	} catch (error) {
		const message = getErrorMessage(error, 'Recepten konden niet worden geladen.')
		recipeLoadError.value = message
		toast.add({
			title: message,
			color: 'error',
			duration: 8000,
			icon: getIcon('error')
		})
	} finally {
		isLoadingRecipes.value = false
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

function openCreateRecipeModal() {
	showCreateRecipeModal.value = true
}

function openEditRecipeModal(recipeId: string) {
	editRecipeId.value = recipeId
	showEditRecipeModal.value = true
}

function openCreatedRecipe(recipeId: string) {
	void navigateTo({ path: `/app/recipes/${recipeId}` })
}

function closeEditRecipeModal() {
	showEditRecipeModal.value = false
	editRecipeId.value = null
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

onMounted(() => {
	void Promise.all([refreshRecipes(), refreshLists()])
})
</script>

<template>
	<PageShell>
		<template #header>
			<PageHeader :badge="filteredRecipes.length"> Recepten </PageHeader>
		</template>

		<div class="space-y-6">
			<RecipeSearchToolbar
				v-model:search-query="searchQuery"
				@create="openCreateRecipeModal"
			/>

			<UAlert
				v-if="recipeLoadError"
				color="error"
				variant="soft"
				:icon="getIcon('error')"
				title="Recepten konden niet worden geladen"
				:description="recipeLoadError"
			/>

			<div v-else-if="showRecipesSkeleton" class="space-y-4">
				<USkeleton class="h-34 w-full rounded-2xl" />
				<div class="grid gap-4">
					<USkeleton class="h-32 w-full rounded-2xl" />
					<USkeleton class="h-32 w-full rounded-2xl" />
					<USkeleton class="h-32 w-full rounded-2xl" />
				</div>
			</div>

			<template v-else>
				<Transition name="recipe-favorites">
					<RecipeFavoritesCarousel
						v-if="!hasSearchQuery && favoriteRecipes.length > 0"
						:recipes="favoriteRecipes"
						@edit="openEditRecipeModal"
					/>
				</Transition>

				<RecipeList
					:recipes="filteredRecipes"
					:is-searching="hasSearchQuery"
					@edit="openEditRecipeModal"
				/>
			</template>
		</div>

		<RecipeCreateModal v-model:open="showCreateRecipeModal" @created="openCreatedRecipe" />
		<RecipeCreateModal
			v-if="editRecipeId"
			v-model:open="showEditRecipeModal"
			:recipe-id="editRecipeId"
			@updated="closeEditRecipeModal"
		/>
	</PageShell>
</template>

<style scoped>
.recipe-favorites-enter-active,
.recipe-favorites-leave-active {
	overflow: hidden;
	transition:
		opacity 180ms ease,
		transform 180ms ease,
		max-height 220ms ease,
		margin 220ms ease;
}

.recipe-favorites-enter-from,
.recipe-favorites-leave-to {
	max-height: 0;
	margin-top: 0;
	opacity: 0;
	transform: translateY(-0.5rem);
}

.recipe-favorites-enter-to,
.recipe-favorites-leave-from {
	max-height: 24rem;
	opacity: 1;
	transform: translateY(0);
}
</style>
