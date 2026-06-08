# Chunk 01: Security RLS Membership Visibility

**Plan Set:** `../plan.md`
**Spec:** `../../../spec.md`
**Status:** Ready For Implementation
**Depends on:** None
**Enables:** `02-membership-ledger-cancellation-audit.md`, final verification

## Goal

Close the critical read-security gaps from the implementation review: authenticated clients must not be able to execute a security-definer active-membership lookup for arbitrary users, and non-members must not see `members_only` classes through either the `classes` Edge Function or direct RLS-protected table access.

## Source Artifacts

- Root spec: Technical Design Direction, Permissions / Security, Classes access rules, Memberships.
- Agenda decisions: Edge-Function-only API boundary, visibility/membership/registration policy separation, product-key scoping.
- Context terms: Product User, Member, Membership Ledger, Service Role, Class.
- ADR 0001: shared Supabase product scoping with Edge Function checks and RLS defense in depth.
- Review findings: 1 and 2 in `../../../reviews/2026-06-08/implementation-review.md`.
- Code paths: `supabase/migrations/20260607132920_membership_ledger.sql`, `supabase/migrations/20260607134535_template_class_core.sql`, `supabase/functions/classes/index.ts`.

## Relationships

- **Depends on:** current membership and class migrations/functions already merged into `feature/classes`.
- **Enables:** ledger cancellation fixes can rely on a safe active-membership helper contract.
- **Shared contracts:** browser clients do not call table/RPC membership lookup directly; Edge Functions use service-role server access; `members_only` means active members only.
- **Integration points:** Supabase RLS policies, `public.get_active_membership_grant`, `classes` Edge Function `list_user`.

## File Responsibility Map

**Create:**
- `supabase/migrations/<generated>_security_rls_membership_visibility.sql` - privilege/RLS fixes and helper functions. Use `rtk supabase migration new security_rls_membership_visibility`.

**Modify:**
- `supabase/functions/classes/index.ts` - filter member-only classes using active membership state before returning `list_user`.

**Test:**
- SQL smoke checks via `rtk supabase db query`.
- Edge Function smoke for `classes` `list_user` when JWTs are available.

## Implementation Tasks

### Task 1: Add security migration

**Files:**
- Create: `supabase/migrations/<generated>_security_rls_membership_visibility.sql`

- [ ] Run:

```bash
rtk supabase migration new security_rls_membership_visibility
```

Expected: a migration file path under `supabase/migrations/`.

- [ ] Add this SQL contract to the generated migration, preserving the generated timestamp filename:

```sql
revoke all on function public.get_active_membership_grant(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_active_membership_grant(uuid, uuid) to service_role;

create or replace function private.current_user_has_active_membership(
	p_product_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
	select exists (
		select 1
		from public.membership_grants mg
		where mg.product_id = p_product_id
			and mg.user_id = auth.uid()
			and mg.status = 'active'
			and (mg.valid_until is null or mg.valid_until > now())
			and (mg.remaining_stock is null or mg.remaining_stock > 0)
	);
$$;

revoke all on function private.current_user_has_active_membership(uuid) from public, anon;
grant execute on function private.current_user_has_active_membership(uuid) to authenticated;

drop policy if exists classes_product_user_read on public.classes;

create policy classes_product_user_read
on public.classes for select
to authenticated
using (
	status = 'published'
	and lifecycle_status = 'created'
	and private.has_product_role(product_id, array['manager', 'user'])
	and (
		visibility = 'public'
		or (
			visibility = 'members_only'
			and private.current_user_has_active_membership(product_id)
		)
	)
);
```

### Task 2: Update `classes` user listing

**Files:**
- Modify: `supabase/functions/classes/index.ts`

- [ ] Add an active-member helper near `addApprovedCounts`:

```ts
async function hasActiveMembership(productId: string, userId: string): Promise<boolean> {
	const supabase = getServiceClient();
	const { data, error } = await supabase.rpc("get_active_membership_grant", {
		p_product_id: productId,
		p_user_id: userId,
	});

	if (error) {
		throw new ApiError(500, "internal_error", "Could not verify membership visibility.");
	}

	return Boolean(data);
}
```

- [ ] Replace the `list_user` class query block so non-members only request public classes:

```ts
const activeMember = await hasActiveMembership(ctx.product.id, ctx.user.id);
let query = supabase
	.from("classes")
	.select("*")
	.eq("product_id", ctx.product.id)
	.eq("status", "published")
	.eq("lifecycle_status", "created")
	.gte("starts_at", new Date().toISOString())
	.order("starts_at", { ascending: true });

query = activeMember
	? query.in("visibility", ["public", "members_only"])
	: query.eq("visibility", "public");

const { data, error } = await query;
```

- [ ] Keep `list_public` unchanged: anonymous callers see only `visibility = public`.

## Verification

- Run: `rtk supabase status`
  - Expected: local Supabase stack is running, or reports it must be started.

- Run: `rtk supabase db query "select has_function_privilege('authenticated', 'public.get_active_membership_grant(uuid, uuid)', 'execute') as authenticated_can_execute;"`
  - Expected after migration: one row with `authenticated_can_execute = false`.

- Run: `rtk supabase db lint`
  - Expected: no fatal findings. Existing unused-parameter warnings may remain if not addressed by this chunk.

- Run: `npm run lint`
  - Expected: ESLint exits successfully.

- Run: `npm run build`
  - Expected: TypeScript and Vite build pass. Existing Vite chunk-size warning is acceptable.

- Optional Edge Function smoke with local JWTs:

```bash
curl -i \
  -H 'Origin: http://localhost:5173' \
  -H 'Authorization: Bearer <non-member-user-jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"product_key":"eden","action":"list_user"}' \
  http://127.0.0.1:54321/functions/v1/classes
```

Expected: response contains public classes only; no `visibility":"members_only"` rows.

## Acceptance Criteria Covered

- RLS prevents cross-user membership grant access.
- Frontends use Edge Functions rather than direct RPC/table access.
- Member-only class discovery is restricted to active members.
- Product API and RLS defense-in-depth agree.

## Risks And Rollback

- Tightened RLS can reveal Edge Functions that accidentally depend on authenticated table grants. This chunk's Edge Function uses service-role server access, so listing should continue to work.
- If class listing breaks, rollback by reverting the new migration and `classes/index.ts` change before dependent chunks execute.

## Non-Goals

- Ledger cancellation audit changes.
- Manager promotion behavior.
- Generated schedule/class foreign-key integrity.
- UI redesign.

## Type And Name Consistency

Use `Member` only for an active membership grant, keep `members_only` as the class visibility value, and do not introduce direct frontend table/RPC calls.
