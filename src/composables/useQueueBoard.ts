import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useQueueStore } from '@/stores/queue'
import { useAsyncAction } from './useAsyncAction'
import { useClock } from './useClock'
import { usePermissions } from './usePermissions'
import { useToast } from './useToast'
import { PERMISSIONS } from '@/config/permissions'
import { opdToday } from '@/config/opd'
import type { Visit } from '@/types'

/**
 * The OPD floor for the desk: the FIFO line, who is with a doctor, who is at
 * the lab, and the physician roster — all live. Row actions open dialogs;
 * which one is open is state here, not in the table.
 */
export function useQueueBoard() {
  const store = useQueueStore()
  const toast = useToast()
  const { can } = usePermissions()
  const { now } = useClock()
  const { visits, waiting, inConsultation, awaitingLab, readyForReview, physicians, loading, loaded } =
    storeToRefs(store)

  const canManage = computed(() => can(PERMISSIONS.QueueManage))

  // Open flags and targets are separate so a closing dialog keeps its
  // content through the fade instead of flashing empty.
  const intakeOpen = ref(false)
  const cancelOpen = ref(false)
  const reassignOpen = ref(false)
  const target = ref<Visit | null>(null)
  const cancelAsNoShow = ref(false)

  function openIntake(visit: Visit) {
    target.value = visit
    intakeOpen.value = true
  }

  function openCancel(visit: Visit, noShow: boolean) {
    target.value = visit
    cancelAsNoShow.value = noShow
    cancelOpen.value = true
  }

  function openReassign(visit: Visit) {
    target.value = visit
    reassignOpen.value = true
  }

  /** Still waiting from an earlier clinic day — what the end-of-day sweep closes. */
  const stale = computed(() => waiting.value.filter((visit) => visit.visit_date < opdToday()))

  /** Physicians on duty, available before on break. */
  const roster = computed(() =>
    physicians.value
      .filter((physician) => physician.duty_status !== 'off_duty')
      .sort((a, b) => Number(a.duty_status === 'on_break') - Number(b.duty_status === 'on_break')),
  )

  let release: (() => void) | null = null

  onMounted(async () => {
    release = store.subscribe()
    try {
      await store.fetchAll()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load the queue.')
    }
  })

  onBeforeUnmount(() => release?.())

  const closeStale = useAsyncAction(async () => {
    const closed = await store.closeStale()
    toast.success(
      closed === 1 ? '1 visit marked as no-show.' : `${closed} visits marked as no-show.`,
    )
  })

  const refresh = useAsyncAction(() => store.fetchAll())

  return {
    now,
    visits,
    waiting,
    inConsultation,
    awaitingLab,
    readyForReview,
    roster,
    loading,
    loaded,
    stale,
    canManage,
    intakeOpen,
    cancelOpen,
    reassignOpen,
    target,
    cancelAsNoShow,
    openIntake,
    openCancel,
    openReassign,
    closeStale,
    refresh,
  }
}
