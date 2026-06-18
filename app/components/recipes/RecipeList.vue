<script setup lang="ts">
import type { RecipeSummary } from '#shared/utils/schemas/domain'

const props = defineProps<{
	recipes: Array<
		RecipeSummary & {
			sourceUrl?: string
			itemCount: number
			usageCount: number
		}
	>
	isSearching: boolean
}>()

const emit = defineEmits<{
	deleted: [recipeId: string]
	edit: [recipeId: string]
}>()

const emptyTitle = computed(() =>
	props.isSearching ? 'Geen recepten gevonden' : 'Nog geen recepten'
)
const emptyDescription = computed(() =>
	props.isSearching
		? 'Pas je zoekopdracht aan om meer recepten te zien.'
		: 'Maak je eerste recept aan om ingredienten opnieuw te gebruiken.'
)
</script>

<template>
	<section class="space-y-3">
		<div class="flex items-center justify-between gap-3">
			<h2 class="text-highlighted text-base font-semibold">Alle recepten</h2>
			<UBadge color="neutral" variant="subtle">{{ recipes.length }}</UBadge>
		</div>

		<div v-if="recipes.length > 0" class="grid gap-4">
			<RecipeCard
				v-for="recipe in recipes"
				:key="recipe.id"
				:recipe="recipe"
				:item-count="recipe.itemCount"
				:usage-count="recipe.usageCount"
				@edit="emit('edit', $event)"
				@deleted="emit('deleted', $event)"
			/>
		</div>

		<UEmpty
			v-else
			icon="i-lucide-book-open"
			:title="emptyTitle"
			:description="emptyDescription"
			variant="subtle"
		/>
	</section>
</template>
