<script setup lang="ts">
import type { RecipeSummary } from '#shared/utils/schemas/domain'
import { getIcon } from '#shared/utils/icons'

const props = defineProps<{
	recipe: RecipeSummary & {
		sourceUrl?: string
	}
	itemCount: number
	usageCount?: number
	featured?: boolean
}>()

const emit = defineEmits<{
	deleted: [recipeId: string]
	edit: [recipeId: string]
}>()

const itemLabel = computed(() => (props.itemCount === 1 ? 'item' : 'items'))
const hasSourceUrl = computed(() => Boolean(props.recipe.sourceUrl))
</script>

<template>
	<UCard
		class="recipe-card relative h-full transition"
		:class="
			props.featured
				? 'ring-primary/45 bg-primary-50/70 dark:bg-primary-950/30 shadow-primary/10 shadow-lg'
				: ''
		"
		variant="subtle"
	>
		<div class="absolute top-2 right-1 z-10 flex">
			<UButton
				v-if="hasSourceUrl"
				:to="props.recipe.sourceUrl"
				target="_blank"
				rel="noopener noreferrer"
				color="neutral"
				variant="ghost"
				size="sm"
				square
				:icon="getIcon('externalLink')"
				aria-label="Naar origineel recept"
				@click.stop
			/>
			<RecipeActionMenu
				:recipe-id="props.recipe.id"
				show-add-to-list
				@edit="emit('edit', props.recipe.id)"
				@deleted="emit('deleted', props.recipe.id)"
			/>
		</div>

		<NuxtLink
			:to="`/app/recipes/${props.recipe.id}`"
			class="absolute inset-0 z-0 rounded-lg"
			:aria-label="`Open ${props.recipe.name}`"
		/>

		<div class="pointer-events-none relative z-[1] space-y-3 pe-16">
			<p class="text-highlighted text-wrap break-words text-base leading-tight font-semibold">
				{{ props.recipe.name }}
			</p>
			<div class="text-muted flex flex-wrap items-center gap-2 text-xs">
				<UBadge color="neutral" variant="soft" :icon="getIcon('list')">
					{{ props.itemCount }} {{ itemLabel }}
				</UBadge>
				<UBadge
					v-if="typeof props.usageCount === 'number'"
					color="primary"
					variant="soft"
					:icon="getIcon('heart')"
				>
					{{ props.usageCount }}x
				</UBadge>
			</div>
		</div>
	</UCard>
</template>
