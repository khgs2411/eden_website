-- Concrete class table naming is fixed as public.classes for domain clarity.
-- Schedules and templates are source references; users register for concrete classes only.

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = private, public
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

create table public.class_templates (
	id uuid primary key default gen_random_uuid(),
	product_id uuid not null references public.products(id) on delete cascade,
	name text not null,
	description text,
	category text,
	default_capacity integer not null check (default_capacity > 0),
	default_location text,
	default_visibility text not null default 'public' check (default_visibility in ('public', 'hidden', 'members_only')),
	default_registration_policy text not null default 'member_auto_approve' check (default_registration_policy in ('auto_approve', 'member_auto_approve', 'approval_required')),
	default_membership_requirement text not null default 'none' check (default_membership_requirement in ('none', 'required')),
	default_notes text,
	custom_fields jsonb not null default '[]'::jsonb,
	custom_defaults jsonb not null default '{}'::jsonb,
	status text not null default 'active' check (status in ('active', 'inactive')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	check (jsonb_typeof(custom_fields) = 'array'),
	check (jsonb_typeof(custom_defaults) = 'object')
);

create table public.classes (
	id uuid primary key default gen_random_uuid(),
	product_id uuid not null references public.products(id) on delete cascade,
	template_id uuid references public.class_templates(id) on delete set null,
	schedule_id uuid,
	generated_for_date date,
	source_timezone text,
	name text not null,
	description text,
	category text,
	starts_at timestamptz not null,
	ends_at timestamptz not null,
	capacity integer not null check (capacity > 0),
	location text,
	status text not null default 'draft' check (status in ('draft', 'published')),
	lifecycle_status text not null default 'created' check (lifecycle_status in ('created', 'cancelled', 'in_progress', 'completed')),
	visibility text not null default 'public' check (visibility in ('public', 'hidden', 'members_only')),
	registration_policy text not null default 'member_auto_approve' check (registration_policy in ('auto_approve', 'member_auto_approve', 'approval_required')),
	membership_requirement text not null default 'none' check (membership_requirement in ('none', 'required')),
	notes text,
	custom_data jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	check (ends_at > starts_at),
	check (jsonb_typeof(custom_data) = 'object')
);

create index class_templates_product_idx on public.class_templates(product_id);
create index class_templates_product_status_idx on public.class_templates(product_id, status);
create index classes_product_starts_idx on public.classes(product_id, starts_at);
create index classes_template_idx on public.classes(template_id);
create index classes_schedule_idx on public.classes(schedule_id);
create index classes_public_listing_idx on public.classes(product_id, starts_at)
where status = 'published' and lifecycle_status = 'created';

create trigger class_templates_touch_updated_at
before update on public.class_templates
for each row execute function private.touch_updated_at();

create trigger classes_touch_updated_at
before update on public.classes
for each row execute function private.touch_updated_at();

alter table public.class_templates enable row level security;
alter table public.classes enable row level security;

grant select on public.class_templates to authenticated;
grant select on public.classes to anon, authenticated;
grant select, insert, update on public.class_templates to service_role;
grant select, insert, update on public.classes to service_role;

create policy class_templates_manager_read
on public.class_templates for select
to authenticated
using (
	private.has_product_role(product_id, array['manager'])
	or private.is_platform_admin()
);

create policy classes_public_read
on public.classes for select
to anon, authenticated
using (
	status = 'published'
	and lifecycle_status = 'created'
	and visibility = 'public'
);

create policy classes_product_user_read
on public.classes for select
to authenticated
using (
	status = 'published'
	and lifecycle_status = 'created'
	and visibility in ('public', 'members_only')
	and private.has_product_role(product_id, array['manager', 'user'])
);

create policy classes_manager_read
on public.classes for select
to authenticated
using (
	private.has_product_role(product_id, array['manager'])
	or private.is_platform_admin()
);

revoke all on function private.touch_updated_at() from public, anon, authenticated;
