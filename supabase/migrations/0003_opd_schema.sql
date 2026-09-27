-- ============================================================================
-- 0003_opd_schema.sql — OPD / EMR tables, roles, permissions, lab catalog
--
-- The outpatient cycle, as data:
--
--   patients ─< visits ──── consultations            (one per visit)
--                  │
--                  └──< lab_orders ─< lab_order_items ─< lab_result_values
--                                          │
--                                   lab_test_types ─< lab_test_parameters
--
--   physicians      — on-duty status for each doctor (profiles.id)
--   visit_events    — append-only activity feed, written by triggers
--
-- A visit IS the queue entry: inserting one enqueues the patient. Its status
-- walks the workflow; 0004 enforces the legal moves, 0005 who may make them.
--
-- Run order: 0001, 0002, 0003, 0004, 0005.
-- ============================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums — fixed workflow vocabularies the code switches on
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.sex as enum ('male', 'female');
exception when duplicate_object then null; end $$;

do $$ begin
  -- waiting → in_consultation → (awaiting_lab → ready_for_review → in_consultation)* → completed
  -- plus the exits: cancelled, no_show.
  create type public.visit_status as enum (
    'waiting', 'in_consultation', 'awaiting_lab', 'ready_for_review',
    'completed', 'cancelled', 'no_show'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  -- "Busy" is not stored: a physician with an in_consultation visit is busy.
  create type public.duty_status as enum ('off_duty', 'available', 'on_break');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lab_priority as enum ('routine', 'stat');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Derived from its items by trigger; never written by the client.
  create type public.lab_order_status as enum ('requested', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lab_item_status as enum (
    'requested', 'specimen_collected', 'in_progress', 'completed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.result_flag as enum (
    'normal', 'low', 'high', 'critical_low', 'critical_high', 'abnormal'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- The OPD's calendar day
--
-- Supabase runs in UTC, so current_date flips at 8 AM in Manila — mid-clinic.
-- Queue numbers and "today" counts use this instead. Change the zone here if
-- the facility is elsewhere.
-- ---------------------------------------------------------------------------
create or replace function public.opd_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Manila')::date;
$$;

-- ---------------------------------------------------------------------------
-- patients — the EMR profile
-- ---------------------------------------------------------------------------
create sequence if not exists public.patient_no_seq;

create table if not exists public.patients (
  id                         uuid primary key default gen_random_uuid(),
  -- Human-facing record number, e.g. PT-2026-000123.
  patient_no                 text not null unique default (
    'PT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.patient_no_seq')::text, 6, '0')
  ),
  last_name                  text not null check (length(trim(last_name)) > 0),
  first_name                 text not null check (length(trim(first_name)) > 0),
  middle_name                text,
  suffix                     text,
  sex                        public.sex not null,
  birth_date                 date not null check (birth_date > date '1900-01-01'),
  civil_status               text check (civil_status in ('single', 'married', 'widowed', 'separated')),
  contact_number             text,
  email                      text,
  address_line               text,
  barangay                   text,
  city_municipality          text,
  province                   text,
  philhealth_no              text,
  emergency_contact_name     text,
  emergency_contact_relation text,
  emergency_contact_number   text,
  blood_type                 text check (blood_type in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  allergies                  text,
  chronic_conditions         text,
  -- One lowercase haystack for the lookup box: name, record number, phone.
  search_text                text generated always as (
    lower(
      last_name || ' ' || first_name || ' ' || coalesce(middle_name, '') || ' ' ||
      patient_no || ' ' || coalesce(contact_number, '') || ' ' || coalesce(philhealth_no, '')
    )
  ) stored,
  created_by                 uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

comment on table public.patients is
  'EMR profile: demographics and standing medical facts. Never deleted.';

create unique index if not exists patients_philhealth_idx
  on public.patients (philhealth_no) where philhealth_no is not null;
-- Duplicate check at registration: same name and birthday.
create index if not exists patients_identity_idx
  on public.patients (lower(last_name), lower(first_name), birth_date);
-- Substring search: .ilike('search_text', '%dela cruz%')
create index if not exists patients_search_idx
  on public.patients using gin (search_text extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- physicians — duty roster, one row per doctor
-- ---------------------------------------------------------------------------
create table if not exists public.physicians (
  profile_id      uuid primary key references public.profiles (id) on delete cascade,
  license_no      text,
  specialization  text,
  room            text,
  duty_status     public.duty_status not null default 'off_duty',
  duty_changed_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- visits — one OPD encounter, and its place in the queue
-- ---------------------------------------------------------------------------
create table if not exists public.visits (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references public.patients (id) on delete restrict,
  visit_date        date not null default public.opd_today(),
  -- Per-day ticket number; set by trigger.
  queue_number      integer not null,
  -- Senior citizens, PWDs and pregnant patients go ahead of the FIFO line.
  is_priority       boolean not null default false,
  priority_reason   text,
  chief_complaint   text not null check (length(trim(chief_complaint)) > 0),

  -- Intake vitals, taken by OPD staff at registration.
  bp_systolic       smallint check (bp_systolic between 40 and 300),
  bp_diastolic      smallint check (bp_diastolic between 20 and 200),
  heart_rate        smallint check (heart_rate between 20 and 300),
  respiratory_rate  smallint check (respiratory_rate between 4 and 80),
  temperature_c     numeric(4, 1) check (temperature_c between 30 and 45),
  spo2              smallint check (spo2 between 50 and 100),
  weight_kg         numeric(5, 2) check (weight_kg between 0.5 and 400),
  height_cm         numeric(5, 1) check (height_cm between 20 and 260),

  status            public.visit_status not null default 'waiting',
  physician_id      uuid references public.profiles (id) on delete set null,
  registered_by     uuid default auth.uid() references public.profiles (id) on delete set null,

  -- The FIFO key. Kept when a physician releases a patient back to the queue,
  -- so they return to their original place.
  queued_at         timestamptz not null default now(),
  called_at         timestamptz,
  lab_requested_at  timestamptz,
  results_ready_at  timestamptz,
  completed_at      timestamptz,
  cancelled_at      timestamptz,
  cancel_reason     text,
  status_changed_at timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (visit_date, queue_number)
);

comment on table public.visits is
  'One OPD encounter. Inserting a row enqueues the patient; status is changed only by the workflow functions in 0004.';

-- The queue itself: what call_next_patient() scans.
create index if not exists visits_queue_idx
  on public.visits (is_priority desc, queued_at) where status = 'waiting';
create index if not exists visits_physician_idx on public.visits (physician_id, status);
create index if not exists visits_patient_idx on public.visits (patient_id, created_at desc);
create index if not exists visits_date_idx on public.visits (visit_date, status);
-- A patient cannot be in the queue twice.
create unique index if not exists visits_one_open_per_patient
  on public.visits (patient_id)
  where status not in ('completed', 'cancelled', 'no_show');

-- ---------------------------------------------------------------------------
-- consultations — the physician's clinical note for a visit
-- ---------------------------------------------------------------------------
create table if not exists public.consultations (
  id             uuid primary key default gen_random_uuid(),
  visit_id       uuid not null unique references public.visits (id) on delete cascade,
  physician_id   uuid not null references public.profiles (id) on delete restrict,
  symptoms       text,
  physical_exam  text,
  diagnosis      text,
  icd10_code     text,
  treatment_plan text,
  notes          text,
  follow_up_date date,
  -- Set by complete_visit(). After this the note is read-only.
  finalized_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists consultations_physician_idx on public.consultations (physician_id);

-- ---------------------------------------------------------------------------
-- Lab catalog — what can be ordered, and what each test reports
-- ---------------------------------------------------------------------------
create table if not exists public.lab_test_types (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null,
  category   text not null,
  specimen   text,
  is_active  boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lab_test_parameters (
  id              uuid primary key default gen_random_uuid(),
  test_type_id    uuid not null references public.lab_test_types (id) on delete cascade,
  name            text not null,
  unit            text,
  -- Shown to the reader, e.g. '70–100' or 'Negative'.
  reference_range text,
  -- Used to flag numeric results automatically. Either may be null.
  ref_low         numeric,
  ref_high        numeric,
  sort_order      integer not null default 0,
  unique (test_type_id, name)
);

-- ---------------------------------------------------------------------------
-- lab_orders — one request from a physician, holding one or more tests
-- ---------------------------------------------------------------------------
create sequence if not exists public.lab_order_no_seq;

create table if not exists public.lab_orders (
  id             uuid primary key default gen_random_uuid(),
  order_no       text not null unique default (
    'LAB-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.lab_order_no_seq')::text, 6, '0')
  ),
  visit_id       uuid not null references public.visits (id) on delete restrict,
  -- Copied from the visit so the lab can find the patient without visit access.
  patient_id     uuid not null references public.patients (id) on delete restrict,
  ordered_by     uuid not null references public.profiles (id) on delete restrict,
  priority       public.lab_priority not null default 'routine',
  clinical_notes text,
  status         public.lab_order_status not null default 'requested',
  ordered_at     timestamptz not null default now(),
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- The lab's incoming queue.
create index if not exists lab_orders_open_idx
  on public.lab_orders (priority desc, ordered_at) where status in ('requested', 'in_progress');
create index if not exists lab_orders_visit_idx on public.lab_orders (visit_id);
create index if not exists lab_orders_patient_idx on public.lab_orders (patient_id, ordered_at desc);

create table if not exists public.lab_order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.lab_orders (id) on delete cascade,
  test_type_id uuid not null references public.lab_test_types (id) on delete restrict,
  status       public.lab_item_status not null default 'requested',
  remarks      text,
  collected_at timestamptz,
  collected_by uuid references public.profiles (id) on delete set null,
  started_at   timestamptz,
  completed_at timestamptz,
  performed_by uuid references public.profiles (id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (order_id, test_type_id)
);

create table if not exists public.lab_result_values (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null references public.lab_order_items (id) on delete cascade,
  parameter_id    uuid references public.lab_test_parameters (id) on delete set null,
  -- Snapshotted from the parameter, so later catalog edits never rewrite a
  -- released result.
  parameter_name  text not null,
  value           text not null,
  unit            text,
  reference_range text,
  flag            public.result_flag,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (item_id, parameter_id)
);

create index if not exists lab_result_values_item_idx on public.lab_result_values (item_id);

-- ---------------------------------------------------------------------------
-- visit_events — the live activity feed. Written only by triggers.
-- ---------------------------------------------------------------------------
create table if not exists public.visit_events (
  id          bigint generated always as identity primary key,
  visit_id    uuid not null references public.visits (id) on delete cascade,
  patient_id  uuid not null references public.patients (id) on delete cascade,
  -- registered, called, resumed, sent_to_lab, lab_completed, results_ready,
  -- returned_to_queue, completed, cancelled, no_show
  event       text not null,
  from_status public.visit_status,
  to_status   public.visit_status,
  actor_id    uuid default auth.uid() references public.profiles (id) on delete set null,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists visit_events_recent_idx on public.visit_events (created_at desc);
create index if not exists visit_events_visit_idx on public.visit_events (visit_id, created_at);

-- ---------------------------------------------------------------------------
-- staff_directory — names of colleagues, without the user directory
--
-- profiles is gated by users.read, but the queue board has to show which
-- doctor has which patient. This view exposes names and roles only (no email)
-- to any active user. Embed it like a table:
--   visits?select=*,physician:staff_directory!physician_id(full_name)
-- ---------------------------------------------------------------------------
create or replace view public.staff_directory as
  select p.id, p.full_name, p.avatar_url, r.key as role_key, r.label as role_label
  from public.profiles p
  left join public.roles r on r.id = p.role_id
  where p.is_active and public.is_active_user();

-- ---------------------------------------------------------------------------
-- Seed: roles. 'admin' (0001) is the Administrator.
-- ---------------------------------------------------------------------------
insert into public.roles (key, label, description, rank)
values
  ('physician', 'Physician',             'Consults queued patients, documents care, orders labs.', 60),
  ('opd_staff', 'OPD Staff',             'Registers patients and manages the waiting queue.',      40),
  ('lab_tech',  'Laboratory Technician', 'Processes lab orders and encodes results.',              40)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Seed: permissions
-- ---------------------------------------------------------------------------
insert into public.permissions (key, label, description, category)
values
  ('patients.read',       'View patients',        'Search and open patient profiles.',                    'Patients'),
  ('patients.write',      'Register patients',    'Register new patients and edit demographics.',         'Patients'),
  ('queue.read',          'View queue',           'See the waiting queue and visit statuses.',            'Queue'),
  ('queue.manage',        'Manage queue',         'Enqueue patients, record intake, cancel visits.',      'Queue'),
  ('queue.serve',         'Serve patients',       'Go on duty and call the next patient in.',             'Queue'),
  ('consultations.read',  'View clinical records','Read consultation notes and full patient history.',    'Consultations'),
  ('consultations.write', 'Document consultations','Write and finalize consultation notes.',              'Consultations'),
  ('lab.read',            'View lab orders',      'See lab orders and released results.',                 'Laboratory'),
  ('lab.order',           'Order lab tests',      'Request tests from within a consultation.',            'Laboratory'),
  ('lab.process',         'Process lab orders',   'Collect specimens and encode results.',                'Laboratory'),
  ('lab.catalog',         'Manage lab catalog',   'Add and edit orderable tests and their parameters.',   'Laboratory'),
  ('dashboard.read',      'View operations',      'See OPD metrics and the live activity feed.',          'Monitoring')
on conflict (key) do nothing;

-- The starting grant matrix. Change it later on the Roles page.
insert into public.role_permissions (role_id, permission_key)
select r.id, g.permission_key
from (values
  ('opd_staff', 'patients.read'),
  ('opd_staff', 'patients.write'),
  ('opd_staff', 'queue.read'),
  ('opd_staff', 'queue.manage'),
  ('physician', 'patients.read'),
  ('physician', 'queue.read'),
  ('physician', 'queue.serve'),
  ('physician', 'consultations.read'),
  ('physician', 'consultations.write'),
  ('physician', 'lab.read'),
  ('physician', 'lab.order'),
  ('lab_tech',  'patients.read'),
  ('lab_tech',  'lab.read'),
  ('lab_tech',  'lab.process')
) as g (role_key, permission_key)
join public.roles r on r.key = g.role_key
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Seed: a starter lab catalog
--
-- Reference ranges are typical adult values for demonstration. Replace them
-- with the hospital laboratory's own before real use.
-- ---------------------------------------------------------------------------
insert into public.lab_test_types (code, name, category, specimen, sort_order)
values
  ('CBC',   'Complete Blood Count',   'Hematology',          'Whole blood (EDTA)', 10),
  ('UA',    'Urinalysis',             'Clinical Microscopy', 'Urine',              20),
  ('FECA',  'Fecalysis',              'Clinical Microscopy', 'Stool',              30),
  ('FBS',   'Fasting Blood Sugar',    'Clinical Chemistry',  'Serum',              40),
  ('HBA1C', 'Hemoglobin A1c',         'Clinical Chemistry',  'Whole blood (EDTA)', 50),
  ('LIPID', 'Lipid Profile',          'Clinical Chemistry',  'Serum',              60),
  ('CREA',  'Creatinine',             'Clinical Chemistry',  'Serum',              70),
  ('BUN',   'Blood Urea Nitrogen',    'Clinical Chemistry',  'Serum',              80),
  ('BUA',   'Uric Acid',              'Clinical Chemistry',  'Serum',              90),
  ('SGPT',  'SGPT / ALT',             'Clinical Chemistry',  'Serum',             100)
on conflict (code) do nothing;

insert into public.lab_test_parameters
  (test_type_id, name, unit, reference_range, ref_low, ref_high, sort_order)
select t.id, v.name, v.unit, v.reference_range, v.ref_low, v.ref_high, v.sort_order
from (values
  ('CBC',   'Hemoglobin',        'g/dL',      '12.0–17.5',   12.0,  17.5,  1),
  ('CBC',   'Hematocrit',        '%',         '36–52',       36,    52,    2),
  ('CBC',   'RBC count',         '×10¹²/L',   '4.0–6.0',     4.0,   6.0,   3),
  ('CBC',   'WBC count',         '×10⁹/L',    '4.5–11.0',    4.5,   11.0,  4),
  ('CBC',   'Platelet count',    '×10⁹/L',    '150–450',     150,   450,   5),
  ('CBC',   'Neutrophils',       '%',         '40–70',       40,    70,    6),
  ('CBC',   'Lymphocytes',       '%',         '20–40',       20,    40,    7),
  ('UA',    'Color',             null,        'Yellow',      null,  null,  1),
  ('UA',    'Transparency',      null,        'Clear',       null,  null,  2),
  ('UA',    'pH',                null,        '4.5–8.0',     4.5,   8.0,   3),
  ('UA',    'Specific gravity',  null,        '1.005–1.030', 1.005, 1.030, 4),
  ('UA',    'Protein',           null,        'Negative',    null,  null,  5),
  ('UA',    'Glucose',           null,        'Negative',    null,  null,  6),
  ('UA',    'Pus cells',         '/hpf',      '0–5',         0,     5,     7),
  ('UA',    'Red blood cells',   '/hpf',      '0–2',         0,     2,     8),
  ('FECA',  'Color',             null,        'Brown',       null,  null,  1),
  ('FECA',  'Consistency',       null,        'Formed',      null,  null,  2),
  ('FECA',  'Ova / parasites',   null,        'None seen',   null,  null,  3),
  ('FECA',  'Pus cells',         '/hpf',      '0–2',         0,     2,     4),
  ('FBS',   'Glucose, fasting',  'mg/dL',     '70–100',      70,    100,   1),
  ('HBA1C', 'HbA1c',             '%',         '4.0–5.6',     4.0,   5.6,   1),
  ('LIPID', 'Total cholesterol', 'mg/dL',     '< 200',       null,  200,   1),
  ('LIPID', 'Triglycerides',     'mg/dL',     '< 150',       null,  150,   2),
  ('LIPID', 'HDL',               'mg/dL',     '> 40',        40,    null,  3),
  ('LIPID', 'LDL',               'mg/dL',     '< 100',       null,  100,   4),
  ('CREA',  'Creatinine',        'mg/dL',     '0.6–1.3',     0.6,   1.3,   1),
  ('BUN',   'BUN',               'mg/dL',     '7–20',        7,     20,    1),
  ('BUA',   'Uric acid',         'mg/dL',     '3.5–7.2',     3.5,   7.2,   1),
  ('SGPT',  'ALT',               'U/L',       '7–56',        7,     56,    1)
) as v (code, name, unit, reference_range, ref_low, ref_high, sort_order)
join public.lab_test_types t on t.code = v.code
on conflict (test_type_id, name) do nothing;
