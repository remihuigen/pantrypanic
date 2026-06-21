import { blob } from '@nuxthub/blob'
import { defineApiHandler, getAuthenticatedUserId } from '#server/utils/api-core'
import {
	assertManagedBlob,
	assertPublicImageContentType,
	isUploadFile
} from '#server/utils/blob-storage'
import { updateProfile } from '#server/utils/settings'
import { createDomainId } from '#server/utils/api-helpers'
import { createError, readFormData } from 'h3'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const form = await readFormData(event)
	const file = form.get('avatar')

	if (!isUploadFile(file)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Bad Request',
			message: 'Avatarbestand is verplicht.'
		})
	}

	assertManagedBlob(file, event)
	assertPublicImageContentType(file.type)
	const contentType = file.type.split(';')[0]?.trim().toLowerCase() || 'image/png'
	const pathname = `avatars/${userId}/${createDomainId()}${extensionForContentType(contentType)}`
	const uploaded = await blob.put(pathname, file, {
		contentType,
		addRandomSuffix: false
	})
	const result = await updateProfile(userId, { avatarPathname: uploaded.pathname })
	const session = await getUserSession(event)

	if (session.user) {
		await setUserSession(event, {
			user: {
				id: result.user.id,
				name: result.user.name,
				email: result.user.email,
				avatarPathname: result.user.avatarPathname
			},
			loggedInAt: session.loggedInAt,
			activeHouseholdId: session.activeHouseholdId
		})
	}

	return { avatarPathname: uploaded.pathname, user: result.user }
})

function extensionForContentType(contentType: string) {
	if (contentType === 'image/jpeg') return '.jpg'
	if (contentType === 'image/png') return '.png'
	if (contentType === 'image/webp') return '.webp'
	if (contentType === 'image/gif') return '.gif'
	if (contentType === 'image/avif') return '.avif'

	return ''
}
