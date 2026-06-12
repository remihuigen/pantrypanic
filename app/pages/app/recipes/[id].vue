<script lang="ts" setup>
import { useGesture } from '@vueuse/gesture'

definePageMeta({ layout: 'app' })

const route = useRoute()
const recipesStore = useRecipesStore()
const gestureTarget = useTemplateRef<HTMLElement>('gestureTarget')
const id = computed(() => route.params.id?.toString() ?? '')

useGesture(
	{
		onDragEnd: ({ swipe: [swipeX] }) => {
			if (swipeX > 0) {
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
		void recipesStore.fetchRecipe(recipeId)
	},
	{ immediate: true }
)

onUnmounted(() => {
	recipesStore.setActiveRecipe(null)
})
</script>

<template>
	<div ref="gestureTarget" class="touch-pan-y">
		<PageShell>
			<PageHeader :badge="1"> Recipe name</PageHeader>
		</PageShell>
	</div>
</template>
