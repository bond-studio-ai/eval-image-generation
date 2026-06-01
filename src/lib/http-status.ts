import { StatusCodes } from "http-status-codes";

/**
 * Plain-`number` HTTP status constants sourced from `http-status-codes`.
 *
 * `Response.status` (and Next's `{ status }` option) are typed as `number`,
 * but the package exposes its codes as a numeric *enum*. Comparing the two
 * directly trips `@typescript-eslint/no-unsafe-enum-comparison`, and casting
 * around it only invites the no-unnecessary-assertion/-conversion autofixers
 * to undo the cast. Re-exporting the codes we use as `number` keeps a single
 * source of truth (the package owns the values) without the magic numbers or
 * the lint friction.
 */
export const HTTP_NO_CONTENT: number = StatusCodes.NO_CONTENT;
export const HTTP_UNAUTHORIZED: number = StatusCodes.UNAUTHORIZED;
export const HTTP_NOT_FOUND: number = StatusCodes.NOT_FOUND;
export const HTTP_UNPROCESSABLE_ENTITY: number = StatusCodes.UNPROCESSABLE_ENTITY;
export const HTTP_INTERNAL_SERVER_ERROR: number = StatusCodes.INTERNAL_SERVER_ERROR;
export const HTTP_BAD_GATEWAY: number = StatusCodes.BAD_GATEWAY;
