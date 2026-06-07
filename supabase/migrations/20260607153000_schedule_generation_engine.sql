alter table public.classes
	add constraint classes_generated_unique
	unique (product_id, schedule_id, generated_for_date, starts_at);

create or replace function public.generate_schedule_classes(p_product_id uuid, p_schedule_id uuid default null)
returns table(created_count integer, existing_count integer, skipped_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
	v_horizon_weeks integer;
begin
	select coalesce(generation_horizon_weeks, 8)
		into v_horizon_weeks
	from public.products
	where id = p_product_id
		and status = 'active';

	if v_horizon_weeks is null then
		raise exception 'product_not_found';
	end if;

	if p_schedule_id is not null and not exists (
		select 1
		from public.schedules s
		where s.id = p_schedule_id
			and s.product_id = p_product_id
	) then
		raise exception 'schedule_not_found';
	end if;

	return query
	with active_schedules as (
		select
			s.*,
			t.name as template_name,
			t.description,
			t.category,
			t.default_capacity,
			t.default_location,
			t.default_visibility,
			t.default_registration_policy,
			t.default_membership_requirement,
			t.default_notes,
			t.custom_defaults
		from public.schedules s
		join public.class_templates t on t.id = s.template_id and t.product_id = s.product_id
		where s.product_id = p_product_id
			and s.status = 'active'
			and (p_schedule_id is null or s.id = p_schedule_id)
			and t.status = 'active'
	),
	candidate_dates as (
		select active_schedules.*, d::date as class_date
		from active_schedules
		cross join lateral generate_series(
			greatest(active_schedules.starts_on, current_date),
			least(
				coalesce(active_schedules.ends_on, (current_date + (v_horizon_weeks || ' weeks')::interval)::date),
				(current_date + (v_horizon_weeks || ' weeks')::interval)::date
			),
			interval '1 day'
		) d
		where (
			active_schedules.recurrence_type = 'one_time'
			and d::date = active_schedules.starts_on
		) or (
			active_schedules.recurrence_type = 'weekly'
			and extract(dow from d)::integer = any(active_schedules.weekdays)
		)
	),
	filtered_dates as (
		select cd.*
		from candidate_dates cd
		where not exists (
			select 1
			from public.schedule_skips ss
			where ss.product_id = cd.product_id
				and ss.schedule_id = cd.id
				and ss.skip_date = cd.class_date
		)
	),
	skipped as (
		select count(*)::integer as count
		from candidate_dates cd
		where exists (
			select 1
			from public.schedule_skips ss
			where ss.product_id = cd.product_id
				and ss.schedule_id = cd.id
				and ss.skip_date = cd.class_date
		)
	),
	resolved_dates as (
		select
			fd.*,
			((fd.class_date::text || ' ' || fd.start_time::text)::timestamp at time zone fd.timezone) as resolved_starts_at,
			(((fd.class_date::text || ' ' || fd.start_time::text)::timestamp + (fd.duration_minutes || ' minutes')::interval) at time zone fd.timezone) as resolved_ends_at
		from filtered_dates fd
	),
	existing_before as (
		select count(*)::integer as count
		from resolved_dates rd
		join public.classes c
			on c.product_id = rd.product_id
			and c.schedule_id = rd.id
			and c.generated_for_date = rd.class_date
			and c.starts_at = rd.resolved_starts_at
	),
	inserted as (
		insert into public.classes (
			product_id,
			template_id,
			schedule_id,
			generated_for_date,
			source_timezone,
			name,
			description,
			category,
			starts_at,
			ends_at,
			capacity,
			location,
			status,
			lifecycle_status,
			visibility,
			registration_policy,
			membership_requirement,
			notes,
			custom_data
		)
		select
			rd.product_id,
			rd.template_id,
			rd.id,
			rd.class_date,
			rd.timezone,
			rd.template_name,
			rd.description,
			rd.category,
			rd.resolved_starts_at,
			rd.resolved_ends_at,
			rd.default_capacity,
			rd.default_location,
			'published',
			'created',
			rd.default_visibility,
			rd.default_registration_policy,
			rd.default_membership_requirement,
			rd.default_notes,
			rd.custom_defaults
		from resolved_dates rd
		on conflict on constraint classes_generated_unique do nothing
		returning 1
	)
	select
		coalesce((select count(*)::integer from inserted), 0),
		coalesce((select count from existing_before), 0),
		coalesce((select count from skipped), 0);
end;
$$;

revoke all on function public.generate_schedule_classes(uuid, uuid) from public, anon, authenticated;
grant execute on function public.generate_schedule_classes(uuid, uuid) to service_role;
