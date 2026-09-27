import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, toMessage } from '@/lib/supabase'
import { createLiveSubscription } from './realtime'
import { useStaffStore } from './staff'
import type { OpdStats, VisitEvent } from '@/types'

/**
 * The monitoring dashboard: the headline numbers from opd_dashboard_stats()
 * (dashboard.read) and the most recent entries of the activity feed.
 */
export const useOperationsStore = defineStore('operations', () => {
  const stats = ref<OpdStats | null>(null)
  const events = ref<VisitEvent[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const [statsResult, eventsResult] = await Promise.all([
        supabase.rpc('opd_dashboard_stats'),
        supabase
          .from('visit_events')
          .select('*, patient:patients(first_name, last_name, patient_no), visit:visits(queue_number)')
          .order('created_at', { ascending: false })
          // Events from one transaction share a timestamp; id keeps their true order.
          .order('id', { ascending: false })
          .limit(25),
        useStaffStore().ensureLoaded(),
      ])

      if (statsResult.error) throw new Error(toMessage(statsResult.error))
      if (eventsResult.error) throw new Error(toMessage(eventsResult.error))

      stats.value = statsResult.data as OpdStats
      events.value = (eventsResult.data ?? []) as VisitEvent[]
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  // visit_events covers every patient movement; the other two move the
  // lab and physician tiles, which have no event of their own.
  const live = createLiveSubscription(
    'operations',
    ['visit_events', 'lab_orders', 'physicians'],
    fetchAll,
  )

  return { stats, events, loading, loaded, fetchAll, subscribe: live.acquire }
})
