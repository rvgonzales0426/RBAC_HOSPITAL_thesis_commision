import { reactive, ref } from 'vue'
import { opdToday } from '@/config/opd'
import { usePatientsStore } from '@/stores/patients'
import { useAsyncAction } from './useAsyncAction'
import { required, type Rule } from './useValidation'
import type { Patient, PatientInput, Sex } from '@/types'

/** Every text input holds a string; toInput() turns blanks into nulls. */
export interface PatientDraft {
  last_name: string
  first_name: string
  middle_name: string
  suffix: string
  sex: Sex | null
  birth_date: string
  civil_status: string | null
  contact_number: string
  email: string
  address_line: string
  barangay: string
  city_municipality: string
  province: string
  philhealth_no: string
  emergency_contact_name: string
  emergency_contact_relation: string
  emergency_contact_number: string
  blood_type: string | null
  allergies: string
  chronic_conditions: string
}

const TEXT_FIELDS = [
  'middle_name',
  'suffix',
  'contact_number',
  'email',
  'address_line',
  'barangay',
  'city_municipality',
  'province',
  'philhealth_no',
  'emergency_contact_name',
  'emergency_contact_relation',
  'emergency_contact_number',
  'allergies',
  'chronic_conditions',
] as const

function emptyDraft(): PatientDraft {
  return {
    last_name: '',
    first_name: '',
    middle_name: '',
    suffix: '',
    sex: null,
    birth_date: '',
    civil_status: null,
    contact_number: '',
    email: '',
    address_line: '',
    barangay: '',
    city_municipality: '',
    province: '',
    philhealth_no: '',
    emergency_contact_name: '',
    emergency_contact_relation: '',
    emergency_contact_number: '',
    blood_type: null,
    allergies: '',
    chronic_conditions: '',
  }
}

function draftFrom(patient: Patient): PatientDraft {
  const draft = emptyDraft()
  draft.last_name = patient.last_name
  draft.first_name = patient.first_name
  draft.sex = patient.sex
  draft.birth_date = patient.birth_date
  draft.civil_status = patient.civil_status
  draft.blood_type = patient.blood_type
  for (const field of TEXT_FIELDS) draft[field] = patient[field] ?? ''
  return draft
}

/** Exactly the columns 0005 lets a client write — nothing more. */
export function toPatientInput(draft: PatientDraft): PatientInput {
  const text = (value: string) => value.trim() || null
  const input = {
    last_name: draft.last_name.trim(),
    first_name: draft.first_name.trim(),
    sex: draft.sex as Sex,
    birth_date: draft.birth_date,
    civil_status: draft.civil_status,
    blood_type: draft.blood_type,
  } as PatientInput
  for (const field of TEXT_FIELDS) input[field] = text(draft[field])
  return input
}

export const patientRules = {
  lastName: [required('Last name')],
  firstName: [required('First name')],
  sex: [(value: unknown) => Boolean(value) || 'Choose the patient’s sex.'] as Rule[],
  birthDate: [
    required('Date of birth'),
    (value: unknown) =>
      (typeof value === 'string' && value > '1900-01-01' && value <= opdToday()) ||
      'Enter a date of birth that is not in the future.',
  ] as Rule[],
  email: [
    (value: unknown) =>
      !value ||
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim()) ||
      'That does not look like an email address.',
  ] as Rule[],
}

/**
 * Registration and edit form for a patient profile. For a new patient it
 * also looks for an existing record with the same name and birthday, so the
 * desk opens that one instead of creating a duplicate.
 */
export function usePatientForm(existing?: () => Patient | null) {
  const store = usePatientsStore()
  const draft = reactive<PatientDraft>(emptyDraft())
  const duplicates = ref<Patient[]>([])
  const checkedKey = ref('')

  function reset() {
    const patient = existing?.()
    Object.assign(draft, patient ? draftFrom(patient) : emptyDraft())
    duplicates.value = []
    checkedKey.value = ''
  }

  reset()

  /** Runs once the three identifying fields are filled; cheap enough to run on blur. */
  async function checkDuplicates() {
    if (existing?.()) return
    const { last_name, first_name, birth_date } = draft
    if (!last_name.trim() || !first_name.trim() || !birth_date) return

    const key = `${last_name.trim().toLowerCase()}|${first_name.trim().toLowerCase()}|${birth_date}`
    if (key === checkedKey.value) return
    checkedKey.value = key

    try {
      duplicates.value = await store.findPossibleDuplicates(last_name, first_name, birth_date)
    } catch {
      // A failed courtesy check must not block registration.
      duplicates.value = []
    }
  }

  const { loading, error, run } = useAsyncAction(
    async () => {
      const input = toPatientInput(draft)
      const patient = existing?.()
      return patient ? store.update(patient.id, input) : store.create(input)
    },
    { toastOnError: false },
  )

  return { draft, duplicates, checkDuplicates, reset, saving: loading, error, save: run }
}
