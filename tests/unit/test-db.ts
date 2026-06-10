export function createSelectBuilder<T>(rows: T[]) {
	const builder = createThenableBuilder(rows)

	return Object.assign(builder, {
		from: () => builder,
		where: () => builder,
		orderBy: () => builder,
		limit: () => builder,
		offset: () => builder
	})
}

export function createInsertBuilder<T>(rows: T[]) {
	const builder = createThenableBuilder(rows)

	return Object.assign(builder, {
		values: () => builder,
		returning: () => builder
	})
}

export function createUpdateBuilder<T>(rows: T[] = []) {
	const builder = createThenableBuilder(rows)

	return Object.assign(builder, {
		set: () => builder,
		where: () => builder,
		returning: () => builder
	})
}

export function createDeleteBuilder<T>(rows: T[] = []) {
	const builder = createThenableBuilder(rows)

	return Object.assign(builder, {
		where: () => builder,
		returning: () => builder
	})
}

function createThenableBuilder<T>(rows: T[]) {
	return {
		then<TResult1 = T[], TResult2 = never>(
			onfulfilled?: ((_value: T[]) => TResult1 | PromiseLike<TResult1>) | null,
			onrejected?: ((_reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
		) {
			return Promise.resolve(rows).then(onfulfilled, onrejected)
		}
	}
}
