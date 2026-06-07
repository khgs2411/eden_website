insert into public.products (product_key, name)
values ('eden', 'Eden Dance')
on conflict (product_key) do nothing;

insert into public.product_allowed_origins (product_id, origin, environment)
select id, 'http://localhost:5173', 'development'
from public.products
where product_key = 'eden'
on conflict do nothing;

insert into public.product_allowed_origins (product_id, origin, environment)
select id, 'http://127.0.0.1:5173', 'development'
from public.products
where product_key = 'eden'
on conflict do nothing;

-- After creating a local auth user, promote the platform admin manually:
-- insert into public.platform_admins (user_id) values ('<local-auth-user-uuid>');
