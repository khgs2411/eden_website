export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "internal_error";

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { code: ApiErrorCode; message: string } };

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  return new Response(
    JSON.stringify({ data, error: null } satisfies ApiResponse<T>),
    {
      ...init,
      headers,
    },
  );
}

export function jsonError(
  status: number,
  code: ApiErrorCode,
  message: string,
  init?: ResponseInit,
): Response {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  return new Response(
    JSON.stringify(
      { data: null, error: { code, message } } satisfies ApiResponse<never>,
    ),
    {
      ...init,
      status,
      headers,
    },
  );
}

export function errorResponse(error: unknown, headers?: HeadersInit): Response {
  if (error instanceof ApiError) {
    return jsonError(error.status, error.code, error.message, { headers });
  }

  console.error(error);
  return jsonError(500, "internal_error", "Unexpected server error.", {
    headers,
  });
}
