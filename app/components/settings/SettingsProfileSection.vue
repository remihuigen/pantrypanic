<script setup lang="ts">
import { passwordSchema, userSchema } from '#shared/utils/schemas/domain'
import { z } from 'zod'

const settingsStore = useSettingsStore()
const toast = useToast()
const acceptedAvatarTypes = 'image/jpeg,image/png,image/webp,image/gif,image/avif'

const profileSchema = userSchema.omit({ password: true }).extend({
	password: z.union([passwordSchema.optional(), z.literal('')]),
	passwordConfirm: z.union([passwordSchema.optional(), z.literal('')])
})

const state = reactive<z.infer<typeof profileSchema>>({
	name: '',
	email: '',
	password: '',
	passwordConfirm: ''
})
const initialProfileFormValue = shallowRef(normalizeProfileFormValue(state))
const syncedProfileId = shallowRef<number | null>(null)
const selectedAvatar = shallowRef<File | null>(null)
const selectedAvatarUrl = useObjectUrl(selectedAvatar)
const isUploadingAvatar = shallowRef(false)
const avatarVersion = shallowRef(0)
const avatarSrc = computed(() => {
	if (selectedAvatarUrl.value) return selectedAvatarUrl.value

	if (!settingsStore.profile?.avatarPathname) return undefined

	return `${imageUrl(settingsStore.profile.avatarPathname)}?v=${avatarVersion.value}`
})
const currentProfileFormValue = computed(() => normalizeProfileFormValue(state))
const { isDirty: isProfileDirty, resetInitialValue: resetInitialProfileValue } = useFormState(
	initialProfileFormValue,
	currentProfileFormValue
)
const canSaveProfile = computed(() => isProfileDirty.value && !settingsStore.isSaving)

watch(
	() => settingsStore.profile,
	(profile) => {
		if (!profile || syncedProfileId.value === profile.id) return

		syncProfileForm(profile)
	},
	{ immediate: true }
)

watch(selectedAvatar, async (file) => {
	if (!file) return

	await uploadAvatar(file)
})

async function saveProfile() {
	if (!canSaveProfile.value) {
		return
	}

	if (state.password && state.password !== state.passwordConfirm) {
		toast.add({
			title: 'Wachtwoorden komen niet overeen.',
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
		return
	}

	try {
		const profile = await settingsStore.updateProfile({
			name: state.name,
			email: state.email,
			...(state.password ? { password: state.password } : {})
		})
		syncProfileForm(profile)
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
		avatarVersion.value += 1
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

function syncProfileForm(profile: { id: number; name: string; email: string }) {
	syncedProfileId.value = profile.id
	state.name = profile.name
	state.email = profile.email
	state.password = ''
	state.passwordConfirm = ''
	initialProfileFormValue.value = normalizeProfileFormValue(state)
	resetInitialProfileValue(initialProfileFormValue)
}

function normalizeProfileFormValue(value: z.infer<typeof profileSchema>) {
	return {
		name: value.name.trim(),
		email: value.email.trim(),
		password: value.password || ''
	}
}

function getErrorMessage(error: unknown, fallback: string) {
	return error && typeof error === 'object' && 'message' in error
		? String((error as { message?: string }).message || fallback)
		: fallback
}

function imageUrl(pathname: string) {
	return `/images/${pathname.replace(/^\/+/, '')}`
}
</script>

<template>
	<div class="space-y-4">
		<UPageCard
			title="Profiel"
			description="Beheer je profiel- en accountgegevens."
			variant="naked"
		/>
		<UPageCard variant="subtle" :ui="{ body: 'space-y-4' }">
			<UFormField label="Avatar" name="avatar" description="JPEG, PNG, WebP, GIF of AVIF.">
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

					<p v-if="selectedAvatar" class="text-muted mt-1.5 text-xs">
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
		</UPageCard>

		<UPageCard variant="subtle" :ui="{ body: 'space-y-4' }">
			<UForm :state="state" :schema="profileSchema" class="grid gap-3" @submit="saveProfile">
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
				<div>
					<UButton
						type="submit"
						icon="i-lucide-save"
						:loading="settingsStore.isSaving"
						:disabled="!canSaveProfile"
					>
						Opslaan
					</UButton>
				</div>
			</UForm>
		</UPageCard>
	</div>
</template>
