<script setup lang="ts">
const props = defineProps<{
	recipeId: string
}>()

const emit = defineEmits<{
	edit: []
	deleted: []
}>()

const recipesStore = useRecipesStore()
const toast = useToast()
const confirm = useConfirmDialog()

const menuItems = computed(() => [
	[
		{
			label: 'Wijzig instellingen',
			icon: 'i-lucide-settings',
			onSelect: () => emit('edit')
		},
		{
			label: 'Verwijderen',
			icon: 'i-lucide-trash-2',
			color: 'error' as const,
			onSelect: async () => await handleDeleteRecipe()
		}
	]
])

const recipeName = computed(() => recipesStore.recipesById[props.recipeId]?.name ?? 'dit recept')

async function handleDeleteRecipe() {
	const confirmed = await confirm({
		title: 'Recept verwijderen?',
		description: `Weet je zeker dat je "${recipeName.value}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`,
		color: 'error',
		actions: [
			{
				label: 'Annuleren',
				color: 'neutral',
				variant: 'soft',
				mode: 'cancel'
			},
			{
				label: 'Verwijderen',
				color: 'error',
				variant: 'solid',
				mode: 'confirm',
				icon: 'i-lucide-trash-2'
			}
		]
	})

	if (!confirmed) {
		return
	}

	try {
		await recipesStore.deleteRecipe(props.recipeId)
		emit('deleted')
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Recept kon niet worden verwijderd.'),
			color: 'error',
			duration: 8000,
			icon: 'i-lucide-circle-alert'
		})
	}
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
</script>

<template>
	<UDropdownMenu :items="menuItems" :content="{ align: 'end' }">
		<UButton
			variant="ghost"
			color="neutral"
			square
			size="sm"
			icon="i-lucide-ellipsis-vertical"
			aria-label="Receptacties"
			@click.stop
		/>
	</UDropdownMenu>
</template>
