do $$
declare
	v_invalid_ids uuid[];
begin
	select array_agg(c.id order by c.id)
	into v_invalid_ids
	from public.classes c
	left join public.schedules s
		on s.id = c.schedule_id
		and s.product_id = c.product_id
	where c.schedule_id is not null
		and s.id is null;

	if coalesce(array_length(v_invalid_ids, 1), 0) > 0 then
		raise exception 'Invalid generated class schedule references: %', v_invalid_ids;
	end if;

	select array_agg(c.id order by c.id)
	into v_invalid_ids
	from public.classes c
	join public.schedules s
		on s.id = c.schedule_id
		and s.product_id = c.product_id
	where c.schedule_id is not null
		and c.template_id is distinct from s.template_id;

	if coalesce(array_length(v_invalid_ids, 1), 0) > 0 then
		raise exception 'Generated class template_id does not match source schedule: %', v_invalid_ids;
	end if;

	select array_agg(c.id order by c.id)
	into v_invalid_ids
	from public.classes c
	left join public.class_templates t
		on t.id = c.template_id
		and t.product_id = c.product_id
	where c.template_id is not null
		and t.id is null;

	if coalesce(array_length(v_invalid_ids, 1), 0) > 0 then
		raise exception 'Class template_id references a template outside the class product: %', v_invalid_ids;
	end if;

	select array_agg(id order by id)
	into v_invalid_ids
	from public.classes
	where not (
		(schedule_id is null and generated_for_date is null and source_timezone is null)
		or (schedule_id is not null and template_id is not null and generated_for_date is not null and source_timezone is not null)
	);

	if coalesce(array_length(v_invalid_ids, 1), 0) > 0 then
		raise exception 'Generated class source fields are incomplete: %', v_invalid_ids;
	end if;
end $$;

alter table public.classes
	drop constraint if exists classes_template_id_fkey;

alter table public.classes
	add constraint classes_template_product_fk
	foreign key (template_id, product_id)
	references public.class_templates(id, product_id)
	on delete set null (template_id);

alter table public.schedules
	add constraint schedules_id_template_product_unique
	unique (id, template_id, product_id);

alter table public.classes
	add constraint classes_schedule_product_fk
	foreign key (schedule_id, product_id)
	references public.schedules(id, product_id)
	on delete restrict;

alter table public.classes
	add constraint classes_generated_schedule_template_fk
	foreign key (schedule_id, template_id, product_id)
	references public.schedules(id, template_id, product_id)
	on delete restrict;

alter table public.classes
	add constraint classes_generated_source_consistency
	check (
		(schedule_id is null and generated_for_date is null and source_timezone is null)
		or (schedule_id is not null and template_id is not null and generated_for_date is not null and source_timezone is not null)
	);
