import { corsHeaders, handleCors } from "../_shared/cors.ts";
import {
  ensureProductUser,
  readJsonBody,
  resolveAnonymousProductContext,
} from "../_shared/context.ts";
import { errorResponse, jsonOk } from "../_shared/errors.ts";

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) {
    return preflight;
  }

  const origin = req.headers.get("Origin") ?? undefined;
  const headers = corsHeaders(origin);

  try {
    const body = await readJsonBody<{ product_key?: string }>(req);
    const ctx = await resolveAnonymousProductContext(req, body);
    const productUser = ctx.user ? await ensureProductUser(ctx) : null;

    return jsonOk(
      {
        product: {
          product_key: ctx.product.product_key,
          name: ctx.product.name,
        },
        product_user: productUser
          ? {
            role: productUser.role,
            status: productUser.status,
          }
          : null,
      },
      { headers },
    );
  } catch (error) {
    return errorResponse(error, headers);
  }
});
