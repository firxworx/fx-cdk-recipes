import { HttpStatus } from './constants'

export type ResponseBody = { [key: string]: unknown }
export type ResponseHeader = { [header: string]: string | number | boolean }

export interface JsonResponseOptions {
  headers?: ResponseHeader
  prettyPrint?: boolean
}

/**
 * Return a lambda response object compatible with API Gateway payload formats re http 1.0 and 2.0.
 * This function satisfies the most common use-cases related to returning a json response.
 *
 * The response includes a content-type header when the given `body` is not `undefined`.
 *
 * Conditional logic is implemented as follows:
 * - if `string`, returns stringified `{ message: body }`
 * - if `undefined`, returns no/empty body and no content-type header
 * - if `null`, returns stringified empty object `{}`
 * - else returns a stringified version of the given `body`
 *
 * @param statusCode
 * @param body
 * @param options
 * @returns
 */
export const jsonResponse = (statusCode: HttpStatus, body?: ResponseBody | string, options?: JsonResponseOptions) => {
  const bodyType = typeof body
  const resObj = bodyType === 'string' ? { message: body } : bodyType === 'undefined' ? undefined : body ?? {}

  return {
    statusCode,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(options?.headers ?? {}),
    },
    body: options?.prettyPrint ? JSON.stringify(resObj, null, 2) : JSON.stringify(resObj),
  }
}

/** Return a response object with success status - HTTP 200 (OK). */
export const successResponse = (body?: ResponseBody | string) => {
  return jsonResponse(HttpStatus.OK, body)
}

/** Return a response object with created status - HTTP 201 (Created). */
export const createdResponse = (body?: ResponseBody | string) => {
  return jsonResponse(HttpStatus.CREATED, body)
}

/** Return a response object with no content status - HTTP 204 (No Content). */
export const noContentResponse = () => {
  return jsonResponse(HttpStatus.CREATED, undefined)
}

/** Return a response object with error status - HTTP 400 (Bad Request). */
export const badRequestResponse = (body?: ResponseBody | string) => {
  return jsonResponse(HttpStatus.BAD_REQUEST, body)
}

/** Return a response object with error status - HTTP 500 (Internal Server Error). */
export const errorResponse = (body?: ResponseBody | string) => {
  return jsonResponse(HttpStatus.INTERNAL_SERVER_ERROR, body)
}
