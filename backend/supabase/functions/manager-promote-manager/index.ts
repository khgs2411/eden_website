import { corsHeaders, handleCors } from "../_shared/cors.ts";
import {
  promoteExistingProductUserToManager,
  readJsonBody,
  requireProductContext,
  requireProductManager,
} from "../_shared/context.ts";
import { ApiError, errorResponse, jsonOk } from "../_shared/errors.ts";

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) {
    return preflight;
  }

  const origin = req.headers.get("Origin") ?? undefined;
  const headers = corsHeaders(origin);

  try {
    const body = await readJsonBody<{ product_key?: string; user_id?: string }>(
      req,
    );

    if (!body.user_id || typeof body.user_id !== "string") {
      throw new ApiError(400, "bad_request", "user_id is required.");
    }

    const ctx = await requireProductContext(req, body);
    await requireProductManager(ctx);
    const productUser = await promoteExistingProductUserToManager(
      ctx.product.id,
      body.user_id,
    );

    return jsonOk(
      {
        product_key: ctx.product.product_key,
        user_id: body.user_id,
        role: productUser.role,
      },
      { headers },
    );
  } catch (error) {
    return errorResponse(error, headers);
  }
});
