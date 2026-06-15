import type { MaybeRefOrGetter } from 'vue'

import { computed, ref, toValue, watch } from 'vue'

type UseFormStateOptions<T> = {
	normalize?: (_value: T) => unknown
}

/**
 * Tracks whether a form's current normalized value differs from its initial value.
 *
 * @param initialValue - Initial form value or getter.
 * @param currentValue - Current form value or getter.
 * @param options - Optional normalizer for payload-level dirty checks.
 * @returns Dirty state and baseline reset helpers.
 */
export function useFormState<T>(
	initialValue: MaybeRefOrGetter<T>,
	currentValue: MaybeRefOrGetter<T>,
	options: UseFormStateOptions<T> = {}
) {
	const initialSnapshot = ref(toComparableValue(toValue(initialValue), options.normalize))
	const currentComparableValue = computed(() =>
		toComparableValue(toValue(currentValue), options.normalize)
	)
	const isDirty = computed(() => initialSnapshot.value !== currentComparableValue.value)

	watch(
		() => toComparableValue(toValue(initialValue), options.normalize),
		(value) => {
			initialSnapshot.value = value
		}
	)

	function resetInitialValue(value: MaybeRefOrGetter<T> = currentValue) {
		initialSnapshot.value = toComparableValue(toValue(value), options.normalize)
	}

	return {
		isDirty,
		resetInitialValue
	}
}

function toComparableValue<T>(value: T, normalize?: (_value: T) => unknown) {
	return stableStringify(normalize ? normalize(value) : value)
}

function stableStringify(value: unknown): string {
	if (value === null || typeof value !== 'object') {
		return JSON.stringify(value)
	}

	if (Array.isArray(value)) {
		return `[${value.map((entry) => stableStringify(entry)).join(',')}]`
	}

	const record = value as Record<string, unknown>
	const entries = Object.keys(record)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)

	return `{${entries.join(',')}}`
}
