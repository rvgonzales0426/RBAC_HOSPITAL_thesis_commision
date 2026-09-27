import { computed, onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useOperationsStore } from '@/stores/operations'
import { useStaffStore } from '@/stores/staff'
import { useClock } from './useClock'
import { usePermissions } from './usePermissions'
import { useToast } from './useToast'
import { PERMISSIONS } from '@/config/permissions'
import {
  formatDuration,
  formatRelative,
  minutesSince,
  patientName,
  physicianName,
  ticketLabel,
  type Tone,
} from '@/config/opd'
import type { VisitEvent } from '@/types'

export interface DashboardStat {
  key: string
  label: string
  value: string
  delta?: string
  deltaLabel?: string
  icon?: string
  iconColor?: string
  upIsGood?: boolean
}

export interface ActivityEntry {
  id: string
  title: string
  detail: string
  at: string
  status: string
  tone: Tone
}

export interface AlertEntry {
  id: string
  title: string
  detail: string
  tone: Tone
  label: string
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/**
 * The operations dashboard: headline numbers, the live activity feed, and
 * alerts derived from the same numbers — nothing here is sample data.
 */
export function useDashboard() {
  const store = useOperationsStore()
  const staff = useStaffStore()
  const toast = useToast()
  const { can } = usePermissions()
  const { now } = useClock()
  const { stats: raw, events, loaded } = storeToRefs(store)

  const allowed = computed(() => can(PERMISSIONS.DashboardRead))
  const loading = computed(() => allowed.value && !loaded.value)

  const stats = computed<DashboardStat[]>(() => {
    const s = raw.value
    if (!s) return []
    return [
      {
        key: 'patients',
        label: 'Total registered patients',
        value: s.total_patients.toLocaleString(),
        delta: String(s.registered_today),
        deltaLabel: 'visits today',
        icon: 'mdi-account-multiple-outline',
        iconColor: 'info',
      },
      {
        key: 'waiting',
        label: 'Waiting now',
        value: String(s.waiting),
        delta: s.avg_wait_minutes_today !== null ? `${s.avg_wait_minutes_today} min` : undefined,
        deltaLabel: 'average wait today',
        icon: 'mdi-timer-sand',
        iconColor: 'warning',
      },
      {
        key: 'lab',
        label: 'Pending lab requests',
        value: String(s.pending_lab_requests),
        delta: s.stat_lab_pending ? String(s.stat_lab_pending) : undefined,
        deltaLabel: 'STAT',
        icon: 'mdi-flask-outline',
        iconColor: 'secondary',
      },
      {
        key: 'doctors',
        label: 'Physicians on duty',
        value: String(s.active_physicians),
        delta: String(s.available_physicians),
        deltaLabel: 'free to call',
        icon: 'mdi-stethoscope',
        iconColor: 'success',
      },
    ]
  })

  function describe(event: VisitEvent): Omit<ActivityEntry, 'id' | 'at'> {
    const who = event.patient ? patientName(event.patient) : 'A patient'
    const ticket = event.visit ? ticketLabel(event.visit.queue_number) : ''
    const details = event.details as Record<string, string | undefined>
    const doctor = physicianName(staff.get(details.physician_id ?? event.actor_id))
    const title = `${ticket} ${who}`.trim()

    switch (event.event) {
      case 'registered':
        return { title, detail: 'Joined the waiting line', status: 'Queued', tone: 'pending' }
      case 'called':
        return { title, detail: `Called in by ${doctor}`, status: 'In consultation', tone: 'active' }
      case 'resumed':
        return { title, detail: `Back with ${doctor} to review results`, status: 'In consultation', tone: 'active' }
      case 'sent_to_lab':
        return { title, detail: 'Sent to the laboratory', status: 'At laboratory', tone: 'lab' }
      case 'lab_completed':
        return { title, detail: `${details.order_no ?? 'Lab order'} released`, status: 'Results released', tone: 'lab' }
      case 'lab_amended':
        return {
          title,
          detail: `${details.parameter ?? 'A result'} amended: ${details.old_value} → ${details.new_value}`,
          status: 'Amended',
          tone: 'urgent',
        }
      case 'results_ready':
        return { title, detail: 'Results ready for their physician', status: 'Results ready', tone: 'urgent' }
      case 'returned_to_queue':
        return { title, detail: 'Returned to the waiting line', status: 'Waiting', tone: 'pending' }
      case 'reassigned':
        return { title, detail: `Reassigned to ${doctor}`, status: 'Reassigned', tone: 'pending' }
      case 'completed':
        return { title, detail: `Consultation completed by ${doctor}`, status: 'Completed', tone: 'active' }
      case 'no_show':
        return { title, detail: details.cancel_reason ?? 'Did not answer when called', status: 'No-show', tone: 'neutral' }
      case 'cancelled':
        return { title, detail: details.cancel_reason ?? 'Visit cancelled', status: 'Cancelled', tone: 'neutral' }
      default:
        return { title, detail: event.event, status: event.event, tone: 'neutral' }
    }
  }

  const activity = computed<ActivityEntry[]>(() =>
    events.value.map((event) => ({
      id: String(event.id),
      at: formatRelative(event.created_at, now.value),
      ...describe(event),
    })),
  )

  const alerts = computed<AlertEntry[]>(() => {
    const s = raw.value
    if (!s) return []
    const list: AlertEntry[] = []

    if (s.waiting > 0 && s.available_physicians === 0) {
      list.push({
        id: 'no-physician',
        title: 'Patients waiting, no physician free',
        detail: `${plural(s.waiting, 'patient is', 'patients are')} in line and every physician on duty is busy, on break, or off duty.`,
        tone: 'urgent',
        label: 'Urgent',
      })
    }
    if (s.stale_waiting > 0) {
      list.push({
        id: 'stale',
        title: 'Unclosed queue from an earlier day',
        detail: `${plural(s.stale_waiting, 'visit is', 'visits are')} still waiting from a previous day. Close them from the queue page.`,
        tone: 'urgent',
        label: 'Action',
      })
    }
    if (s.stat_lab_pending > 0) {
      list.push({
        id: 'stat',
        title: 'STAT lab requests pending',
        detail: `${plural(s.stat_lab_pending, 'STAT order is', 'STAT orders are')} not yet released.`,
        tone: 'lab',
        label: 'Lab',
      })
    }
    if (s.oldest_waiting_since && minutesSince(s.oldest_waiting_since, now.value) >= 60) {
      list.push({
        id: 'long-wait',
        title: 'Long wait in the line',
        detail: `The longest-waiting patient has been in line ${formatDuration(minutesSince(s.oldest_waiting_since, now.value))}.`,
        tone: 'pending',
        label: 'Waiting',
      })
    }
    if (s.ready_for_review > 0) {
      list.push({
        id: 'ready',
        title: 'Results waiting for review',
        detail: `${plural(s.ready_for_review, 'patient is', 'patients are')} back from the lab and waiting for their physician.`,
        tone: 'pending',
        label: 'Review',
      })
    }
    if (!list.length) {
      list.push({
        id: 'clear',
        title: 'All clear',
        detail: 'No one is stuck, no STAT work is pending, and the line is moving.',
        tone: 'active',
        label: 'OK',
      })
    }
    return list
  })

  let release: (() => void) | null = null

  onMounted(async () => {
    if (!allowed.value) return
    release = store.subscribe()
    try {
      await store.fetchAll()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load the dashboard.')
    }
  })

  onBeforeUnmount(() => release?.())

  return { allowed, loading, stats, activity, alerts, reload: store.fetchAll }
}
