import { computed, ref, watch } from 'vue'
import { usePatientsStore } from '@/stores/patients'
import { useEmrStore } from '@/stores/emr'
import { useStaffStore } from '@/stores/staff'
import { usePermissions } from './usePermissions'
import { OPEN_VISIT_STATUSES } from '@/config/opd'
import { PERMISSIONS } from '@/config/permissions'
import type { Patient, VisitRecord } from '@/types'

/**
 * One patient's page: the profile, their chart, and the dialogs opened from
 * it. Reloads when the route's id changes, so linking patient to patient works.
 */
export function usePatientRecord(patientId: () => string) {
  const patients = usePatientsStore()
  const emr = useEmrStore()
  const staff = useStaffStore()
  const { can, canAny } = usePermissions()

  const patient = ref<Patient | null>(null)
  const visits = ref<VisitRecord[]>([])
  const loading = ref(true)
  const notFound = ref(false)
  const error = ref<string | null>(null)

  const editOpen = ref(false)
  const intakeOpen = ref(false)
  const addendumFor = ref<string | null>(null)

  /** Visits are readable with queue.read or consultations.read (0005). */
  const canSeeHistory = computed(() =>
    canAny([PERMISSIONS.QueueRead, PERMISSIONS.ConsultationsRead]),
  )
  const canEdit = computed(() => can(PERMISSIONS.PatientsWrite))
  const canEnqueue = computed(() => can(PERMISSIONS.QueueManage))
  const canAddAddendum = computed(() => can(PERMISSIONS.ConsultationsWrite))

  /** The database allows one open visit per patient; the button says so up front. */
  const openVisit = computed(
    () => visits.value.find((visit) => OPEN_VISIT_STATUSES.includes(visit.status)) ?? null,
  )

  async function loadHistory() {
    if (!canSeeHistory.value) return
    visits.value = await emr.fetchHistory(patientId())
  }

  async function load() {
    loading.value = true
    error.value = null
    notFound.value = false
    try {
      const [found] = await Promise.all([
        patients.fetchById(patientId()),
        staff.ensureLoaded(),
      ])
      patient.value = found
      notFound.value = !found
      if (found) await loadHistory()
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Could not load this patient.'
    } finally {
      loading.value = false
    }
  }

  watch(patientId, load, { immediate: true })

  return {
    patient,
    visits,
    loading,
    notFound,
    error,
    openVisit,
    canSeeHistory,
    canEdit,
    canEnqueue,
    canAddAddendum,
    editOpen,
    intakeOpen,
    addendumFor,
    reload: load,
    reloadHistory: loadHistory,
    onSaved: (updated: Patient) => (patient.value = updated),
  }
}
