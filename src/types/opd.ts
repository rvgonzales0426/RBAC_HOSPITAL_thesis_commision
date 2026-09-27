/**
 * Row types for the OPD / EMR tables (migrations 0003–0006). Hand-written to
 * match the SQL; embedded relations are optional because only some queries
 * select them.
 */

export type Sex = 'male' | 'female'

export type VisitStatus =
  | 'waiting'
  | 'in_consultation'
  | 'awaiting_lab'
  | 'ready_for_review'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type DutyStatus = 'off_duty' | 'available' | 'on_break'
export type LabPriority = 'routine' | 'stat'
export type LabOrderStatus = 'requested' | 'in_progress' | 'completed' | 'cancelled'
export type LabItemStatus =
  | 'requested'
  | 'specimen_collected'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
export type ResultFlag = 'normal' | 'low' | 'high' | 'critical_low' | 'critical_high' | 'abnormal'

/** Names and roles of colleagues, without the admin-only user directory. */
export interface StaffMember {
  id: string
  full_name: string | null
  avatar_url: string | null
  role_key: string | null
  role_label: string | null
}

export interface Patient {
  id: string
  patient_no: string
  last_name: string
  first_name: string
  middle_name: string | null
  suffix: string | null
  sex: Sex
  birth_date: string
  civil_status: string | null
  contact_number: string | null
  email: string | null
  address_line: string | null
  barangay: string | null
  city_municipality: string | null
  province: string | null
  philhealth_no: string | null
  emergency_contact_name: string | null
  emergency_contact_relation: string | null
  emergency_contact_number: string | null
  blood_type: string | null
  allergies: string | null
  chronic_conditions: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/** Columns the client may write — 0005 grants exactly these. */
export type PatientInput = Omit<
  Patient,
  'id' | 'patient_no' | 'created_by' | 'created_at' | 'updated_at'
>

export interface Physician {
  profile_id: string
  license_no: string | null
  specialization: string | null
  room: string | null
  duty_status: DutyStatus
  duty_changed_at: string
  created_at: string
  updated_at: string
}

export interface Vitals {
  bp_systolic: number | null
  bp_diastolic: number | null
  heart_rate: number | null
  respiratory_rate: number | null
  temperature_c: number | null
  spo2: number | null
  weight_kg: number | null
  height_cm: number | null
}

export interface Visit extends Vitals {
  id: string
  patient_id: string
  visit_date: string
  queue_number: number
  is_priority: boolean
  priority_reason: string | null
  chief_complaint: string
  status: VisitStatus
  physician_id: string | null
  registered_by: string | null
  queued_at: string
  called_at: string | null
  lab_requested_at: string | null
  results_ready_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  status_changed_at: string
  created_at: string
  updated_at: string
  patient?: Patient | null
}

/** Intake columns the desk writes when enqueuing; 0005 grants these. */
export interface IntakeInput extends Vitals {
  chief_complaint: string
  is_priority: boolean
  priority_reason: string | null
}

export interface Consultation {
  id: string
  visit_id: string
  physician_id: string
  symptoms: string | null
  physical_exam: string | null
  diagnosis: string | null
  icd10_code: string | null
  treatment_plan: string | null
  notes: string | null
  follow_up_date: string | null
  finalized_at: string | null
  created_at: string
  updated_at: string
  prescriptions?: Prescription[]
  addenda?: ConsultationAddendum[]
}

export type ConsultationNote = Pick<
  Consultation,
  | 'symptoms'
  | 'physical_exam'
  | 'diagnosis'
  | 'icd10_code'
  | 'treatment_plan'
  | 'notes'
  | 'follow_up_date'
>

export interface Prescription {
  id: string
  consultation_id: string
  medicine: string
  dose: string | null
  frequency: string | null
  duration: string | null
  quantity: number | null
  instructions: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type PrescriptionInput = Pick<
  Prescription,
  'medicine' | 'dose' | 'frequency' | 'duration' | 'quantity' | 'instructions'
>

export interface ConsultationAddendum {
  id: string
  consultation_id: string
  author_id: string
  body: string
  created_at: string
}

export interface LabTestParameter {
  id: string
  test_type_id: string
  name: string
  unit: string | null
  reference_range: string | null
  ref_low: number | null
  ref_high: number | null
  sort_order: number
}

export interface LabTestType {
  id: string
  code: string
  name: string
  category: string
  specimen: string | null
  is_active: boolean
  sort_order: number
  parameters?: LabTestParameter[]
}

export interface LabResultAmendment {
  id: string
  result_value_id: string
  old_value: string
  new_value: string
  old_flag: ResultFlag | null
  new_flag: ResultFlag | null
  reason: string
  amended_by: string | null
  amended_at: string
}

export interface LabResultValue {
  id: string
  item_id: string
  parameter_id: string | null
  parameter_name: string
  value: string
  unit: string | null
  reference_range: string | null
  flag: ResultFlag | null
  sort_order: number
  amended_at: string | null
  created_at: string
  updated_at: string
  amendments?: LabResultAmendment[]
}

export interface LabOrderItem {
  id: string
  order_id: string
  test_type_id: string
  status: LabItemStatus
  remarks: string | null
  collected_at: string | null
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
  test_type?: LabTestType | null
  results?: LabResultValue[]
}

export interface LabOrder {
  id: string
  order_no: string
  visit_id: string
  patient_id: string
  ordered_by: string
  priority: LabPriority
  clinical_notes: string | null
  status: LabOrderStatus
  ordered_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
  patient?: Patient | null
  items?: LabOrderItem[]
}

/** One row the lab tech types into the result grid. */
export interface ResultEntry {
  id?: string
  parameter_id: string | null
  parameter_name: string
  value: string
  unit: string | null
  reference_range: string | null
  flag: ResultFlag | null
  sort_order: number
}

export interface VisitEvent {
  id: number
  visit_id: string
  patient_id: string
  event: string
  from_status: VisitStatus | null
  to_status: VisitStatus | null
  actor_id: string | null
  details: Record<string, unknown>
  created_at: string
  patient?: Pick<Patient, 'first_name' | 'last_name' | 'patient_no'> | null
  visit?: Pick<Visit, 'queue_number'> | null
}

export interface OpdStats {
  total_patients: number
  registered_today: number
  waiting: number
  in_consultation: number
  awaiting_lab: number
  ready_for_review: number
  completed_today: number
  pending_lab_requests: number
  stat_lab_pending: number
  active_physicians: number
  available_physicians: number
  stale_waiting: number
  oldest_waiting_since: string | null
  avg_wait_minutes_today: number | null
}

/** A past or current visit with everything the EMR shows for it. */
export interface VisitRecord extends Visit {
  consultation?: Consultation | null
  lab_orders?: LabOrder[]
}
