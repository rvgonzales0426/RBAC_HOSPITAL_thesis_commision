import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/**
 * Live updates for the OPD stores.
 *
 * Every change on a watched table triggers a debounced refetch rather than a
 * patch of local state: the refetch runs through RLS and the same joins as
 * the first load, so what a screen shows can never drift from what the
 * database would return. A burst of changes (one lab release touches the
 * item, the order and the visit) collapses into a single reload.
 *
 * Lives beside the stores because it is the only other place allowed to
 * import the Supabase client.
 */
function watchTables(name: string, tables: string[], onChange: () => void, delay = 300) {
  let timer: ReturnType<typeof setTimeout> | null = null
  const schedule = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(onChange, delay)
  }

  // A unique suffix, so two stores watching the same table never share a channel.
  let channel: RealtimeChannel = supabase.channel(`${name}-${Math.random().toString(36).slice(2)}`)
  for (const table of tables) {
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, schedule)
  }
  channel.subscribe()

  return () => {
    if (timer) clearTimeout(timer)
    void supabase.removeChannel(channel)
  }
}

/**
 * A reference-counted subscription. Several mounted screens can hold it; the
 * channel opens with the first and closes with the last.
 *
 *   const live = createLiveSubscription('queue', ['visits'], refresh)
 *   const release = live.acquire()   // in onMounted
 *   release()                        // in onBeforeUnmount
 */
export function createLiveSubscription(name: string, tables: string[], refresh: () => unknown) {
  let holders = 0
  let stop: (() => void) | null = null

  function acquire() {
    holders += 1
    if (!stop) {
      stop = watchTables(name, tables, () => {
        Promise.resolve(refresh()).catch((error) => {
          console.error(`[realtime:${name}] Refresh failed.`, error)
        })
      })
    }

    let released = false
    return () => {
      if (released) return
      released = true
      holders -= 1
      if (holders <= 0 && stop) {
        stop()
        stop = null
        holders = 0
      }
    }
  }

  return { acquire }
}
