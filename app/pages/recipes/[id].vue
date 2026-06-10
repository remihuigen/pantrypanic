<script lang="ts" setup>
import { useGesture } from '@vueuse/gesture'

definePageMeta({ layout: 'app' })

const gestureTarget = useTemplateRef<HTMLElement>('gestureTarget')

useGesture(
	{
		onDragEnd: ({ swipe: [swipeX] }) => {
			if (swipeX > 0) {
				void navigateTo('/recipes')
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
</script>

<template>
	<div ref="gestureTarget" class="touch-pan-y">
		<PageShell>
			<PageHeader :badge="1"> Recipe name</PageHeader>
		</PageShell>
	</div>
</template>
