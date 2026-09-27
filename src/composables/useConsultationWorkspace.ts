import { computed, onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useQueueStore } from '@/stores/queue'
import { useConsultationStore } from '@/stores/consultation'
import { useLabStore } from '@/stores/lab'
import { useAsyncAction } from './useAsyncAction'
import { useToast } from './useToast'
import { ticketLabel } from '@/config/opd'
import type { DutyStatus } from '@/types'

/**
 * The physician's portal: their duty status, the Next button, the patient in
 * the room, and their patients elsewhere (at the lab, or back with results).
 */
export function useConsultationWorkspace() {
  const auth = useAuthStore()
  const queue = useQueueStore()
  const consultation = useConsultationStore()
  const lab = useLabStore()
  const toast = useToast()

  const { current, loaded } = storeToRefs(consultation)
  const me = computed(() => auth.user?.id ?? '')

  const dutyStatus = computed<DutyStatus>(
    () => queue.physicianFor(me.value)?.duty_status ?? 'off_duty',
  )
  const waitingCount = computed(() => queue.waiting.length)
  const mine = (list: typeof queue.awaitingLab) =>
    list.filter((visit) => visit.physician_id === me.value)
  const myAtLab = computed(() => mine(queue.awaitingLab))
  const myReady = computed(() => mine(queue.readyForReview))

  const canCallNext = computed(
    () => dutyStatus.value === 'available' && !current.value && loaded.value,
  )

  /** Why Next is disabled, in words — a greyed button with no reason is a support call. */
  const callNextHint = computed(() => {
    if (current.value) return 'Finish or release the patient in the room first.'
    if (dutyStatus.value !== 'available') return 'Set yourself as available to call patients.'
    if (myReady.value.length) return `${myReady.value.length} of your patients are back from the lab and will be called first.`
    if (!waitingCount.value) return 'Nobody is waiting right now.'
    return null
  })

  const releases: (() => void)[] = []

  onMounted(async () => {
    releases.push(queue.subscribe(), consultation.subscribe(me.value))
    try {
      await Promise.all([queue.fetchAll(), consultation.loadCurrent(me.value), lab.ensureCatalog()])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load your workspace.')
    }
  })

  onBeforeUnmount(() => releases.forEach((release) => release()))

  const setDuty = useAsyncAction(
    async (status: DutyStatus) => {
      await queue.setDuty(me.value, status)
    },
    { fallbackError: 'Could not change your status.' },
  )

  const callNext = useAsyncAction(async () => {
    const called = await consultation.callNext(me.value)
    if (!called) {
      toast.info('Nobody is waiting right now.')
      return
    }
    const visit = consultation.current
    if (visit) toast.success(`Now seeing ${ticketLabel(visit.queue_number)}.`)
  })

  return {
    me,
    current,
    loaded,
    dutyStatus,
    waitingCount,
    myAtLab,
    myReady,
    canCallNext,
    callNextHint,
    setDuty,
    callNext,
  }
}
