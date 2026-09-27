import type {
  DutyStatus,
  LabItemStatus,
  LabOrderStatus,
  LabPriority,
  Patient,
  ResultFlag,
  Sex,
  StaffMember,
  VisitStatus,
} from '@/types'

/* ---------------------------------------------------------------------------
 * OPD presentation rules
 *
 * Labels and colours for every workflow status, and the formatting helpers
 * the clinical screens share. The statuses themselves are enums in Postgres
 * (0003_opd_schema.sql); keep the keys here in step with them.
 * ------------------------------------------------------------------------- */

/** Colour families from the clinical palette. See components/common/StatusPill.vue. */
export type Tone = 'active' | 'pending' | 'urgent' | 'lab' | 'neutral'

export interface StatusMeta {
  label: string
  tone: Tone
}

/** Must match opd_today() in 0003: the clinic day follows Manila, not UTC. */
export const OPD_TIME_ZONE = 'Asia/Manila'

export const VISIT_STATUS: Record<VisitStatus, StatusMeta> = {
  waiting: { label: 'Waiting', tone: 'pending' },
  in_consultation: { label: 'In consultation', tone: 'active' },
  awaiting_lab: { label: 'At laboratory', tone: 'lab' },
  ready_for_review: { label: 'Results ready', tone: 'urgent' },
  completed: { label: 'Completed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  no_show: { label: 'No-show', tone: 'neutral' },
}

/** Visits still moving through the OPD. */
export const OPEN_VISIT_STATUSES: VisitStatus[] = [
  'waiting',
  'in_consultation',
  'awaiting_lab',
  'ready_for_review',
]

export const DUTY_STATUS: Record<DutyStatus, StatusMeta> = {
  available: { label: 'Available', tone: 'active' },
  on_break: { label: 'On break', tone: 'pending' },
  off_duty: { label: 'Off duty', tone: 'neutral' },
}

export const LAB_ORDER_STATUS: Record<LabOrderStatus, StatusMeta> = {
  requested: { label: 'Requested', tone: 'pending' },
  in_progress: { label: 'In progress', tone: 'lab' },
  completed: { label: 'Released', tone: 'active' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

export const LAB_ITEM_STATUS: Record<LabItemStatus, StatusMeta> = {
  requested: { label: 'Requested', tone: 'pending' },
  specimen_collected: { label: 'Specimen collected', tone: 'lab' },
  in_progress: { label: 'Processing', tone: 'lab' },
  completed: { label: 'Released', tone: 'active' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

export const LAB_PRIORITY: Record<LabPriority, StatusMeta> = {
  routine: { label: 'Routine', tone: 'neutral' },
  stat: { label: 'STAT', tone: 'urgent' },
}

export const RESULT_FLAG: Record<ResultFlag, StatusMeta> = {
  normal: { label: 'Normal', tone: 'active' },
  low: { label: 'Low', tone: 'pending' },
  high: { label: 'High', tone: 'pending' },
  critical_low: { label: 'Critical low', tone: 'urgent' },
  critical_high: { label: 'Critical high', tone: 'urgent' },
  abnormal: { label: 'Abnormal', tone: 'urgent' },
}

export const RESULT_FLAG_OPTIONS = (Object.keys(RESULT_FLAG) as ResultFlag[]).map((value) => ({
  value,
  title: RESULT_FLAG[value].label,
}))

export const SEX_OPTIONS: { value: Sex; title: string }[] = [
  { value: 'female', title: 'Female' },
  { value: 'male', title: 'Male' },
]

export const CIVIL_STATUS_OPTIONS = [
  { value: 'single', title: 'Single' },
  { value: 'married', title: 'Married' },
  { value: 'widowed', title: 'Widowed' },
  { value: 'separated', title: 'Separated' },
]

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

/** The priority lanes Philippine law requires (RA 9994, RA 10754, RA 7277). */
export const PRIORITY_REASONS = ['Senior citizen', 'Person with disability', 'Pregnant']

/* ---------------------------------------------------------------------------
 * Formatting
 * ------------------------------------------------------------------------- */

/** "Dela Cruz, Juan P. Jr." — the order clinical records are filed in. */
export function patientName(
  patient: Pick<Patient, 'last_name' | 'first_name'> &
    Partial<Pick<Patient, 'middle_name' | 'suffix'>>,
): string {
  const middle = patient.middle_name?.trim() ? ` ${patient.middle_name.trim().charAt(0)}.` : ''
  const suffix = patient.suffix?.trim() ? ` ${patient.suffix.trim()}` : ''
  return `${patient.last_name}, ${patient.first_name}${middle}${suffix}`
}

/** Age in years, or months under two — what a clinician actually says. */
export function patientAge(birthDate: string): string {
  const birth = new Date(`${birthDate}T00:00:00`)
  const now = new Date()
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (now.getDate() < birth.getDate()) months -= 1
  if (months < 24) return `${Math.max(months, 0)} mo`
  return `${Math.floor(months / 12)} y`
}

export function sexLabel(sex: Sex): string {
  return sex === 'female' ? 'F' : 'M'
}

/** "PT-2026-000123 · F · 34 y" — the line under a patient's name. */
export function patientSummary(patient: Patient): string {
  return `${patient.patient_no} · ${sexLabel(patient.sex)} · ${patientAge(patient.birth_date)}`
}

/** Queue tickets read as #007. */
export function ticketLabel(queueNumber: number): string {
  return `#${String(queueNumber).padStart(3, '0')}`
}

export function staffName(member: StaffMember | null | undefined, fallback = 'Unknown'): string {
  return member?.full_name?.trim() || fallback
}

/** "Dr. Cruz" for a physician, plain name for everyone else. */
export function physicianName(member: StaffMember | null | undefined): string {
  const name = member?.full_name?.trim()
  if (!name) return 'Unassigned'
  return member?.role_key === 'physician' ? `Dr. ${name}` : name
}

/** Today's date in the clinic's time zone, as YYYY-MM-DD. */
export function opdToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: OPD_TIME_ZONE }).format(new Date())
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  // A bare date (YYYY-MM-DD) is a calendar day, not an instant — pin it to
  // local midnight so it never shifts a day in either direction.
  const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value)
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return `${formatDate(value)}, ${formatTime(value)}`
}

export function minutesSince(value: string | null | undefined, now = Date.now()): number {
  if (!value) return 0
  return Math.max(0, Math.floor((now - new Date(value).getTime()) / 60000))
}

/** 0 → "just now", 75 → "1 h 15 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

export function formatRelative(value: string, now = Date.now()): string {
  const minutes = minutesSince(value, now)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} h ago`
  return formatDate(value)
}

/** Blood pressure as one reading, or null when either half is missing. */
export function formatBloodPressure(systolic: number | null, diastolic: number | null) {
  return systolic && diastolic ? `${systolic}/${diastolic}` : null
}
