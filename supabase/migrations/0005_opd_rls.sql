-- ============================================================================
-- 0005_opd_rls.sql — who may see and change OPD data
--
-- Two layers, because each answers a different question:
--
--   Column grants  WHICH columns a client may write at all. Status, queue
--                  numbers, finalization and lab routing are withheld, so
--                  they only change through the 0004 functions.
--   RLS policies   WHICH rows, by has_permission() — never a role name, so
--                  the Roles page stays the single place access is decided.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Column grants
-- ---------------------------------------------------------------------------
revoke all on public.patients, public.physicians, public.visits, public.consultations,
              public.lab_test_types, public.lab_test_parameters, public.lab_orders,
              public.lab_order_items, public.lab_result_values, public.visit_events,
              public.staff_directory
  from anon;

-- patients: everything but the record number and audit columns.
revoke insert, update on public.patients from authenticated;
grant insert (
  last_name, first_name, middle_name, suffix, sex, birth_date, civil_status,
  contact_number, email, address_line, barangay, city_municipality, province,
  philhealth_no, emergency_contact_name, emergency_contact_relation,
  emergency_contact_number, blood_type, allergies, chronic_conditions
) on public.patients to authenticated;
grant update (
  last_name, first_name, middle_name, suffix, sex, birth_date, civil_status,
  contact_number, email, address_line, barangay, city_municipality, province,
  philhealth_no, emergency_contact_name, emergency_contact_relation,
  emergency_contact_number, blood_type, allergies, chronic_conditions
) on public.patients to authenticated;
grant usage on sequence public.patient_no_seq to authenticated;

-- visits: intake only. Inserting is enqueuing; everything after is a function.
revoke insert, update, delete on public.visits from authenticated;
grant insert (
  patient_id, chief_complaint, is_priority, priority_reason,
  bp_systolic, bp_diastolic, heart_rate, respiratory_rate,
  temperature_c, spo2, weight_kg, height_cm
) on public.visits to authenticated;
grant update (
  chief_complaint, is_priority, priority_reason,
  bp_systolic, bp_diastolic, heart_rate, respiratory_rate,
  temperature_c, spo2, weight_kg, height_cm
) on public.visits to authenticated;

-- consultations: created by call_next_patient(), finalized by complete_visit().
revoke insert, update, delete on public.consultations from authenticated;
grant update (
  symptoms, physical_exam, diagnosis, icd10_code, treatment_plan, notes, follow_up_date
) on public.consultations to authenticated;

-- lab_orders: created by order_labs(); status derived from its items.
revoke insert, update, delete on public.lab_orders from authenticated;

-- lab_order_items: the lab moves them forward, the physician may cancel.
revoke insert, update, delete on public.lab_order_items from authenticated;
grant update (status, remarks) on public.lab_order_items to authenticated;

-- visit_events: written only by triggers.
revoke insert, update, delete on public.visit_events from authenticated;

grant select on public.staff_directory to authenticated;

-- ---------------------------------------------------------------------------
-- Row policies
-- ---------------------------------------------------------------------------
alter table public.patients            enable row level security;
alter table public.physicians          enable row level security;
alter table public.visits              enable row level security;
alter table public.consultations       enable row level security;
alter table public.lab_test_types      enable row level security;
alter table public.lab_test_parameters enable row level security;
alter table public.lab_orders          enable row level security;
alter table public.lab_order_items     enable row level security;
alter table public.lab_result_values   enable row level security;
alter table public.visit_events        enable row level security;

-- patients ------------------------------------------------------------------
-- No DELETE policy: medical records are retained.
drop policy if exists patients_select on public.patients;
create policy patients_select
  on public.patients for select to authenticated
  using (public.has_permission('patients.read'));

drop policy if exists patients_insert on public.patients;
create policy patients_insert
  on public.patients for insert to authenticated
  with check (public.has_permission('patients.write'));

drop policy if exists patients_update on public.patients;
create policy patients_update
  on public.patients for update to authenticated
  using (public.has_permission('patients.write'))
  with check (public.has_permission('patients.write'));

-- physicians ----------------------------------------------------------------
-- Everyone sees who is on duty. A doctor sets their own status; an admin
-- (users.write) can set up or correct anyone's.
drop policy if exists physicians_select on public.physicians;
create policy physicians_select
  on public.physicians for select to authenticated
  using (public.is_active_user());

drop policy if exists physicians_insert on public.physicians;
create policy physicians_insert
  on public.physicians for insert to authenticated
  with check (
    (profile_id = auth.uid() and public.has_permission('queue.serve'))
    or public.has_permission('users.write')
  );

drop policy if exists physicians_update on public.physicians;
create policy physicians_update
  on public.physicians for update to authenticated
  using (
    (profile_id = auth.uid() and public.has_permission('queue.serve'))
    or public.has_permission('users.write')
  )
  with check (
    (profile_id = auth.uid() and public.has_permission('queue.serve'))
    or public.has_permission('users.write')
  );

