import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.106.1";
import { getRequestOrigin } from "./cors.ts";
import { ApiError } from "./errors.ts";

type ProductRole = "manager" | "user";
type ProductUserStatus = "active" | "inactive";

export type ProductRequestContext = {
  req: Request;
  origin: string;
  product: { id: string; product_key: string; name: string };
  user: { id: string; email?: string };
  productUser: { role: ProductRole; status: ProductUserStatus } | null;
};

export type AnonymousProductContext = Omit<ProductRequestContext, "user"> & {
  user: { id: string; email?: string } | null;
};

type ProductLookupRow = {
  product_id: string;
  product_key: string;
  name: string;
};

type ProductUserRow = {
  role: ProductRole;
  status: ProductUserStatus;
};

export function getServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new ApiError(
      500,
      "internal_error",
      "Supabase service configuration is missing.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getBearerToken(req: Request): string | null {
  const authorization = req.headers.get("Authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function readJsonBody<T extends Record<string, unknown>>(
  req: Request,
): Promise<T> {
  if (req.method !== "POST") {
    throw new ApiError(405, "bad_request", "Only POST requests are supported.");
  }

  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "bad_request", "Request body must be valid JSON.");
  }
}

async function resolveProduct(
  supabase: SupabaseClient,
  productKey: string | undefined,
  origin: string,
) {
  if (!productKey || typeof productKey !== "string") {
    throw new ApiError(400, "bad_request", "product_key is required.");
  }

  const { data, error } = await supabase.rpc(
    "resolve_product_by_key_and_origin",
    {
      p_product_key: productKey,
      p_origin: origin,
    },
  );

  if (error) {
    throw new ApiError(
      500,
      "internal_error",
      "Could not resolve product context.",
    );
  }

  const product = (data?.[0] ?? null) as ProductLookupRow | null;

  if (!product) {
    throw new ApiError(
      403,
      "forbidden",
      "Product key is not allowed for this origin.",
    );
  }

  return {
    id: product.product_id,
    product_key: product.product_key,
    name: product.name,
  };
}

async function loadUser(
  supabase: SupabaseClient,
  req: Request,
  required: boolean,
) {
  const token = getBearerToken(req);

  if (!token) {
    if (required) {
      throw new ApiError(
        401,
        "unauthorized",
        "Authorization bearer token is required.",
      );
    }
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new ApiError(
      401,
      "unauthorized",
      "Authorization bearer token is invalid.",
    );
  }

  return {
    id: data.user.id,
    email: data.user.email ?? undefined,
  };
}

async function loadProductUser(
  supabase: SupabaseClient,
  productId: string,
  userId: string,
): Promise<ProductUserRow | null> {
  const { data, error } = await supabase
    .from("product_users")
    .select("role,status")
    .eq("product_id", productId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "internal_error", "Could not load product user.");
  }

  return (data ?? null) as ProductUserRow | null;
}

export async function ensureProductUser(
  ctx: AnonymousProductContext,
): Promise<ProductUserRow> {
  if (!ctx.user) {
    throw new ApiError(
      401,
      "unauthorized",
      "Authorization bearer token is required.",
    );
  }

  const supabase = getServiceClient();
  const { error: insertError } = await supabase
    .from("product_users")
    .upsert(
      {
        product_id: ctx.product.id,
        user_id: ctx.user.id,
        role: "user",
        status: "active",
      },
      { onConflict: "product_id,user_id", ignoreDuplicates: true },
    )
    .select("role,status");

  if (insertError) {
    throw new ApiError(
      500,
      "internal_error",
      "Could not confirm product user.",
    );
  }

  const productUser = await loadProductUser(
    supabase,
    ctx.product.id,
    ctx.user.id,
  );

  if (!productUser) {
    throw new ApiError(
      500,
      "internal_error",
      "Could not confirm product user.",
    );
  }

  return productUser;
}

export async function resolveAnonymousProductContext(
  req: Request,
  body: { product_key?: string },
): Promise<AnonymousProductContext> {
  const origin = getRequestOrigin(req);
  const supabase = getServiceClient();
  const product = await resolveProduct(supabase, body.product_key, origin);
  const user = await loadUser(supabase, req, false);
  const productUser = user
    ? await loadProductUser(supabase, product.id, user.id)
    : null;

  return { req, origin, product, user, productUser };
}

export async function requireProductContext(
  req: Request,
  body: { product_key?: string },
): Promise<ProductRequestContext> {
  const ctx = await resolveAnonymousProductContext(req, body);

  if (!ctx.user) {
    throw new ApiError(
      401,
      "unauthorized",
      "Authorization bearer token is required.",
    );
  }

  return { ...ctx, user: ctx.user };
}

export async function requireProductManager(
  ctx: ProductRequestContext,
): Promise<void> {
  if (
    ctx.productUser?.role !== "manager" || ctx.productUser.status !== "active"
  ) {
    throw new ApiError(403, "forbidden", "Product manager role is required.");
  }
}

export async function requirePlatformAdmin(
  ctx: ProductRequestContext,
): Promise<void> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (error) {
    throw new ApiError(
      500,
      "internal_error",
      "Could not verify platform admin.",
    );
  }

  if (!data) {
    throw new ApiError(403, "forbidden", "Platform admin role is required.");
  }
}

export async function promoteProductManager(
  productId: string,
  userId: string,
): Promise<ProductUserRow> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("product_users")
    .upsert(
      {
        product_id: productId,
        user_id: userId,
        role: "manager",
        status: "active",
      },
      { onConflict: "product_id,user_id" },
    )
    .select("role,status")
    .single();

  if (error) {
    throw new ApiError(
      500,
      "internal_error",
      "Could not promote product manager.",
    );
  }

  return data as ProductUserRow;
}
