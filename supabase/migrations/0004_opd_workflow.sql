-- ============================================================================
-- 0004_opd_workflow.sql — queue, consultation and lab automation
--
-- Clients cannot write a visit's status (0005 withholds the column). Every
-- move goes through a function here, and a trigger checks each move against
-- the state machine whatever path it came by:
--
--   waiting ─────────► in_consultation ─► awaiting_lab ─► ready_for_review
--      │   ◄─ release ──┘      │                                │
--      │                       └──────► completed ◄── (re-enter) ┘
--      └─► cancelled / no_show
--
-- What the client calls:
--   call_next_patient()      physician — FIFO pick, returning lab patients first
--   release_patient(visit)   physician — back to the queue, original place kept
--   order_labs(visit, tests) physician — creates the order, sends patient to lab
--   complete_visit(visit)    physician — finalizes the note, closes the visit
--   cancel_visit(visit, …)   OPD staff — cancelled or no-show
--   opd_dashboard_stats()    monitoring numbers in one round trip
--
-- What happens on its own:
--   visit insert             queue number assigned, 'registered' event logged
--   lab item completed       order status recomputed; when a visit's last open
--                            order closes, the visit goes to ready_for_review
--                            and reappears in its physician's queue
-- ============================================================================

-- ---------------------------------------------------------------------------
-- updated_at bookkeeping (touch_updated_at comes from 0001)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'patients', 'physicians', 'visits', 'consultations', 'lab_test_types',
    'lab_orders', 'lab_order_items', 'lab_result_values'
  ] loop
    execute format('drop trigger if exists %1$s_touch_updated_at on public.%1$s', t);
    execute format(
      'create trigger %1$s_touch_updated_at before update on public.%1$s
         for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- physicians: stamp duty changes
-- ---------------------------------------------------------------------------
create or replace function public.physicians_stamp_duty()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.duty_changed_at := now();
  elsif new.duty_status is distinct from old.duty_status then
    new.duty_changed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists physicians_stamp_duty on public.physicians;
create trigger physicians_stamp_duty
  before insert or update on public.physicians
  for each row execute function public.physicians_stamp_duty();

-- ---------------------------------------------------------------------------
-- visits: enqueue on insert
-- ---------------------------------------------------------------------------
create or replace function public.visits_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.status := 'waiting';
  new.physician_id := null;
  new.queued_at := now();
  new.status_changed_at := now();
  new.visit_date := coalesce(new.visit_date, public.opd_today());

  -- Serialize ticket numbering per day so two desks never hand out the same one.
  perform pg_advisory_xact_lock(hashtext('opd_queue_' || new.visit_date::text));
  select coalesce(max(queue_number), 0) + 1
    into new.queue_number
    from public.visits
   where visit_date = new.visit_date;

  return new;
end;
$$;

drop trigger if exists visits_before_insert on public.visits;
create trigger visits_before_insert
  before insert on public.visits
  for each row execute function public.visits_before_insert();

-- ---------------------------------------------------------------------------
-- visits: the state machine
-- ---------------------------------------------------------------------------
create or replace function public.visits_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Closed visits are history. The SQL editor (no JWT) may still correct them.
  if old.status in ('completed', 'cancelled', 'no_show') and auth.uid() is not null then
    raise exception 'This visit is closed and can no longer be changed.' using errcode = '42501';
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if not (
       (old.status = 'waiting'          and new.status in ('in_consultation', 'cancelled', 'no_show'))
    or (old.status = 'in_consultation'  and new.status in ('awaiting_lab', 'completed', 'waiting', 'cancelled'))
    or (old.status = 'awaiting_lab'     and new.status in ('ready_for_review', 'cancelled'))
    or (old.status = 'ready_for_review' and new.status in ('in_consultation', 'cancelled'))
  ) then
    raise exception 'A visit cannot go from % to %.', old.status, new.status using errcode = '22023';
  end if;

  new.status_changed_at := now();

  case new.status
    when 'in_consultation' then
      new.called_at := coalesce(new.called_at, now());
    when 'waiting' then
      new.physician_id := null;          -- released; queued_at is kept
    when 'awaiting_lab' then
      new.lab_requested_at := now();
    when 'ready_for_review' then
      new.results_ready_at := now();
    when 'completed' then
      new.completed_at := now();
    when 'cancelled', 'no_show' then
      new.cancelled_at := now();
    else null;
  end case;

  return new;
end;
$$;

drop trigger if exists visits_before_update on public.visits;
create trigger visits_before_update
  before update on public.visits
  for each row execute function public.visits_before_update();

-- ---------------------------------------------------------------------------
-- visits: activity feed
-- ---------------------------------------------------------------------------
create or replace function public.visits_log_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_name text;
begin
  if tg_op = 'INSERT' then
    insert into public.visit_events (visit_id, patient_id, event, to_status, details)
    values (new.id, new.patient_id, 'registered', new.status,
            jsonb_build_object('queue_number', new.queue_number, 'is_priority', new.is_priority));
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  event_name := case
    when new.status = 'in_consultation' and old.status = 'ready_for_review' then 'resumed'
    when new.status = 'in_consultation' then 'called'
    when new.status = 'waiting'         then 'returned_to_queue'
    when new.status = 'awaiting_lab'    then 'sent_to_lab'
    when new.status = 'ready_for_review' then 'results_ready'
    else new.status::text               -- completed, cancelled, no_show
  end;

  insert into public.visit_events (visit_id, patient_id, event, from_status, to_status, details)
  values (new.id, new.patient_id, event_name, old.status, new.status,
          jsonb_strip_nulls(jsonb_build_object(
            'physician_id', new.physician_id,
            'cancel_reason', new.cancel_reason)));

  return new;
end;
$$;

drop trigger if exists visits_log_event on public.visits;
create trigger visits_log_event
  after insert or update on public.visits
  for each row execute function public.visits_log_event();

-- ---------------------------------------------------------------------------
-- consultations: read-only once finalized
-- ---------------------------------------------------------------------------
create or replace function public.consultations_lock_finalized()
returns trigger
language plpgsql
as $$
begin
  if old.finalized_at is not null and auth.uid() is not null then
    raise exception 'This consultation is finalized and can no longer be edited.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists consultations_lock_finalized on public.consultations;
create trigger consultations_lock_finalized
  before update on public.consultations
  for each row execute function public.consultations_lock_finalized();

-- ---------------------------------------------------------------------------
-- lab_order_items: legal moves, who may make them, and timestamps
-- ---------------------------------------------------------------------------
create or replace function public.lab_items_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then
    if old.status in ('completed', 'cancelled') and auth.uid() is not null then
      raise exception 'This test is closed and can no longer be changed.' using errcode = '42501';
    end if;
    return new;
  end if;

  if not (
       (old.status = 'requested'          and new.status in ('specimen_collected', 'in_progress', 'completed', 'cancelled'))
    or (old.status = 'specimen_collected' and new.status in ('in_progress', 'completed', 'cancelled'))
    or (old.status = 'in_progress'        and new.status in ('completed', 'cancelled'))
  ) then
    raise exception 'A test cannot go from % to %.', old.status, new.status using errcode = '22023';
  end if;

  -- The ordering physician may cancel; only the lab moves a test forward.
  -- (Internal callers such as cancel_visit run without this restriction.)
  if new.status <> 'cancelled' and auth.uid() is not null
     and not public.has_permission('lab.process') then
    raise exception 'Only the laboratory can process tests.' using errcode = '42501';
  end if;

  if new.status = 'completed'
     and not exists (select 1 from public.lab_result_values where item_id = new.id) then
    raise exception 'Enter at least one result before completing the test.' using errcode = '22023';
  end if;

  if new.status in ('specimen_collected', 'in_progress', 'completed') and new.collected_at is null then
    new.collected_at := now();
    new.collected_by := auth.uid();
  end if;
  if new.status in ('in_progress', 'completed') and new.started_at is null then
    new.started_at := now();
  end if;
  if new.status = 'completed' then
    new.completed_at := now();
    new.performed_by := auth.uid();
  end if;
  if new.status = 'cancelled' then
    new.cancelled_at := now();
    new.cancelled_by := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists lab_items_before_update on public.lab_order_items;
create trigger lab_items_before_update
  before update on public.lab_order_items
  for each row execute function public.lab_items_before_update();

-- ---------------------------------------------------------------------------
-- lab_order_items → lab_orders → visits: routing results back
-- ---------------------------------------------------------------------------
create or replace function public.lab_items_route_results()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.lab_orders;
  next_status  public.lab_order_status;
begin
  select * into target_order from public.lab_orders where id = new.order_id for update;

  select case
    when bool_and(i.status = 'cancelled')                   then 'cancelled'
    when bool_and(i.status in ('completed', 'cancelled'))   then 'completed'
    when bool_or(i.status <> 'requested')                   then 'in_progress'
    else 'requested'
  end::public.lab_order_status
    into next_status
    from public.lab_order_items i
   where i.order_id = new.order_id;

  if next_status is not distinct from target_order.status then
    return new;
  end if;

  update public.lab_orders
     set status = next_status,
         completed_at = case when next_status = 'completed' then now() else completed_at end
   where id = target_order.id;

  if next_status in ('completed', 'cancelled') then
    if next_status = 'completed' then
      insert into public.visit_events (visit_id, patient_id, event, details)
      values (target_order.visit_id, target_order.patient_id, 'lab_completed',
              jsonb_build_object('order_id', target_order.id, 'order_no', target_order.order_no));
    end if;

    -- Last open order for this visit closed: hand the patient back to their
    -- physician's queue.
    update public.visits v
       set status = 'ready_for_review'
     where v.id = target_order.visit_id
       and v.status = 'awaiting_lab'
       and not exists (
         select 1 from public.lab_orders o
          where o.visit_id = v.id and o.status in ('requested', 'in_progress')
       );
  end if;

  return new;
end;
$$;

drop trigger if exists lab_items_route_results on public.lab_order_items;
create trigger lab_items_route_results
  after update of status on public.lab_order_items
  for each row execute function public.lab_items_route_results();

-- ---------------------------------------------------------------------------
-- lab_result_values: snapshot the parameter, flag numbers, lock after release
-- ---------------------------------------------------------------------------
create or replace function public.lab_results_before_write()
returns trigger
language plpgsql
as $$
declare
  item_status public.lab_item_status;
  param       public.lab_test_parameters;
  numeric_value numeric;
begin
  if tg_op = 'DELETE' then
    select status into item_status from public.lab_order_items where id = old.item_id;
  else
    select status into item_status from public.lab_order_items where id = new.item_id;
  end if;

  if item_status in ('completed', 'cancelled') and auth.uid() is not null then
    raise exception 'Results of a closed test can no longer be changed.' using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  -- A corrected value gets re-flagged unless the tech set a flag in the same edit.
  if tg_op = 'UPDATE' and new.value is distinct from old.value
     and new.flag is not distinct from old.flag then
    new.flag := null;
  end if;

  if new.parameter_id is not null then
    select * into param from public.lab_test_parameters where id = new.parameter_id;
    new.parameter_name  := coalesce(nullif(trim(new.parameter_name), ''), param.name);
    new.unit            := coalesce(new.unit, param.unit);
    new.reference_range := coalesce(new.reference_range, param.reference_range);
    new.sort_order      := coalesce(nullif(new.sort_order, 0), param.sort_order);

    -- Auto-flag plain numbers against the range; the tech can override.
    if new.flag is null and trim(new.value) ~ '^-?[0-9]+(\.[0-9]+)?$' then
      numeric_value := trim(new.value)::numeric;
      new.flag := case
        when param.ref_low  is not null and numeric_value < param.ref_low  then 'low'
        when param.ref_high is not null and numeric_value > param.ref_high then 'high'
        when param.ref_low is not null or param.ref_high is not null       then 'normal'
      end::public.result_flag;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists lab_results_before_write on public.lab_result_values;
create trigger lab_results_before_write
  before insert or update or delete on public.lab_result_values
  for each row execute function public.lab_results_before_write();

-- ===========================================================================
-- Workflow functions
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- call_next_patient — the physician's "Next" button
--
-- Returns the visit now in consultation, or no rows when the queue is empty.
-- SKIP LOCKED lets two doctors press Next at the same moment and get two
-- different patients.
-- ---------------------------------------------------------------------------
create or replace function public.call_next_patient()
returns setof public.visits
language plpgsql
security definer
set search_path = public
as $$
declare
  me         uuid := auth.uid();
  next_id    uuid;
begin
  if not public.has_permission('queue.serve') then
    raise exception 'You do not have permission to serve patients.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.physicians where profile_id = me and duty_status = 'available') then
    raise exception 'Set yourself as available before calling a patient.' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.visits where physician_id = me and status = 'in_consultation') then
    raise exception 'Finish or release your current patient first.' using errcode = 'P0001';
  end if;

  -- Patients back from the lab are already this physician's and have waited
  -- once; they go ahead of new arrivals.
  select id into next_id
    from public.visits
   where physician_id = me and status = 'ready_for_review'
   order by results_ready_at
   limit 1
   for update skip locked;

  if next_id is null then
    select id into next_id
      from public.visits
     where status = 'waiting'
     order by is_priority desc, queued_at, queue_number
     limit 1
     for update skip locked;
  end if;

  if next_id is null then
    return;
  end if;

  update public.visits
     set status = 'in_consultation', physician_id = me
   where id = next_id;

  insert into public.consultations (visit_id, physician_id)
  values (next_id, me)
  on conflict (visit_id) do nothing;

  return query select * from public.visits where id = next_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- release_patient — send an unseen patient back, keeping their place
