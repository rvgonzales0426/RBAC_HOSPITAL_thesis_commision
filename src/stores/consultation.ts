import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, toMessage } from '@/lib/supabase'
import { VISIT_RECORD_SELECT, normalizeVisitRecord } from './emr'
import { createLiveSubscription } from './realtime'
import type {
  ConsultationNote,
  LabOrder,
  LabPriority,
  Prescription,
  PrescriptionInput,
  VisitRecord,
} from '@/types'

/**
 * The physician's workspace: the one patient they have in the room, with the
 * full record for that visit. The queue lists around it come from the queue
 * store; this store owns the visit being worked on.
 */
export const useConsultationStore = defineStore('consultation', () => {
  const current = ref<VisitRecord | null>(null)
  const loading = ref(false)
  const loaded = ref(false)

  /** At most one row: call_next_patient() refuses a second in_consultation. */
  async function loadCurrent(physicianId: string) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('visits')
        .select(VISIT_RECORD_SELECT)
        .eq('physician_id', physicianId)
        .eq('status', 'in_consultation')
        .limit(1)
        .maybeSingle()

      if (error) throw new Error(toMessage(error))
      current.value = data ? normalizeVisitRecord(data) : null
      loaded.value = true
      return current.value
    } finally {
      loading.value = false
    }
  }

  let watchedPhysician: string | null = null
  const live = createLiveSubscription(
    'consultation',
    ['visits', 'lab_orders', 'lab_order_items'],
    () => (watchedPhysician ? loadCurrent(watchedPhysician) : undefined),
  )

  function subscribe(physicianId: string) {
    watchedPhysician = physicianId
    return live.acquire()
  }

  async function rpc(fn: string, args: Record<string, unknown> = {}) {
    const { data, error } = await supabase.rpc(fn, args)
    if (error) throw new Error(toMessage(error))
    return data
  }

  /** Returns false when nobody is waiting. */
  async function callNext(physicianId: string) {
    const rows = (await rpc('call_next_patient')) as unknown[] | null
    await loadCurrent(physicianId)
    return Boolean(rows?.length)
  }

  async function release(visitId: string, physicianId: string) {
    await rpc('release_patient', { p_visit_id: visitId })
    await loadCurrent(physicianId)
  }

  async function complete(visitId: string, physicianId: string) {
    await rpc('complete_visit', { p_visit_id: visitId })
    await loadCurrent(physicianId)
  }

  async function orderLabs(
    visitId: string,
    physicianId: string,
    testTypeIds: string[],
    priority: LabPriority,
    clinicalNotes: string | null,
  ) {
    const order = (await rpc('order_labs', {
      p_visit_id: visitId,
      p_test_type_ids: testTypeIds,
      p_priority: priority,
      p_clinical_notes: clinicalNotes,
    })) as LabOrder
    await loadCurrent(physicianId)
    return order
  }

  async function saveNote(consultationId: string, note: ConsultationNote) {
    const { data, error } = await supabase
      .from('consultations')
      .update(note)
      .eq('id', consultationId)
      .select('*')
      .single()

    if (error) throw new Error(toMessage(error))
    if (current.value?.consultation?.id === consultationId) {
      current.value.consultation = { ...current.value.consultation, ...data }
    }
  }

  function setPrescriptions(consultationId: string, rows: Prescription[]) {
    if (current.value?.consultation?.id === consultationId) {
      current.value.consultation.prescriptions = rows
    }
  }

  function currentPrescriptions() {
    return current.value?.consultation?.prescriptions ?? []
  }

  async function addPrescription(consultationId: string, input: PrescriptionInput) {
    const existing = currentPrescriptions()
    const sortOrder = existing.reduce((max, row) => Math.max(max, row.sort_order), 0) + 1

    const { data, error } = await supabase
      .from('prescriptions')
      .insert({ ...input, consultation_id: consultationId, sort_order: sortOrder })
      .select('*')
      .single()

    if (error) throw new Error(toMessage(error))
    setPrescriptions(consultationId, [...existing, data as Prescription])
  }

  async function updatePrescription(row: Prescription, input: PrescriptionInput) {
    const { data, error } = await supabase
      .from('prescriptions')
      .update(input)
      .eq('id', row.id)
      .select('*')
      .single()

    if (error) throw new Error(toMessage(error))
    setPrescriptions(
      row.consultation_id,
      currentPrescriptions().map((item) => (item.id === row.id ? (data as Prescription) : item)),
    )
  }

  async function removePrescription(row: Prescription) {
    // RLS turns a refused delete into zero rows, not an error — so ask for them back.
    const { data, error } = await supabase.from('prescriptions').delete().eq('id', row.id).select('id')
    if (error) throw new Error(toMessage(error))
    if (!data?.length) throw new Error('That prescription can no longer be changed.')
    setPrescriptions(
      row.consultation_id,
      currentPrescriptions().filter((item) => item.id !== row.id),
    )
  }

  return {
    current,
    loading,
    loaded,
    loadCurrent,
    subscribe,
    callNext,
    release,
    complete,
    orderLabs,
    saveNote,
    addPrescription,
    updatePrescription,
    removePrescription,
  }
})
