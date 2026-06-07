import { ApiError } from "./errors.ts";

const requestedHeaders = "authorization, x-client-info, apikey, content-type";

export function getRequestOrigin(req: Request): string {
  const origin = req.headers.get("Origin");

  if (!origin) {
    throw new ApiError(403, "forbidden", "Origin header is required.");
  }

  return origin;
}

export function corsHeaders(origin?: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers": requestedHeaders,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function handleCors(req: Request): Response | null {
  if (req.method !== "OPTIONS") {
    return null;
  }

  return new Response("ok", {
    headers: corsHeaders(req.headers.get("Origin") ?? undefined),
  });
}
