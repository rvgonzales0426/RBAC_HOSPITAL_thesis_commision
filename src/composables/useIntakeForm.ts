import { reactive } from 'vue'
import { required, type Rule } from './useValidation'
import type { IntakeInput, Visit, Vitals } from '@/types'

type VitalKey = keyof Vitals

/** Text fields bind strings; each vital is parsed on the way out. */
export interface IntakeDraft {
  chief_complaint: string
  is_priority: boolean
  priority_reason: string | null
  vitals: Record<VitalKey, string>
}

/**
 * The accepted range for each reading — the same bounds as the CHECK
 * constraints on visits (0003), so the form catches what the database would
 * reject, with a message a nurse can act on.
 */
export const VITAL_FIELDS: {
  key: VitalKey
  label: string
  unit: string
  min: number
  max: number
  integer: boolean
}[] = [
  { key: 'bp_systolic', label: 'Systolic BP', unit: 'mmHg', min: 40, max: 300, integer: true },
  { key: 'bp_diastolic', label: 'Diastolic BP', unit: 'mmHg', min: 20, max: 200, integer: true },
  { key: 'heart_rate', label: 'Heart rate', unit: 'bpm', min: 20, max: 300, integer: true },
  { key: 'respiratory_rate', label: 'Respiratory rate', unit: '/min', min: 4, max: 80, integer: true },
  { key: 'temperature_c', label: 'Temperature', unit: '°C', min: 30, max: 45, integer: false },
  { key: 'spo2', label: 'SpO₂', unit: '%', min: 50, max: 100, integer: true },
  { key: 'weight_kg', label: 'Weight', unit: 'kg', min: 0.5, max: 400, integer: false },
  { key: 'height_cm', label: 'Height', unit: 'cm', min: 20, max: 260, integer: false },
]

export function vitalRule(field: (typeof VITAL_FIELDS)[number]): Rule {
  return (value) => {
    const text = String(value ?? '').trim()
    if (!text) return true
    const number = Number(text)
    if (!Number.isFinite(number)) return `${field.label} must be a number.`
    if (field.integer && !Number.isInteger(number)) return `${field.label} must be a whole number.`
    if (number < field.min || number > field.max) {
      return `${field.label} should be between ${field.min} and ${field.max} ${field.unit}.`
    }
    return true
  }
}

export const intakeRules = {
  chiefComplaint: [required('Chief complaint')],
  priorityReason: (draft: IntakeDraft): Rule[] => [
    (value) => !draft.is_priority || Boolean(value) || 'Choose why this patient has priority.',
  ],
}

function emptyVitals(): Record<VitalKey, string> {
  return Object.fromEntries(VITAL_FIELDS.map((field) => [field.key, ''])) as Record<VitalKey, string>
}

export function toIntakeInput(draft: IntakeDraft): IntakeInput {
  const vitals = Object.fromEntries(
    VITAL_FIELDS.map((field) => {
      const text = draft.vitals[field.key].trim()
      return [field.key, text ? Number(text) : null]
    }),
  ) as unknown as Vitals

  return {
    chief_complaint: draft.chief_complaint.trim(),
    is_priority: draft.is_priority,
    priority_reason: draft.is_priority ? draft.priority_reason : null,
    ...vitals,
  }
}

/** Intake at the desk: why the patient came, priority lane, and vitals. */
export function useIntakeForm(existing?: () => Visit | null) {
  const draft = reactive<IntakeDraft>({
    chief_complaint: '',
    is_priority: false,
    priority_reason: null,
    vitals: emptyVitals(),
  })

  function reset() {
    const visit = existing?.()
    draft.chief_complaint = visit?.chief_complaint ?? ''
    draft.is_priority = visit?.is_priority ?? false
    draft.priority_reason = visit?.priority_reason ?? null
    const vitals = emptyVitals()
    if (visit) {
      for (const field of VITAL_FIELDS) {
        const value = visit[field.key]
        vitals[field.key] = value === null || value === undefined ? '' : String(value)
      }
    }
    draft.vitals = vitals
  }

  reset()

  return { draft, reset, toInput: () => toIntakeInput(draft) }
}
