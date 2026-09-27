import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, toMessage } from '@/lib/supabase'
import { createLiveSubscription } from './realtime'
import type {
  LabItemStatus,
  LabOrder,
  LabResultValue,
  LabTestType,
  ResultEntry,
  ResultFlag,
} from '@/types'

const ORDER_SELECT = `
  *,
  patient:patients(*),
  items:lab_order_items(
    *,
    test_type:lab_test_types(*, parameters:lab_test_parameters(*)),
    results:lab_result_values(*, amendments:lab_result_amendments(*))
  )
`

const bySortOrder = (a: { sort_order: number }, b: { sort_order: number }) =>
  a.sort_order - b.sort_order

function normalizeOrder(order: LabOrder): LabOrder {
  return {
    ...order,
    items: (order.items ?? []).map((item) => ({
      ...item,
      test_type: item.test_type && {
        ...item.test_type,
        parameters: [...(item.test_type.parameters ?? [])].sort(bySortOrder),
      },
      results: [...(item.results ?? [])].sort(bySortOrder),
    })),
  }
}

/**
 * The laboratory: the orderable catalog, the incoming worklist, and result
 * entry. Items move forward only with lab.process (0004 trigger); a released
 * result changes only through amend_lab_result() (0006).
 */
export const useLabStore = defineStore('lab', () => {
  const catalog = ref<LabTestType[]>([])
  const catalogLoaded = ref(false)
  const worklist = ref<LabOrder[]>([])
  const released = ref<LabOrder[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  async function ensureCatalog() {
    if (catalogLoaded.value) return
    const { data, error } = await supabase
      .from('lab_test_types')
      .select('*, parameters:lab_test_parameters(*)')
      .eq('is_active', true)
      .order('sort_order')

    if (error) throw new Error(toMessage(error))
    catalog.value = ((data ?? []) as LabTestType[]).map((test) => ({
      ...test,
      parameters: [...(test.parameters ?? [])].sort(bySortOrder),
    }))
    catalogLoaded.value = true
  }

  /** Open orders STAT-first then oldest-first, plus the last day of releases. */
  async function fetchAll() {
    loading.value = true
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const [openResult, releasedResult] = await Promise.all([
        supabase
          .from('lab_orders')
          .select(ORDER_SELECT)
          .in('status', ['requested', 'in_progress'])
          // Enum order is routine < stat, so descending puts STAT on top.
          .order('priority', { ascending: false })
          .order('ordered_at', { ascending: true }),
        supabase
          .from('lab_orders')
          .select(ORDER_SELECT)
          .eq('status', 'completed')
          .gte('completed_at', since)
          .order('completed_at', { ascending: false })
          .limit(50),
      ])

      if (openResult.error) throw new Error(toMessage(openResult.error))
      if (releasedResult.error) throw new Error(toMessage(releasedResult.error))

      worklist.value = ((openResult.data ?? []) as LabOrder[]).map(normalizeOrder)
      released.value = ((releasedResult.data ?? []) as LabOrder[]).map(normalizeOrder)
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const live = createLiveSubscription(
    'lab',
    ['lab_orders', 'lab_order_items'],
    fetchAll,
  )

  /** status and remarks are the only item columns a client may write (0005). */
  async function updateItem(itemId: string, changes: { status?: LabItemStatus; remarks?: string | null }) {
    const { data, error } = await supabase
      .from('lab_order_items')
      .update(changes)
      .eq('id', itemId)
      .select('id')

    if (error) throw new Error(toMessage(error))
    if (!data?.length) throw new Error('That test could not be updated. Refresh and try again.')
  }

  const setItemStatus = (itemId: string, status: LabItemStatus) => updateItem(itemId, { status })

  /**
   * Writes the grid for one test: new values inserted, edited ones updated,
   * cleared ones deleted. Blank rows are simply not results.
   */
  async function saveResults(itemId: string, entries: ResultEntry[], existing: LabResultValue[]) {
    const filled = entries.filter((entry) => entry.value.trim() && entry.parameter_name.trim())
    const keptIds = new Set(filled.filter((entry) => entry.id).map((entry) => entry.id))
    const toDelete = existing.filter((row) => !keptIds.has(row.id)).map((row) => row.id)

    const row = (entry: ResultEntry) => ({
      parameter_id: entry.parameter_id,
      parameter_name: entry.parameter_name.trim(),
      value: entry.value.trim(),
      unit: entry.unit?.trim() || null,
      reference_range: entry.reference_range?.trim() || null,
      flag: entry.flag,
      sort_order: entry.sort_order,
    })

    if (toDelete.length) {
      const { error } = await supabase.from('lab_result_values').delete().in('id', toDelete)
      if (error) throw new Error(toMessage(error))
    }

    const updates = filled.filter((entry) => entry.id)
    const results = await Promise.all(
      updates.map((entry) =>
        supabase.from('lab_result_values').update(row(entry)).eq('id', entry.id!),
      ),
    )
    const failed = results.find((result) => result.error)
    if (failed?.error) throw new Error(toMessage(failed.error))

    const inserts = filled.filter((entry) => !entry.id).map((entry) => ({ ...row(entry), item_id: itemId }))
    if (inserts.length) {
      const { error } = await supabase.from('lab_result_values').insert(inserts)
      if (error) throw new Error(toMessage(error))
    }
  }

  /**
   * Keeps the grid without releasing it. A test still marked requested or
   * collected moves to in progress, since someone is now working on it.
   */
  async function saveDraft(
    itemId: string,
    currentStatus: LabItemStatus,
    entries: ResultEntry[],
    existing: LabResultValue[],
    remarks: string | null,
  ) {
    await saveResults(itemId, entries, existing)
    const advance = currentStatus === 'requested' || currentStatus === 'specimen_collected'
    await updateItem(itemId, advance ? { status: 'in_progress', remarks } : { remarks })
    await fetchAll()
  }

  /** Saving and releasing in one step; the database refuses a release with no results. */
  async function release(
    itemId: string,
    entries: ResultEntry[],
    existing: LabResultValue[],
    remarks: string | null,
  ) {
    await saveResults(itemId, entries, existing)
    await updateItem(itemId, { status: 'completed', remarks })
    await fetchAll()
  }

  async function amend(resultId: string, value: string, reason: string, flag: ResultFlag | null) {
    const { error } = await supabase.rpc('amend_lab_result', {
      p_result_id: resultId,
      p_value: value,
      p_reason: reason,
      p_flag: flag,
    })
    if (error) throw new Error(toMessage(error))
    await fetchAll()
  }

  return {
    catalog,
    worklist,
    released,
    loading,
    loaded,
    ensureCatalog,
    fetchAll,
    subscribe: live.acquire,
    updateItem,
    setItemStatus,
    saveResults,
    saveDraft,
    release,
    amend,
  }
})
