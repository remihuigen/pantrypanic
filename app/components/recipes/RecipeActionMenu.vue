<script setup lang="ts">
import { getIcon } from '#shared/utils/icons'

const props = defineProps<{
	recipeId: string
	showAddToList?: boolean
}>()

const emit = defineEmits<{
	edit: []
	deleted: []
}>()

const recipesStore = useRecipesStore()
const toast = useToast()
const confirm = useConfirmDialog()
const { canAddToList, disabledReason, isAddingToList, targetListItems } = useRecipeAddToList(
	computed(() => props.recipeId)
)

const menuItems = computed(() => [
	[
		...(props.showAddToList
			? [
					{
						label: 'Aan lijst toevoegen',
						description: disabledReason.value,
						icon: getIcon('listPlus'),
						disabled: !canAddToList.value,
						children: targetListItems.value
					}
				]
			: []),
		{
			label: 'Wijzig instellingen',
			icon: getIcon('settings'),
			onSelect: () => emit('edit')
		},
		{
			label: 'Verwijderen',
			icon: getIcon('trash'),
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
				icon: getIcon('trash')
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
			icon: getIcon('error')
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
			:loading="isAddingToList"
			:icon="getIcon('ellipsis')"
			aria-label="Receptacties"
			@click.stop
		/>
	</UDropdownMenu>
</template>
