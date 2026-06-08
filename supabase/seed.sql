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

insert into auth.users (
	instance_id,
	id,
	aud,
	role,
	email,
	encrypted_password,
	email_confirmed_at,
	confirmation_token,
	recovery_token,
	email_change_token_new,
	email_change,
	raw_app_meta_data,
	raw_user_meta_data,
	is_super_admin,
	phone,
	phone_change,
	phone_change_token,
	email_change_token_current,
	email_change_confirm_status,
	reauthentication_token,
	is_sso_user,
	is_anonymous,
	created_at,
	updated_at
)
values
	(
		'00000000-0000-0000-0000-000000000000',
		'00000000-0000-0000-0000-000000000001',
		'authenticated',
		'authenticated',
		'admin@admin.local',
		crypt('password', gen_salt('bf')),
		now(),
		'',
		'',
		'',
		'',
		'{"provider":"email","providers":["email"]}'::jsonb,
		'{"display_name":"Local Admin"}'::jsonb,
		false,
		null,
		'',
		'',
		'',
		0,
		'',
		false,
		false,
		now(),
		now()
	),
	(
		'00000000-0000-0000-0000-000000000000',
		'00000000-0000-0000-0000-000000000002',
		'authenticated',
		'authenticated',
		'eden@manager.local',
		crypt('password', gen_salt('bf')),
		now(),
		'',
		'',
		'',
		'',
		'{"provider":"email","providers":["email"]}'::jsonb,
		'{"display_name":"Eden Manager"}'::jsonb,
		false,
		null,
		'',
		'',
		'',
		0,
		'',
		false,
		false,
		now(),
		now()
	)
on conflict (id) do update
set
	email = excluded.email,
	encrypted_password = excluded.encrypted_password,
	email_confirmed_at = excluded.email_confirmed_at,
	confirmation_token = excluded.confirmation_token,
	recovery_token = excluded.recovery_token,
	email_change_token_new = excluded.email_change_token_new,
	email_change = excluded.email_change,
	raw_app_meta_data = excluded.raw_app_meta_data,
	raw_user_meta_data = excluded.raw_user_meta_data,
	is_super_admin = excluded.is_super_admin,
	phone = excluded.phone,
	phone_change = excluded.phone_change,
	phone_change_token = excluded.phone_change_token,
	email_change_token_current = excluded.email_change_token_current,
	email_change_confirm_status = excluded.email_change_confirm_status,
	reauthentication_token = excluded.reauthentication_token,
	is_sso_user = excluded.is_sso_user,
	is_anonymous = excluded.is_anonymous,
	updated_at = excluded.updated_at;

insert into auth.identities (
	id,
	provider_id,
	user_id,
	identity_data,
	provider,
	last_sign_in_at,
	created_at,
	updated_at
)
values
	(
		'10000000-0000-0000-0000-000000000001',
		'00000000-0000-0000-0000-000000000001',
		'00000000-0000-0000-0000-000000000001',
		'{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@admin.local","email_verified":true}'::jsonb,
		'email',
		now(),
		now(),
		now()
	),
	(
		'10000000-0000-0000-0000-000000000002',
		'00000000-0000-0000-0000-000000000002',
		'00000000-0000-0000-0000-000000000002',
		'{"sub":"00000000-0000-0000-0000-000000000002","email":"eden@manager.local","email_verified":true}'::jsonb,
		'email',
		now(),
		now(),
		now()
	)
on conflict (provider_id, provider) do update
set
	user_id = excluded.user_id,
	identity_data = excluded.identity_data,
	updated_at = excluded.updated_at;

insert into public.profiles (user_id, display_name)
values
	('00000000-0000-0000-0000-000000000001', 'Local Admin'),
	('00000000-0000-0000-0000-000000000002', 'Eden Manager')
on conflict (user_id) do update
set
	display_name = excluded.display_name,
	updated_at = now();

insert into public.platform_admins (user_id)
values ('00000000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into public.product_users (product_id, user_id, role, status)
select id, '00000000-0000-0000-0000-000000000002', 'manager', 'active'
from public.products
where product_key = 'eden'
on conflict (product_id, user_id) do update
set
	role = 'manager',
	status = 'active',
	updated_at = now();