drop policy if exists physicians_delete on public.physicians;
create policy physicians_delete
  on public.physicians for delete to authenticated
  using (public.has_permission('users.write'));

-- visits --------------------------------------------------------------------
drop policy if exists visits_select on public.visits;
create policy visits_select
  on public.visits for select to authenticated
  using (public.has_permission('queue.read') or public.has_permission('consultations.read'));

drop policy if exists visits_insert on public.visits;
create policy visits_insert
  on public.visits for insert to authenticated
  with check (public.has_permission('queue.manage'));

-- Intake corrections: the desk, or the physician who has the patient.
drop policy if exists visits_update on public.visits;
create policy visits_update
  on public.visits for update to authenticated
  using (
    public.has_permission('queue.manage')
    or (physician_id = auth.uid() and public.has_permission('queue.serve'))
  )
  with check (
    public.has_permission('queue.manage')
    or (physician_id = auth.uid() and public.has_permission('queue.serve'))
  );

-- consultations -------------------------------------------------------------
-- Any clinician with consultations.read sees the whole history — that is the
-- EMR. Only the author edits, and only until it is finalized (0004 trigger).
drop policy if exists consultations_select on public.consultations;
create policy consultations_select
  on public.consultations for select to authenticated
  using (public.has_permission('consultations.read'));

drop policy if exists consultations_update on public.consultations;
create policy consultations_update
  on public.consultations for update to authenticated
  using (physician_id = auth.uid() and public.has_permission('consultations.write'))
  with check (physician_id = auth.uid() and public.has_permission('consultations.write'));

-- lab catalog ---------------------------------------------------------------
drop policy if exists lab_test_types_select on public.lab_test_types;
create policy lab_test_types_select
  on public.lab_test_types for select to authenticated
  using (public.is_active_user());

drop policy if exists lab_test_types_write on public.lab_test_types;
create policy lab_test_types_write
  on public.lab_test_types for all to authenticated
  using (public.has_permission('lab.catalog'))
  with check (public.has_permission('lab.catalog'));

drop policy if exists lab_test_parameters_select on public.lab_test_parameters;
create policy lab_test_parameters_select
  on public.lab_test_parameters for select to authenticated
  using (public.is_active_user());

drop policy if exists lab_test_parameters_write on public.lab_test_parameters;
create policy lab_test_parameters_write
  on public.lab_test_parameters for all to authenticated
  using (public.has_permission('lab.catalog'))
  with check (public.has_permission('lab.catalog'));

-- lab orders ----------------------------------------------------------------
drop policy if exists lab_orders_select on public.lab_orders;
create policy lab_orders_select
  on public.lab_orders for select to authenticated
  using (public.has_permission('lab.read'));

drop policy if exists lab_order_items_select on public.lab_order_items;
create policy lab_order_items_select
  on public.lab_order_items for select to authenticated
  using (public.has_permission('lab.read'));

-- The lab processes any item; the ordering physician may touch their own
-- (the 0004 trigger limits them to cancelling).
drop policy if exists lab_order_items_update on public.lab_order_items;
create policy lab_order_items_update
  on public.lab_order_items for update to authenticated
  using (
    public.has_permission('lab.process')
    or (
      public.has_permission('lab.order')
      and exists (select 1 from public.lab_orders o
                   where o.id = order_id and o.ordered_by = auth.uid())
    )
  )
  with check (
    public.has_permission('lab.process')
    or (
      public.has_permission('lab.order')
      and exists (select 1 from public.lab_orders o
                   where o.id = order_id and o.ordered_by = auth.uid())
    )
  );

drop policy if exists lab_result_values_select on public.lab_result_values;
create policy lab_result_values_select
  on public.lab_result_values for select to authenticated
  using (public.has_permission('lab.read'));

drop policy if exists lab_result_values_write on public.lab_result_values;
create policy lab_result_values_write
  on public.lab_result_values for all to authenticated
  using (public.has_permission('lab.process'))
  with check (public.has_permission('lab.process'));

-- visit_events --------------------------------------------------------------
drop policy if exists visit_events_select on public.visit_events;
create policy visit_events_select
  on public.visit_events for select to authenticated
  using (public.has_permission('dashboard.read') or public.has_permission('queue.read'));

-- ---------------------------------------------------------------------------
-- Realtime
--
-- Queue boards, the lab's incoming list and the activity feed subscribe to
-- these. Supabase checks each subscriber against the select policies above,
-- so nobody receives rows they could not query.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'visits', 'physicians', 'lab_orders', 'lab_order_items', 'visit_events'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;   -- already published
      when undefined_object then null;   -- no realtime publication (plain Postgres)
    end;
  end loop;
end $$;
