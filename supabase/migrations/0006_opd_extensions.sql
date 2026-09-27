-- ============================================================================
-- 0006_opd_extensions.sql — prescriptions, corrections, handovers, day close
--
--   prescriptions            structured Rx lines on a consultation
--   consultation_addenda     signed notes appended to a finalized consultation
--   lab_result_amendments    audit trail for corrected released lab results
--   amend_lab_result()       the only way to change a released result
--   reassign_visit()         hand a patient to another on-duty physician
--   close_stale_visits()     end-of-day sweep: yesterday's waiting → no-show
--
-- No new permissions: prescriptions and addenda ride on consultations.write,
-- amendments on lab.process, reassignment and the sweep on queue.manage.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- prescriptions
-- ---------------------------------------------------------------------------
create table if not exists public.prescriptions (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations (id) on delete cascade,
  medicine        text not null check (length(trim(medicine)) > 0),
  dose            text,
  frequency       text,
  duration        text,
  quantity        integer check (quantity > 0),
  instructions    text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists prescriptions_consultation_idx
  on public.prescriptions (consultation_id, sort_order);

drop trigger if exists prescriptions_touch_updated_at on public.prescriptions;
create trigger prescriptions_touch_updated_at
  before update on public.prescriptions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- consultation_addenda — append-only corrections to a finalized note
-- ---------------------------------------------------------------------------
create table if not exists public.consultation_addenda (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations (id) on delete cascade,
  author_id       uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  body            text not null check (length(trim(body)) > 0),
  created_at      timestamptz not null default now()
);

create index if not exists consultation_addenda_consultation_idx
  on public.consultation_addenda (consultation_id, created_at);

-- ---------------------------------------------------------------------------
-- lab_result_amendments — what a released result said before it was corrected
-- ---------------------------------------------------------------------------
alter table public.lab_result_values add column if not exists amended_at timestamptz;

create table if not exists public.lab_result_amendments (
  id              uuid primary key default gen_random_uuid(),
  result_value_id uuid not null references public.lab_result_values (id) on delete cascade,
  old_value       text not null,
  new_value       text not null,
  old_flag        public.result_flag,
  new_flag        public.result_flag,
  reason          text not null check (length(trim(reason)) > 0),
  amended_by      uuid default auth.uid() references public.profiles (id) on delete set null,
  amended_at      timestamptz not null default now()
);

create index if not exists lab_result_amendments_value_idx
  on public.lab_result_amendments (result_value_id, amended_at);

-- The 0004 lock, now with one door: amend_lab_result() sets opd.amending for
-- its own transaction. The setting is not reachable through the API, because
-- PostgREST only exposes functions in the public schema.
create or replace function public.lab_results_before_write()
returns trigger
language plpgsql
as $$
declare
  item_status   public.lab_item_status;
  param         public.lab_test_parameters;
  numeric_value numeric;
begin
  if tg_op = 'DELETE' then
    select status into item_status from public.lab_order_items where id = old.item_id;
  else
    select status into item_status from public.lab_order_items where id = new.item_id;
  end if;

  if item_status in ('completed', 'cancelled')
     and auth.uid() is not null
     and coalesce(current_setting('opd.amending', true), '') <> 'on' then
    raise exception 'Results of a closed test can no longer be changed. Amend them instead.'
      using errcode = '42501';
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

create or replace function public.amend_lab_result(
  p_result_id uuid,
  p_value     text,
  p_reason    text,
  p_flag      public.result_flag default null
)
returns public.lab_result_values
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row  public.lab_result_values;
  item_status  public.lab_item_status;
  target_order public.lab_orders;
  updated_row  public.lab_result_values;
begin
  if not public.has_permission('lab.process') then
    raise exception 'You do not have permission to amend lab results.' using errcode = '42501';
  end if;

  if length(trim(coalesce(p_value, ''))) = 0 then
    raise exception 'Enter the corrected value.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Give a reason for the amendment.' using errcode = '22023';
  end if;

  select * into current_row from public.lab_result_values where id = p_result_id for update;
  if current_row.id is null then
    raise exception 'Result not found.' using errcode = 'P0002';
  end if;

  select i.status into item_status from public.lab_order_items i where i.id = current_row.item_id;
  if item_status <> 'completed' then
    raise exception 'Only released results are amended. Edit this one directly.' using errcode = 'P0001';
  end if;

  perform set_config('opd.amending', 'on', true);

  update public.lab_result_values
     set value = trim(p_value),
         -- null lets the trigger re-flag the new number against the range
         flag = p_flag,
         amended_at = now()
   where id = p_result_id
  returning * into updated_row;

  -- The trigger re-flags a changed value when the flag looks unchanged; an
  -- explicit flag from the tech always wins.
  if p_flag is not null and updated_row.flag is distinct from p_flag then
    update public.lab_result_values set flag = p_flag where id = p_result_id
    returning * into updated_row;
  end if;

  perform set_config('opd.amending', 'off', true);

  insert into public.lab_result_amendments
    (result_value_id, old_value, new_value, old_flag, new_flag, reason)
  values
    (p_result_id, current_row.value, updated_row.value, current_row.flag, updated_row.flag, trim(p_reason));

  select o.* into target_order
    from public.lab_orders o
    join public.lab_order_items i on i.order_id = o.id
   where i.id = current_row.item_id;

  insert into public.visit_events (visit_id, patient_id, event, details)
  values (target_order.visit_id, target_order.patient_id, 'lab_amended',
          jsonb_build_object('order_no', target_order.order_no,
                             'parameter', updated_row.parameter_name,
                             'old_value', current_row.value,
                             'new_value', updated_row.value));

  return updated_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Handovers: in_consultation may now go to ready_for_review, which is what a
-- reassigned patient becomes — waiting for their new physician.
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
    or (old.status = 'in_consultation'  and new.status in ('awaiting_lab', 'ready_for_review', 'completed', 'waiting', 'cancelled'))
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
    -- Same status, different doctor: a handover while at the lab.
    if new.physician_id is distinct from old.physician_id
       and old.physician_id is not null and new.physician_id is not null then
      insert into public.visit_events (visit_id, patient_id, event, from_status, to_status, details)
      values (new.id, new.patient_id, 'reassigned', old.status, new.status,
              jsonb_build_object('from_physician_id', old.physician_id,
                                 'physician_id', new.physician_id));
    end if;
    return new;
  end if;

  event_name := case
    when new.status = 'in_consultation' and old.status = 'ready_for_review' then 'resumed'
    when new.status = 'in_consultation'  then 'called'
    when new.status = 'waiting'          then 'returned_to_queue'
    when new.status = 'awaiting_lab'     then 'sent_to_lab'
    when new.status = 'ready_for_review' and old.status = 'in_consultation' then 'reassigned'
    when new.status = 'ready_for_review' then 'results_ready'
    else new.status::text                -- completed, cancelled, no_show
  end;

  insert into public.visit_events (visit_id, patient_id, event, from_status, to_status, details)
  values (new.id, new.patient_id, event_name, old.status, new.status,
          jsonb_strip_nulls(jsonb_build_object(
            'physician_id', new.physician_id,
            'from_physician_id', case when event_name = 'reassigned' then old.physician_id end,
            'cancel_reason', new.cancel_reason)));

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- reassign_visit — the desk hands a patient to another on-duty physician
-- ---------------------------------------------------------------------------
create or replace function public.reassign_visit(p_visit_id uuid, p_physician_id uuid)
returns setof public.visits
language plpgsql
security definer
set search_path = public
as $$
declare
  target_visit public.visits;
begin
  if not public.has_permission('queue.manage') then
    raise exception 'You do not have permission to reassign patients.' using errcode = '42501';
  end if;

  select * into target_visit from public.visits where id = p_visit_id for update;

  if target_visit.id is null then
    raise exception 'Visit not found.' using errcode = 'P0002';
  end if;
  if target_visit.status not in ('in_consultation', 'awaiting_lab', 'ready_for_review') then
    raise exception 'Only a patient already assigned to a physician can be reassigned.'
      using errcode = 'P0001';
  end if;
  if target_visit.physician_id = p_physician_id then
    raise exception 'The patient is already assigned to that physician.' using errcode = 'P0001';
  end if;
  if not exists (
    select 1
      from public.physicians ph
      join public.profiles p on p.id = ph.profile_id
     where ph.profile_id = p_physician_id and ph.duty_status <> 'off_duty' and p.is_active
  ) then
    raise exception 'Choose a physician who is on duty.' using errcode = 'P0001';
  end if;

  -- A patient mid-consultation waits for the new doctor; one at the lab stays there.
  update public.visits
     set physician_id = p_physician_id,
         status = case when status = 'in_consultation' then 'ready_for_review' else status end
   where id = p_visit_id;

  -- The unfinished note goes with the patient, so the new doctor can continue it.
  update public.consultations
     set physician_id = p_physician_id
   where visit_id = p_visit_id and finalized_at is null;

  return query select * from public.visits where id = p_visit_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- close_stale_visits — nobody waits overnight
--
-- Only 'waiting' visits are swept. A patient with a doctor or at the lab has
-- clinical context and is closed by a person, not a sweep.
-- ---------------------------------------------------------------------------
create or replace function public.close_stale_visits()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  closed integer;
begin
  if not public.has_permission('queue.manage') then
    raise exception 'You do not have permission to close the queue.' using errcode = '42501';
  end if;

  update public.visits
     set status = 'no_show',
         cancel_reason = 'Not seen by the end of the clinic day.'
   where status = 'waiting'
     and visit_date < public.opd_today();

  get diagnostics closed = row_count;
  return closed;
end;
$$;

-- ---------------------------------------------------------------------------
-- opd_dashboard_stats — now with the numbers the alerts panel needs
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
    'stat_lab_pending',     (select count(*) from public.lab_orders
                              where status in ('requested', 'in_progress') and priority = 'stat'),
    'active_physicians',    (select count(*) from public.physicians where duty_status <> 'off_duty'),
    'available_physicians', (
      select count(*) from public.physicians ph
       where ph.duty_status = 'available'
         and not exists (select 1 from public.visits v
                          where v.physician_id = ph.profile_id and v.status = 'in_consultation')
    ),
    'stale_waiting',        (select count(*) from public.visits
                              where status = 'waiting' and visit_date < today),
    'oldest_waiting_since', (select min(queued_at) from public.visits
                              where status = 'waiting' and visit_date = today),
    'avg_wait_minutes_today', (
      select round(avg(extract(epoch from (called_at - queued_at)) / 60)::numeric, 0)
        from public.visits
       where visit_date = today and called_at is not null
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants and policies
-- ---------------------------------------------------------------------------
revoke all on public.prescriptions, public.consultation_addenda, public.lab_result_amendments
  from anon;
revoke update, delete on public.consultation_addenda from authenticated;
revoke insert, update, delete on public.lab_result_amendments from authenticated;

alter table public.prescriptions         enable row level security;
alter table public.consultation_addenda  enable row level security;
alter table public.lab_result_amendments enable row level security;

-- prescriptions: the author edits them until the consultation is finalized.
drop policy if exists prescriptions_select on public.prescriptions;
create policy prescriptions_select
  on public.prescriptions for select to authenticated
  using (public.has_permission('consultations.read'));

drop policy if exists prescriptions_write on public.prescriptions;
create policy prescriptions_write
  on public.prescriptions for all to authenticated
  using (
    public.has_permission('consultations.write')
    and exists (select 1 from public.consultations c
                 where c.id = consultation_id
                   and c.physician_id = auth.uid()
                   and c.finalized_at is null)
  )
  with check (
    public.has_permission('consultations.write')
    and exists (select 1 from public.consultations c
                 where c.id = consultation_id
                   and c.physician_id = auth.uid()
                   and c.finalized_at is null)
  );

-- addenda: any clinician may sign one onto a finalized note, as themselves.
drop policy if exists consultation_addenda_select on public.consultation_addenda;
create policy consultation_addenda_select
  on public.consultation_addenda for select to authenticated
  using (public.has_permission('consultations.read'));

drop policy if exists consultation_addenda_insert on public.consultation_addenda;
create policy consultation_addenda_insert
  on public.consultation_addenda for insert to authenticated
  with check (
    public.has_permission('consultations.write')
    and author_id = auth.uid()
    and exists (select 1 from public.consultations c
                 where c.id = consultation_id and c.finalized_at is not null)
  );

drop policy if exists lab_result_amendments_select on public.lab_result_amendments;
create policy lab_result_amendments_select
  on public.lab_result_amendments for select to authenticated
  using (public.has_permission('lab.read'));

revoke execute on function public.amend_lab_result(uuid, text, text, public.result_flag) from public, anon;
revoke execute on function public.reassign_visit(uuid, uuid)                           from public, anon;
revoke execute on function public.close_stale_visits()                                 from public, anon;
grant  execute on function public.amend_lab_result(uuid, text, text, public.result_flag) to authenticated;
grant  execute on function public.reassign_visit(uuid, uuid)                           to authenticated;
grant  execute on function public.close_stale_visits()                                 to authenticated;
