<script setup lang="ts">
import type { RecipeSummary } from '#shared/utils/schemas/domain'

defineProps<{
	recipes: Array<
		RecipeSummary & {
			sourceUrl?: string
			itemCount: number
			usageCount: number
		}
	>
}>()

const emit = defineEmits<{
	deleted: [recipeId: string]
	edit: [recipeId: string]
}>()
</script>

<template>
	<section v-if="recipes.length > 0" class="space-y-3">
		<div class="flex items-center justify-between gap-3">
			<h2 class="text-highlighted text-base font-semibold">Jouw favorieten</h2>
		</div>

		<UCarousel
			:items="recipes"
			:ui="{ item: 'basis-[60%] sm:basis-1/2 lg:basis-1/3', container: 'pt-1 pb-5' }"
			class="-mx-1"
		>
			<template #default="{ item }">
				<div class="h-full px-1">
					<RecipeCard
						:recipe="item"
						:item-count="item.itemCount"
						:usage-count="item.usageCount"
						featured
						@edit="emit('edit', $event)"
						@deleted="emit('deleted', $event)"
					/>
				</div>
			</template>
		</UCarousel>
	</section>
</template>
