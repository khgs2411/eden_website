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
