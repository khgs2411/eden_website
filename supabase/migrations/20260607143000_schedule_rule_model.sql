alter table public.class_templates
	add constraint class_templates_id_product_unique unique (id, product_id);

create table public.schedules (
	id uuid primary key default gen_random_uuid(),
	product_id uuid not null references public.products(id) on delete cascade,
	template_id uuid not null,
	name text not null,
	status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
	recurrence_type text not null check (recurrence_type in ('one_time', 'weekly')),
	weekdays integer[] not null default '{}'::integer[],
	starts_on date not null,
	ends_on date,
	start_time time not null,
	duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 1440),
	timezone text not null check (length(trim(timezone)) > 0),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (id, product_id),
	foreign key (template_id, product_id) references public.class_templates(id, product_id) on delete restrict,
	check (ends_on is null or ends_on >= starts_on),
	check (
		(recurrence_type = 'one_time' and cardinality(weekdays) = 0 and ends_on is null)
		or (
			recurrence_type = 'weekly'
			and cardinality(weekdays) > 0
			and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]
		)
	)
);

create table public.schedule_skips (
	id uuid primary key default gen_random_uuid(),
	product_id uuid not null references public.products(id) on delete cascade,
	schedule_id uuid not null,
	skip_date date not null,
	reason text,
	created_at timestamptz not null default now(),
	unique (schedule_id, skip_date),
	foreign key (schedule_id, product_id) references public.schedules(id, product_id) on delete cascade
);

create index schedules_product_status_idx on public.schedules(product_id, status);
create index schedules_template_idx on public.schedules(template_id);
create index schedule_skips_product_schedule_idx on public.schedule_skips(product_id, schedule_id);

create trigger schedules_touch_updated_at
before update on public.schedules
for each row execute function private.touch_updated_at();

alter table public.schedules enable row level security;
alter table public.schedule_skips enable row level security;

grant select, insert, update on public.schedules to service_role;
grant select, insert, update, delete on public.schedule_skips to service_role;
grant select on public.schedules to authenticated;
grant select on public.schedule_skips to authenticated;

create policy schedules_manager_read
on public.schedules for select
to authenticated
using (
	private.has_product_role(product_id, array['manager'])
	or private.is_platform_admin()
);

create policy schedule_skips_manager_read
on public.schedule_skips for select
to authenticated
using (
	private.has_product_role(product_id, array['manager'])
	or private.is_platform_admin()
);
