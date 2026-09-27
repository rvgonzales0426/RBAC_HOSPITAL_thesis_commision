import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase, toMessage } from '@/lib/supabase'
import type { StaffMember } from '@/types'

/**
 * Colleagues' names and roles, from the staff_directory view (0003). The
 * user directory itself needs users.read; this does not, because every
 * clinical screen has to say which doctor has which patient.
 *
 * Loaded once and resolved by id in the browser — the tables hold profile
 * ids, and a lookup map is cheaper than joining names into every query.
 */
export const useStaffStore = defineStore('staff', () => {
  const members = ref<StaffMember[]>([])
  const loaded = ref(false)
  let pending: Promise<void> | null = null

  const byId = computed(() => new Map(members.value.map((member) => [member.id, member])))

  async function load() {
    const { data, error } = await supabase
      .from('staff_directory')
      .select('*')
      .order('full_name', { ascending: true })

    if (error) throw new Error(toMessage(error))
    members.value = (data ?? []) as StaffMember[]
    loaded.value = true
  }

  /** Concurrent callers share one request. Pass force to pick up new staff. */
  async function ensureLoaded(force = false) {
    if (loaded.value && !force) return
    pending ??= load().finally(() => (pending = null))
    await pending
  }

  function get(id: string | null | undefined): StaffMember | null {
    if (!id) return null
    return byId.value.get(id) ?? null
  }

  return { members, loaded, ensureLoaded, get }
})