-- ---------------------------------------------------------------------------
create or replace function public.release_patient(p_visit_id uuid)
returns setof public.visits
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.visits
     set status = 'waiting'
   where id = p_visit_id
     and status = 'in_consultation'
     and physician_id = auth.uid()
     and called_at is not null
     and lab_requested_at is null;   -- a patient with lab history stays with their doctor

  if not found then
    raise exception 'Only your own patient, before any lab request, can be released.'
      using errcode = 'P0001';
  end if;

  return query select * from public.visits where id = p_visit_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- order_labs — request tests and send the patient to the laboratory
-- ---------------------------------------------------------------------------
create or replace function public.order_labs(
  p_visit_id       uuid,
  p_test_type_ids  uuid[],
  p_priority       public.lab_priority default 'routine',
  p_clinical_notes text default null
)
returns public.lab_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  target_visit public.visits;
  new_order    public.lab_orders;
begin
  if not public.has_permission('lab.order') then
    raise exception 'You do not have permission to order lab tests.' using errcode = '42501';
  end if;

  select * into target_visit from public.visits where id = p_visit_id for update;

  if target_visit.id is null
     or target_visit.status <> 'in_consultation'
     or target_visit.physician_id is distinct from auth.uid() then
    raise exception 'Labs can only be ordered for your patient currently in consultation.'
      using errcode = 'P0001';
  end if;

  if coalesce(array_length(p_test_type_ids, 1), 0) = 0 then
    raise exception 'Choose at least one test.' using errcode = '22023';
  end if;

  if exists (
    select 1 from unnest(p_test_type_ids) as t (id)
    where not exists (select 1 from public.lab_test_types l where l.id = t.id and l.is_active)
  ) then
    raise exception 'One of the selected tests is unavailable.' using errcode = '22023';
  end if;

  insert into public.lab_orders (visit_id, patient_id, ordered_by, priority, clinical_notes)
  values (target_visit.id, target_visit.patient_id, auth.uid(), p_priority,
          nullif(trim(p_clinical_notes), ''))
  returning * into new_order;

  insert into public.lab_order_items (order_id, test_type_id)
  select new_order.id, t.id
    from (select distinct unnest(p_test_type_ids) as id) t;

  update public.visits set status = 'awaiting_lab' where id = target_visit.id;

  return new_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- complete_visit — finalize the note and discharge from the OPD
