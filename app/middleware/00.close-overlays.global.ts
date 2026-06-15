/**
 * Closes app-level drawers before allowing product route navigation.
 */
export default defineNuxtRouteMiddleware((to, from) => {
	if (!import.meta.client || to.fullPath === from.fullPath) {
		return
	}

	const editItemDrawer = useEditItemDrawer()
	const editListDrawer = useEditListDrawer()

	if (editItemDrawer.isOpen.value) {
		editItemDrawer.close()
		return abortNavigation()
	}

	if (editListDrawer.isOpen.value) {
		editListDrawer.close()
		return abortNavigation()
	}
})
