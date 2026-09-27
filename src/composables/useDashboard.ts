import { onMounted, ref } from 'vue'

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

export type ClinicalTone = 'active' | 'pending' | 'urgent' | 'lab'

export interface ActivityEntry {
  id: string
  title: string
  detail: string
  at: string
  status: string
  tone: ClinicalTone
}

export interface AlertEntry {
  id: string
  title: string
  detail: string
  tone: ClinicalTone
}

/* ---------------------------------------------------------------------------
 * PLACEHOLDER DATA — REPLACE WITH PROJECT-SPECIFIC DATA
 *
 * Everything below is fake and exists only so the dashboard has something to
 * lay out. For a real project:
 *   1. Add a store, e.g. stores/inventory.ts, with the Supabase queries.
 *   2. Call its actions from here and delete the constants below.
 *   3. Keep the `loading` flag — the skeletons depend on it.
 * ------------------------------------------------------------------------- */

const PLACEHOLDER_STATS: DashboardStat[] = [
  {
    key: 'patients',
    label: 'Total Registered Patients',
    value: '1,284',
    delta: '+3.6%',
    deltaLabel: 'vs yesterday',
    icon: 'mdi-account-multiple-outline',
    iconColor: 'info',
  },
  {
    key: 'queue',
    label: 'Waiting Queue Count',
    value: '32',
    delta: '-2',
    deltaLabel: 'from last hour',
    icon: 'mdi-timer-sand',
    iconColor: 'warning',
    upIsGood: false,
  },
  {
    key: 'lab',
    label: 'Pending Lab Requests',
    value: '14',
    delta: '+1',
    deltaLabel: 'in 30 min',
    icon: 'mdi-flask-outline',
    iconColor: 'secondary',
    upIsGood: false,
  },
  {
    key: 'doctors',
    label: 'Active Doctors',
    value: '7',
    delta: '+1',
    deltaLabel: 'on duty',
    icon: 'mdi-stethoscope',
    iconColor: 'success',
  },
]

const PLACEHOLDER_ACTIVITY: ActivityEntry[] = [
  {
    id: '1',
    title: 'Patient #OPD-2401 checked in',
    detail: 'Maria Santos — General Consultation',
    at: '2 min ago',
    status: 'In Queue',
    tone: 'pending',
  },
  {
    id: '2',
    title: 'Patient #OPD-2402 moved to triage',
    detail: 'Juan Dela Cruz — Vital signs complete',
    at: '8 min ago',
    status: 'Processing',
    tone: 'lab',
  },
  {
    id: '3',
    title: 'Patient #OPD-2398 consultation completed',
    detail: 'Seen by Dr. Alonzo',
    at: '14 min ago',
    status: 'Completed',
    tone: 'active',
  },
]

const PLACEHOLDER_ALERTS: AlertEntry[] = [
  {
    id: '1',
    title: 'Urgent follow-up required',
    detail: 'Patient #OPD-2379 flagged for elevated BP review.',
    tone: 'urgent',
  },
  {
    id: '2',
    title: 'Lab turnaround delay',
    detail: '3 CBC requests are pending longer than 45 minutes.',
    tone: 'lab',
  },
  {
    id: '3',
    title: 'Queue stabilized',
    detail: 'Average wait time is currently 12 minutes.',
    tone: 'active',
  },
]

export function useDashboard() {
  const loading = ref(true)
  const stats = ref<DashboardStat[]>([])
  const activity = ref<ActivityEntry[]>([])
  const alerts = ref<AlertEntry[]>([])

  async function load() {
    loading.value = true
    // Replace this timeout with real store calls.
    await new Promise((resolve) => setTimeout(resolve, 400))
    stats.value = PLACEHOLDER_STATS
    activity.value = PLACEHOLDER_ACTIVITY
    alerts.value = PLACEHOLDER_ALERTS
    loading.value = false
  }

  onMounted(load)

  return { loading, stats, activity, alerts, reload: load }
}
