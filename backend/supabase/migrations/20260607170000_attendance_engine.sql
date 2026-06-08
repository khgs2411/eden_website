create table public.class_participants (
	id uuid primary key default gen_random_uuid(),
	product_id uuid not null references public.products(id) on delete cascade,
	class_id uuid not null references public.classes(id) on delete cascade,
	participant_kind text not null check (participant_kind in ('registered', 'walk_in', 'trial')),
	user_id uuid references auth.users(id) on delete set null,
	registration_id uuid,
	trial_name text,
	trial_contact text,
	attendance_status text not null default 'absent' check (attendance_status in ('present', 'absent')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	check (
		(participant_kind = 'registered' and user_id is not null and registration_id is not null and trial_name is null and trial_contact is null)
		or (participant_kind = 'walk_in' and user_id is not null and registration_id is null and trial_name is null and trial_contact is null)
		or (participant_kind = 'trial' and user_id is null and registration_id is null and trial_name is not null)
	),
	foreign key (product_id, user_id) references public.product_users(product_id, user_id) on delete cascade
);

alter table public.class_registrations
	add constraint class_registrations_identity_unique unique (id, product_id, class_id, user_id);

alter table public.class_participants
	add constraint class_participants_registration_identity_fk
	foreign key (registration_id, product_id, class_id, user_id)
	references public.class_registrations(id, product_id, class_id, user_id)
	on delete cascade;

create unique index class_participants_registered_registration_idx
on public.class_participants(registration_id)
where participant_kind = 'registered';

create unique index class_participants_product_user_idx
on public.class_participants(class_id, user_id)
where participant_kind in ('registered', 'walk_in');

create index class_participants_class_idx on public.class_participants(product_id, class_id, participant_kind);

create trigger class_participants_touch_updated_at
before update on public.class_participants
for each row execute function private.touch_updated_at();

create or replace function public.start_class_attendance(
	p_product_id uuid,
	p_class_id uuid,
	p_default_attendance_status text default 'absent'
)
returns public.classes
language plpgsql
security definer
set search_path = public, private
as $$
declare
	v_class public.classes;
begin
	if p_default_attendance_status not in ('present', 'absent') then
		raise exception 'unsupported_attendance_status';
	end if;

	select *
	into v_class
	from public.classes
	where id = p_class_id
		and product_id = p_product_id
	for update;

	if not found then
		raise exception 'class_not_found';
	end if;

	if v_class.lifecycle_status in ('cancelled', 'completed') then
		raise exception 'class_lifecycle_not_startable';
	end if;

	if v_class.status <> 'published' then
		raise exception 'class_not_published';
	end if;

	if v_class.lifecycle_status = 'created' then
		update public.classes
		set lifecycle_status = 'in_progress'
		where id = v_class.id
		returning * into v_class;
	elsif v_class.lifecycle_status <> 'in_progress' then
		raise exception 'class_lifecycle_not_startable';
	end if;

	insert into public.class_participants (
		product_id,
		class_id,
		participant_kind,
		user_id,
		registration_id,
		attendance_status
	)
	select
		r.product_id,
		r.class_id,
		'registered',
		r.user_id,
		r.id,
		p_default_attendance_status
	from public.class_registrations r
	where r.product_id = p_product_id
		and r.class_id = p_class_id
		and r.status = 'approved'
	on conflict (registration_id) where participant_kind = 'registered'
	do update set attendance_status = excluded.attendance_status;

	return v_class;
end;
$$;

create or replace function public.update_class_participant_attendance(
	p_product_id uuid,
	p_participant_id uuid,
	p_attendance_status text
)
returns public.class_participants
language plpgsql
security definer
set search_path = public, private
as $$
declare
	v_participant public.class_participants;
	v_class public.classes;
begin
	if p_attendance_status not in ('present', 'absent') then
		raise exception 'unsupported_attendance_status';
	end if;

	select *
	into v_participant
	from public.class_participants
	where id = p_participant_id
		and product_id = p_product_id
	for update;

	if not found then
		raise exception 'participant_not_found';
	end if;

	select *
	into v_class
	from public.classes
	where id = v_participant.class_id
		and product_id = p_product_id;

	if not found then
		raise exception 'class_not_found';
	end if;

	if v_class.lifecycle_status not in ('in_progress', 'completed') then
		raise exception 'class_attendance_not_started';
	end if;

	update public.class_participants
	set attendance_status = p_attendance_status
	where id = v_participant.id
	returning * into v_participant;

	return v_participant;
end;
$$;

create or replace function public.add_class_walk_in(
	p_product_id uuid,
	p_class_id uuid,
	p_user_id uuid,
	p_attendance_status text default 'present'
)
returns public.class_participants
language plpgsql
security definer
set search_path = public, private
as $$
declare
	v_class public.classes;
	v_participant public.class_participants;
begin
	if p_attendance_status not in ('present', 'absent') then
		raise exception 'unsupported_attendance_status';
	end if;

	select *
	into v_class
	from public.classes
	where id = p_class_id
		and product_id = p_product_id
	for update;

	if not found then
		raise exception 'class_not_found';
	end if;

	if v_class.lifecycle_status <> 'in_progress' then
		raise exception 'class_attendance_not_started';
	end if;

	if not exists (
		select 1
		from public.product_users
		where product_id = p_product_id
			and user_id = p_user_id
			and status = 'active'
	) then
		raise exception 'product_user_not_found';
	end if;

	if exists (
		select 1
		from public.class_registrations
		where product_id = p_product_id
			and class_id = p_class_id
			and user_id = p_user_id
			and status in ('pending', 'approved')
	) then
		raise exception 'walk_in_has_live_registration';
	end if;

	insert into public.class_participants (
		product_id,
		class_id,
		participant_kind,
		user_id,
		attendance_status
	)
	values (
		p_product_id,
		p_class_id,
		'walk_in',
		p_user_id,
		p_attendance_status
	)
	returning * into v_participant;

	return v_participant;
exception
	when unique_violation then
		raise exception 'participant_already_exists';
end;
$$;

create or replace function public.add_class_trial_participant(
	p_product_id uuid,
	p_class_id uuid,
	p_trial_name text,
	p_trial_contact text default null
)
returns public.class_participants
language plpgsql
security definer
set search_path = public, private
as $$
declare
	v_class public.classes;
	v_participant public.class_participants;
begin
	if nullif(btrim(p_trial_name), '') is null then
		raise exception 'trial_name_required';
	end if;

	select *
	into v_class
	from public.classes
	where id = p_class_id
		and product_id = p_product_id
	for update;

	if not found then
		raise exception 'class_not_found';
	end if;

	if v_class.lifecycle_status <> 'in_progress' then
		raise exception 'class_attendance_not_started';
	end if;

	insert into public.class_participants (
		product_id,
		class_id,
		participant_kind,
		trial_name,
		trial_contact,
		attendance_status
	)
	values (
		p_product_id,
		p_class_id,
		'trial',
		btrim(p_trial_name),
		nullif(btrim(p_trial_contact), ''),
		'present'
	)
	returning * into v_participant;

	return v_participant;
end;
$$;

create or replace function public.complete_class_attendance(
	p_product_id uuid,
	p_class_id uuid
)
returns public.classes
language plpgsql
security definer
set search_path = public, private
as $$
declare
	v_class public.classes;
begin
	select *
	into v_class
	from public.classes
	where id = p_class_id
		and product_id = p_product_id
	for update;

	if not found then
		raise exception 'class_not_found';
	end if;

	if v_class.lifecycle_status <> 'in_progress' then
		raise exception 'class_lifecycle_not_completable';
	end if;

	update public.classes
	set lifecycle_status = 'completed'
	where id = v_class.id
	returning * into v_class;

	return v_class;
end;
$$;

alter table public.class_participants enable row level security;

grant select on public.class_participants to authenticated;
grant select, insert, update on public.class_participants to service_role;
revoke all on function public.start_class_attendance(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.update_class_participant_attendance(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.add_class_walk_in(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.add_class_trial_participant(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.complete_class_attendance(uuid, uuid) from public, anon, authenticated;
grant execute on function public.start_class_attendance(uuid, uuid, text) to service_role;
grant execute on function public.update_class_participant_attendance(uuid, uuid, text) to service_role;
grant execute on function public.add_class_walk_in(uuid, uuid, uuid, text) to service_role;
grant execute on function public.add_class_trial_participant(uuid, uuid, text, text) to service_role;
grant execute on function public.complete_class_attendance(uuid, uuid) to service_role;

create policy class_participants_self_or_manager_read
on public.class_participants for select
to authenticated
using (
	user_id = auth.uid()
	or private.has_product_role(product_id, array['manager'])
	or private.is_platform_admin()
);
