import { defineStore } from 'pinia'
import { supabase, toMessage } from '@/lib/supabase'
import type { Consultation, LabOrder, Physician, VisitRecord } from '@/types'

/**
 * A visit with its whole clinical record, in one round trip. RLS trims it per
 * reader: OPD staff get the visit without the note (no consultations.read)
 * and without labs (no lab.read); a physician gets everything.
 */
export const VISIT_RECORD_SELECT = `
  *,
  patient:patients(*),
  consultation:consultations(
    *,
    prescriptions(*),
    addenda:consultation_addenda(*)
  ),
  lab_orders(
    *,
    items:lab_order_items(
      *,
      test_type:lab_test_types(*),
      results:lab_result_values(*, amendments:lab_result_amendments(*))
    )
  )
`

const bySortOrder = (a: { sort_order: number }, b: { sort_order: number }) =>
  a.sort_order - b.sort_order
const byCreated = (a: { created_at: string }, b: { created_at: string }) =>
  a.created_at.localeCompare(b.created_at)

function normalizeOrders(orders: LabOrder[] | undefined) {
  return (orders ?? [])
    .map((order) => ({
      ...order,
      items: (order.items ?? []).map((item) => ({
        ...item,
        results: [...(item.results ?? [])].sort(bySortOrder).map((result) => ({
          ...result,
          amendments: [...(result.amendments ?? [])].sort((a, b) =>
            a.amended_at.localeCompare(b.amended_at),
          ),
        })),
      })),
    }))
    .sort((a, b) => a.ordered_at.localeCompare(b.ordered_at))
}

/**
 * Puts a raw row into the shape the screens expect: the one-to-one
 * consultation as an object (PostgREST may send a one-element array), and
 * every child list in reading order.
 */
export function normalizeVisitRecord(raw: unknown): VisitRecord {
  const row = raw as VisitRecord & { consultation?: Consultation | Consultation[] | null }
  const consultation = Array.isArray(row.consultation)
    ? (row.consultation[0] ?? null)
    : (row.consultation ?? null)

  return {
    ...row,
    consultation: consultation && {
      ...consultation,
      prescriptions: [...(consultation.prescriptions ?? [])].sort(bySortOrder),
      addenda: [...(consultation.addenda ?? [])].sort(byCreated),
    },
    lab_orders: normalizeOrders(row.lab_orders),
  }
}

/** The patient's chart: every visit, newest first. */
export const useEmrStore = defineStore('emr', () => {
  async function fetchHistory(patientId: string) {
    const { data, error } = await supabase
      .from('visits')
      .select(VISIT_RECORD_SELECT)
      .eq('patient_id', patientId)
      .order('queued_at', { ascending: false })

    if (error) throw new Error(toMessage(error))
    return (data ?? []).map(normalizeVisitRecord)
  }

  /** One visit plus the prescribing physician's roster row (licence, room) for printing. */
  async function fetchPrescriptionSheet(visitId: string) {
    const { data, error } = await supabase
      .from('visits')
      .select(VISIT_RECORD_SELECT)
      .eq('id', visitId)
      .maybeSingle()

    if (error) throw new Error(toMessage(error))
    if (!data) return null

    const visit = normalizeVisitRecord(data)
    const physicianId = visit.consultation?.physician_id ?? visit.physician_id
    let physician: Physician | null = null
    if (physicianId) {
      const result = await supabase
        .from('physicians')
        .select('*')
        .eq('profile_id', physicianId)
        .maybeSingle()
      if (result.error) throw new Error(toMessage(result.error))
      physician = (result.data as Physician | null) ?? null
    }
    return { visit, physician }
  }

  /** Signed as the current user by the column default; needs a finalized note. */
  async function addAddendum(consultationId: string, body: string) {
    const { error } = await supabase
      .from('consultation_addenda')
      .insert({ consultation_id: consultationId, body: body.trim() })

    if (error) throw new Error(toMessage(error))
  }

  return { fetchHistory, fetchPrescriptionSheet, addAddendum }
})