-- ---------------------------------------------------------------------------
create or replace function public.complete_visit(p_visit_id uuid)
returns setof public.visits
language plpgsql
security definer
set search_path = public
as $$
declare
  target_visit public.visits;
begin
  if not public.has_permission('consultations.write') then
    raise exception 'You do not have permission to complete consultations.' using errcode = '42501';
  end if;

  select * into target_visit from public.visits where id = p_visit_id for update;

  if target_visit.id is null
     or target_visit.status <> 'in_consultation'
     or target_visit.physician_id is distinct from auth.uid() then
    raise exception 'Only your patient currently in consultation can be completed.'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.consultations
     where visit_id = p_visit_id and length(trim(coalesce(diagnosis, ''))) > 0
  ) then
    raise exception 'Record a diagnosis before completing the consultation.' using errcode = '22023';
  end if;

  update public.consultations set finalized_at = now() where visit_id = p_visit_id;
  update public.visits set status = 'completed' where id = p_visit_id;

  return query select * from public.visits where id = p_visit_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_visit — patient left, or never answered their number
-- ---------------------------------------------------------------------------
create or replace function public.cancel_visit(
  p_visit_id uuid,
  p_reason   text default null,
  p_no_show  boolean default false
)
returns setof public.visits
language plpgsql
security definer
set search_path = public
as $$
declare
  target_visit public.visits;
