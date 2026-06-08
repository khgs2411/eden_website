create unique index if not exists product_allowed_origins_origin_unique_idx
on public.product_allowed_origins(origin);

create or replace function public.resolve_product_by_origin(p_origin text)
returns table(product_id uuid, product_key text, name text)
language sql
stable
security definer
set search_path = public
as $$
	select p.id, p.product_key, p.name
	from public.products p
	join public.product_allowed_origins o on o.product_id = p.id
	where p.status = 'active'
		and o.origin = p_origin;
$$;

revoke all on function public.resolve_product_by_origin(text) from public, anon, authenticated;
grant execute on function public.resolve_product_by_origin(text) to service_role;
