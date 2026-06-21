declare module 'sortablejs' {
	export type SortableEvent = {
		from: HTMLElement
		item: HTMLElement
		newIndex?: number
		oldIndex?: number
		related?: HTMLElement | null
		to: HTMLElement
	}

	export type SortableGroup =
		| string
		| {
				name: string
				pull?: boolean | 'clone'
				put?: boolean
		  }

	export interface SortableOptions {
		animation?: number
		delay?: number
		delayOnTouchOnly?: boolean
		dragoverBubble?: boolean
		draggable?: string
		emptyInsertThreshold?: number
		fallbackTolerance?: number
		group?: SortableGroup
		handle?: string
		onAdd?: (_event: SortableEvent) => void
		onChoose?: (_event: SortableEvent) => void
		onEnd?: (_event: SortableEvent) => void
		onMove?: (_event: SortableEvent, _originalEvent?: Event) => boolean
		sort?: boolean
		touchStartThreshold?: number
	}

	export default class Sortable {
		static create(_element: HTMLElement, _options?: SortableOptions): Sortable

		destroy(): void
	}
}
