import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase, toMessage } from '@/lib/supabase'
import { OPEN_VISIT_STATUSES } from '@/config/opd'
import { createLiveSubscription } from './realtime'
import { useStaffStore } from './staff'
import type { DutyStatus, IntakeInput, Physician, Visit } from '@/types'

const VISIT_SELECT = '*, patient:patients(*)'

/**
 * The live OPD floor: every open visit and the physician duty roster.
 *
 * Status never changes from here by a plain update — the column is withheld
 * (0005). Moves go through the workflow functions in 0004/0006, which is why
 * most actions below are RPCs.
 */
export const useQueueStore = defineStore('queue', () => {
  const visits = ref<Visit[]>([])
  const physicians = ref<Physician[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  /** FIFO order: the priority lane first, then arrival — as call_next_patient() picks. */
  const waiting = computed(() =>
    visits.value
      .filter((visit) => visit.status === 'waiting')
      .sort(
        (a, b) =>
          Number(b.is_priority) - Number(a.is_priority) ||
          a.queued_at.localeCompare(b.queued_at) ||
          a.queue_number - b.queue_number,
      ),
  )

  const byStatus = (status: Visit['status']) =>
    computed(() =>
      visits.value
        .filter((visit) => visit.status === status)
        .sort((a, b) => a.status_changed_at.localeCompare(b.status_changed_at)),
    )

  const inConsultation = byStatus('in_consultation')
  const awaitingLab = byStatus('awaiting_lab')
  const readyForReview = byStatus('ready_for_review')

  const onDuty = computed(() =>
    physicians.value.filter((physician) => physician.duty_status !== 'off_duty'),
  )

  async function fetchAll() {
    loading.value = true
    try {
      const staff = useStaffStore()
      const [visitsResult, physiciansResult] = await Promise.all([
        supabase
          .from('visits')
          .select(VISIT_SELECT)
          .in('status', OPEN_VISIT_STATUSES)
          .order('queued_at', { ascending: true }),
        supabase.from('physicians').select('*'),
        staff.ensureLoaded(),
      ])

      if (visitsResult.error) throw new Error(toMessage(visitsResult.error))
      if (physiciansResult.error) throw new Error(toMessage(physiciansResult.error))

      visits.value = (visitsResult.data ?? []) as Visit[]
      physicians.value = (physiciansResult.data ?? []) as Physician[]

      // A physician the directory has not seen yet (new account) — refresh it.
      if (physicians.value.some((physician) => !staff.get(physician.profile_id))) {
        await staff.ensureLoaded(true)
      }
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const live = createLiveSubscription('queue', ['visits', 'physicians'], fetchAll)

  function physicianFor(profileId: string | null | undefined) {
    if (!profileId) return null
    return physicians.value.find((physician) => physician.profile_id === profileId) ?? null
  }

  /** Physician is with someone right now — "busy" is derived, never stored. */
  function isBusy(profileId: string) {
    return visits.value.some(
      (visit) => visit.physician_id === profileId && visit.status === 'in_consultation',
    )
  }

  /** Inserting a visit is enqueuing: the database assigns the ticket and FIFO slot. */
  async function enqueue(patientId: string, intake: IntakeInput) {
    const { data, error } = await supabase
      .from('visits')
      .insert({ patient_id: patientId, ...intake })
      .select(VISIT_SELECT)
      .single()

    if (error) throw new Error(toMessage(error))
    const visit = data as Visit
    visits.value = [...visits.value.filter((row) => row.id !== visit.id), visit]
    return visit
  }

  async function updateIntake(visitId: string, intake: IntakeInput) {
    const { data, error } = await supabase
      .from('visits')
      .update(intake)
      .eq('id', visitId)
      .select(VISIT_SELECT)
      .single()

    if (error) throw new Error(toMessage(error))
    replaceLocal(data as Visit)
    return data as Visit
  }

  function replaceLocal(visit: Visit) {
    const open = OPEN_VISIT_STATUSES.includes(visit.status)
    const others = visits.value.filter((row) => row.id !== visit.id)
    visits.value = open ? [...others, visit] : others
  }

  async function rpcVisit(fn: string, args: Record<string, unknown>) {
    const { data, error } = await supabase.rpc(fn, args)
    if (error) throw new Error(toMessage(error))
    const visit = ((data ?? []) as Visit[])[0]
    if (visit) {
      // The RPC row has no patient embedded; keep the one already loaded.
      const known = visits.value.find((row) => row.id === visit.id)
      replaceLocal({ ...visit, patient: known?.patient ?? null })
    }
    return visit ?? null
  }

  const cancel = (visitId: string, reason: string | null, noShow = false) =>
    rpcVisit('cancel_visit', { p_visit_id: visitId, p_reason: reason, p_no_show: noShow })

  const reassign = (visitId: string, physicianId: string) =>
    rpcVisit('reassign_visit', { p_visit_id: visitId, p_physician_id: physicianId })

  /** Marks visits still waiting from earlier days as no-shows. Returns how many. */
  async function closeStale() {
    const { data, error } = await supabase.rpc('close_stale_visits')
    if (error) throw new Error(toMessage(error))
    await fetchAll()
    return (data as number | null) ?? 0
  }

  /**
   * Writes the physician's roster row, creating it on first use so a new
   * physician needs no setup. Only the columns passed are touched.
   */
  async function upsertPhysician(
    profileId: string,
    changes: Partial<Pick<Physician, 'duty_status' | 'license_no' | 'specialization' | 'room'>>,
  ) {
    const { data, error } = await supabase
      .from('physicians')
      .upsert({ profile_id: profileId, ...changes }, { onConflict: 'profile_id' })
      .select('*')
      .single()

    if (error) throw new Error(toMessage(error))
    const row = data as Physician
    physicians.value = [
      ...physicians.value.filter((physician) => physician.profile_id !== profileId),
      row,
    ]
    return row
  }

  const setDuty = (profileId: string, dutyStatus: DutyStatus) =>
    upsertPhysician(profileId, { duty_status: dutyStatus })

  return {
    visits,
    physicians,
    loading,
    loaded,
    waiting,
    inConsultation,
    awaitingLab,
    readyForReview,
    onDuty,
    fetchAll,
    subscribe: live.acquire,
    physicianFor,
    isBusy,
    enqueue,
    updateIntake,
    cancel,
    reassign,
    closeStale,
    upsertPhysician,
    setDuty,
  }
})
