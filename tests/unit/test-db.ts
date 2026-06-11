/**
 * Creates a chainable mocked Drizzle select builder.
 *
 * @param rows - Rows resolved by the builder.
 * @returns Thenable select builder mock.
 */
export function createSelectBuilder<T>(rows: T[]) {
	const builder = createThenableBuilder(rows)

	return Object.assign(builder, {
		from: () => builder,
		innerJoin: () => builder,
		where: () => builder,
		groupBy: () => builder,
		orderBy: () => builder,
		limit: () => builder,
		offset: () => builder
	})
}

/**
 * Creates a chainable mocked Drizzle insert builder.
 *
 * @param rows - Rows resolved by the builder.
 * @returns Thenable insert builder mock.
 */
export function createInsertBuilder<T>(rows: T[]) {
	const builder = createThenableBuilder(rows)

	return Object.assign(builder, {
		values: () => builder,
		returning: () => builder
	})
}

/**
 * Creates a chainable mocked Drizzle update builder.
 *
 * @param rows - Rows resolved by the builder.
 * @returns Thenable update builder mock.
 */
export function createUpdateBuilder<T>(rows: T[] = []) {
	const builder = createThenableBuilder(rows)

	return Object.assign(builder, {
		set: () => builder,
		where: () => builder,
		returning: () => builder
	})
}

/**
 * Creates a chainable mocked Drizzle delete builder.
 *
 * @param rows - Rows resolved by the builder.
 * @returns Thenable delete builder mock.
 */
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
