export type ApiErrorCode =
	| 'UNAUTHORIZED'
	| 'FORBIDDEN'
	| 'VALIDATION_ERROR'
	| 'NOT_FOUND'
	| 'CONFLICT'
	| 'INTERNAL_ERROR'

export type ApiSuccessResponse<T> = {
	success: true
	data: T
}

export type ApiErrorResponse = {
	success: false
	error: {
		code: ApiErrorCode
		message: string
		details?: unknown
	}
}

export type ApiEnvelope<T> = ApiSuccessResponse<T> | ApiErrorResponse

export type AppError = {
	code: ApiErrorCode | string
	message: string
	details?: unknown
}
