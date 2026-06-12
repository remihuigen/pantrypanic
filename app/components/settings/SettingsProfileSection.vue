<script setup lang="ts">
const settingsStore = useSettingsStore()
const toast = useToast()
const acceptedAvatarTypes = 'image/jpeg,image/png,image/webp,image/gif,image/avif'

const state = reactive({
	name: '',
	email: '',
	password: '',
	passwordConfirm: ''
})
const selectedAvatar = shallowRef<File | null>(null)
const selectedAvatarUrl = useObjectUrl(selectedAvatar)
const isUploadingAvatar = shallowRef(false)
const avatarSrc = computed(() => {
	if (selectedAvatarUrl.value) return selectedAvatarUrl.value

	return settingsStore.profile?.avatarPathname
		? `/images/${settingsStore.profile.avatarPathname}`
		: undefined
})

watch(
	() => settingsStore.profile,
	(profile) => {
		state.name = profile?.name ?? ''
		state.email = profile?.email ?? ''
	},
	{ immediate: true }
)

watch(selectedAvatar, async (file) => {
	if (!file) return

	await uploadAvatar(file)
})

async function saveProfile() {
	if (state.password && state.password !== state.passwordConfirm) {
		toast.add({
			title: 'Wachtwoorden komen niet overeen.',
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
		return
	}

	try {
		await settingsStore.updateProfile({
			name: state.name,
			email: state.email,
			...(state.password ? { password: state.password } : {})
		})
		state.password = ''
		state.passwordConfirm = ''
		toast.add({ title: 'Profiel opgeslagen.', color: 'success', icon: 'i-lucide-check' })
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Profiel kon niet worden opgeslagen.'),
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
	}
}

async function uploadAvatar(file: File) {
	isUploadingAvatar.value = true
	try {
		await settingsStore.uploadAvatar(file)
		selectedAvatar.value = null
		toast.add({ title: 'Avatar opgeslagen.', color: 'success', icon: 'i-lucide-check' })
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Avatar kon niet worden opgeslagen.'),
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
	} finally {
		isUploadingAvatar.value = false
	}
}

function getErrorMessage(error: unknown, fallback: string) {
	return error && typeof error === 'object' && 'message' in error
		? String((error as { message?: string }).message || fallback)
		: fallback
}
</script>

<template>
	<UCard>
		<template #header>
			<h2 class="text-base font-semibold">Profiel</h2>
		</template>

		<div class="space-y-4">
			<UFormField
				label="Avatar"
				name="avatar"
				description="JPEG, PNG, WebP, GIF of AVIF."
			>
				<UFileUpload
					v-slot="{ open, removeFile }"
					v-model="selectedAvatar"
					:accept="acceptedAvatarTypes"
					:disabled="isUploadingAvatar"
					name="avatar"
				>
					<div class="flex flex-wrap items-center gap-3">
						<UAvatar
							:src="avatarSrc"
							:alt="settingsStore.profile?.name"
							icon="i-lucide-image"
							size="lg"
						/>

						<UButton
							:label="selectedAvatar ? 'Andere afbeelding' : 'Upload afbeelding'"
							color="neutral"
							variant="outline"
							:loading="isUploadingAvatar"
							@click="open()"
						/>
					</div>

					<p v-if="selectedAvatar" class="mt-1.5 text-xs text-muted">
						{{ selectedAvatar.name }}

						<UButton
							label="Verwijderen"
							color="error"
							variant="link"
							size="xs"
							class="p-0"
							:disabled="isUploadingAvatar"
							@click="removeFile()"
						/>
					</p>
				</UFileUpload>
			</UFormField>

			<UForm :state="state" class="grid gap-3" @submit="saveProfile">
				<UFormField label="Naam" name="name">
					<UInput v-model="state.name" />
				</UFormField>
				<UFormField label="E-mail" name="email">
					<UInput v-model="state.email" type="email" />
				</UFormField>
				<UFormField label="Nieuw wachtwoord" name="password">
					<UInput v-model="state.password" type="password" autocomplete="new-password" />
				</UFormField>
				<UFormField
					v-if="state.password"
					label="Nieuw wachtwoord bevestigen"
					name="passwordConfirm"
				>
					<UInput
						v-model="state.passwordConfirm"
						type="password"
						autocomplete="new-password"
					/>
				</UFormField>
				<UButton type="submit" icon="i-lucide-save" :loading="settingsStore.isSaving">
					Opslaan
				</UButton>
			</UForm>
		</div>
	</UCard>
</template>