begin
  if not public.has_permission('queue.manage') then
    raise exception 'You do not have permission to cancel visits.' using errcode = '42501';
  end if;

  select * into target_visit from public.visits where id = p_visit_id for update;

  if target_visit.id is null then
    raise exception 'Visit not found.' using errcode = 'P0002';
  end if;
  if p_no_show and target_visit.status <> 'waiting' then
    raise exception 'Only a waiting patient can be marked as a no-show.' using errcode = 'P0001';
  end if;

  update public.visits
     set status = case when p_no_show then 'no_show' else 'cancelled' end::public.visit_status,
         cancel_reason = nullif(trim(p_reason), '')
   where id = p_visit_id;

  -- Visit first, so closing its orders below does not route it to review.
  update public.lab_order_items i
     set status = 'cancelled'
    from public.lab_orders o
   where o.id = i.order_id
     and o.visit_id = p_visit_id
     and i.status not in ('completed', 'cancelled');

  return query select * from public.visits where id = p_visit_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- opd_dashboard_stats — the monitoring tiles
-- ---------------------------------------------------------------------------
create or replace function public.opd_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  today date := public.opd_today();
begin
  if not public.has_permission('dashboard.read') then
    raise exception 'You do not have permission to view operations.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total_patients',       (select count(*) from public.patients),
    'registered_today',     (select count(*) from public.visits where visit_date = today),
    'waiting',              (select count(*) from public.visits where status = 'waiting'),
    'in_consultation',      (select count(*) from public.visits where status = 'in_consultation'),
    'awaiting_lab',         (select count(*) from public.visits where status = 'awaiting_lab'),
    'ready_for_review',     (select count(*) from public.visits where status = 'ready_for_review'),
    'completed_today',      (select count(*) from public.visits where visit_date = today and status = 'completed'),
    'pending_lab_requests', (select count(*) from public.lab_orders where status in ('requested', 'in_progress')),
    'active_physicians',    (select count(*) from public.physicians where duty_status <> 'off_duty'),
    'available_physicians', (
      select count(*) from public.physicians ph
       where ph.duty_status = 'available'
         and not exists (select 1 from public.visits v
                          where v.physician_id = ph.profile_id and v.status = 'in_consultation')
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Execute rights: signed-in users only. Each function checks its own
-- permission; this just keeps anon from reaching them at all.
-- ---------------------------------------------------------------------------
revoke execute on function public.call_next_patient()                                   from public, anon;
revoke execute on function public.release_patient(uuid)                                 from public, anon;
revoke execute on function public.order_labs(uuid, uuid[], public.lab_priority, text)   from public, anon;
revoke execute on function public.complete_visit(uuid)                                  from public, anon;
revoke execute on function public.cancel_visit(uuid, text, boolean)                     from public, anon;
revoke execute on function public.opd_dashboard_stats()                                 from public, anon;

grant execute on function public.call_next_patient()                                    to authenticated;
grant execute on function public.release_patient(uuid)                                  to authenticated;
grant execute on function public.order_labs(uuid, uuid[], public.lab_priority, text)    to authenticated;
grant execute on function public.complete_visit(uuid)                                   to authenticated;
grant execute on function public.cancel_visit(uuid, text, boolean)                      to authenticated;
grant execute on function public.opd_dashboard_stats()                                  to authenticated;
grant execute on function public.opd_today()                                            to authenticated;
