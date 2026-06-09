# Server Routes

## Authentication

Authentication uses `nuxt-auth-utils` sessions with email/password login.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Validate email/password credentials and create a user session. |
| `POST` | `/api/auth/logout` | Clear the current user session. |
| `GET/DELETE` | `/api/_auth/session` | Nuxt-auth-utils session endpoint used by `useUserSession()`. |

`server/middleware/auth.ts` protects `/api/**` and `/images/**` with
`server/utils/auth.ts`.

Requests are authenticated when either:

- a nuxt-auth-utils user session is present
- `x-api-token` matches `ADMIN_API_KEY`

Public server paths are `/api/auth/login` and `/api/_auth/session`.

`ADMIN_API_TOKEN` remains accepted as a legacy environment fallback.

## Blob Management

Blob storage is managed through server-only API routes backed by `@nuxthub/blob`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/blobs` | List blob metadata with `limit`, `prefix`, `cursor`, and `folded` query support. |
| `POST` | `/api/blobs` | Upload one or more multipart form files from form key `files` by default. |
| `POST` | `/api/blobs/validate` | Validate multipart form files without storing them. |
| `GET` | `/api/blobs/**` | Read blob metadata for a pathname. |
| `PUT` | `/api/blobs/**` | Replace or create a blob from a raw request body. |
| `DELETE` | `/api/blobs/**` | Delete a blob pathname. |
| `POST/PUT/DELETE` | `/api/blobs/multipart/:action/**` | NuxtHub multipart upload handler for `create`, `upload`, `complete`, and `abort`. |

Validation is centralized in `server/utils/blob-storage.ts`.

- Pathnames must be relative and cannot contain empty, current, parent, backslash, or control-character segments.
- Multipart form uploads are limited to `32MB`.
- Accepted stored asset types are safe raster images, video, audio, PDF, text, and JSON.
- Raw `PUT` uploads require `Content-Length` and a supported `Content-Type`.

## Blob Image Serving

`GET /images/**` serves blob contents for Nuxt Image and normal image URLs.

The route serves only safe raster image metadata types: JPEG, PNG, WebP, GIF, and AVIF. SVG is not served from this route.

## User Management

User CRUD routes are server-only API routes backed by NuxtHub DB and Drizzle.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/users` | List users with `email`, `limit`, and `offset` query support. |
| `POST` | `/api/users` | Create a user from `name`, `email`, and `password`. |
| `GET` | `/api/users/:userId` | Read one user by id. |
| `PUT` | `/api/users/:userId` | Update one or more user fields. |
| `PATCH` | `/api/users/:userId` | Update one or more user fields. |
| `DELETE` | `/api/users/:userId` | Delete a user by id. |

Responses omit the `password` field. Passwords are stored as scrypt hashes. Fine-grained permission
checks are intentionally not implemented yet.

## Admin User Seed

The build runs a Nuxt `build:done` hook that calls `scripts/seed-admin-user.mjs`.

The seed reads `ADMIN_USER_EMAIL`, `ADMIN_USER_PASSWORD`, `ADMIN_API_KEY`, and
`NUXT_PUBLIC_SITE_URL` from the environment. It checks whether that email already exists by calling
`GET /api/users?email=<email>&limit=1`, then creates the user with `POST /api/users` if missing.

Both requests use `x-api-token: ADMIN_API_KEY`, so the seed can run against the current instance or
a remote deployment URL.

If the configured instance is unreachable during build, the seed logs a warning and skips without
failing the build.

The deployment workflow sets `SKIP_ADMIN_SEED=1` during build and runs `pnpm seed:admin` after
migrations and deployment complete.
