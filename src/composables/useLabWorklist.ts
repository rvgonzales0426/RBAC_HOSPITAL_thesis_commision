import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useLabStore } from '@/stores/lab'
import { useStaffStore } from '@/stores/staff'
import { useAsyncAction } from './useAsyncAction'
import { useClock } from './useClock'
import { useToast } from './useToast'
import type { LabItemStatus, LabOrderItem, LabResultValue } from '@/types'

/**
 * The laboratory's portal: incoming orders (STAT first, then oldest), and the
 * last day's releases for amendment. Dialog targets are stored as ids and
 * looked up in the live lists, so a dialog always edits the latest copy —
 * never a stale one from before the last refresh.
 */
export function useLabWorklist() {
  const lab = useLabStore()
  const staff = useStaffStore()
  const toast = useToast()
  const { now } = useClock()
  const { worklist, released, loading, loaded } = storeToRefs(lab)

  const entryOpen = ref(false)
  const entryItemId = ref<string | null>(null)
  const amendOpen = ref(false)
  const amendResultId = ref<string | null>(null)

  const allOrders = computed(() => [...worklist.value, ...released.value])

  const entryOrder = computed(
    () =>
      allOrders.value.find((order) => order.items?.some((item) => item.id === entryItemId.value)) ??
      null,
  )
  const entryItem = computed(
    () => entryOrder.value?.items?.find((item) => item.id === entryItemId.value) ?? null,
  )

  const amendResult = computed<LabResultValue | null>(() => {
    for (const order of released.value) {
      for (const item of order.items ?? []) {
        const match = item.results?.find((result) => result.id === amendResultId.value)
        if (match) return match
      }
    }
    return null
  })

  const statCount = computed(() => worklist.value.filter((order) => order.priority === 'stat').length)

  let release: (() => void) | null = null

  onMounted(async () => {
    release = lab.subscribe()
    try {
      await Promise.all([lab.fetchAll(), staff.ensureLoaded()])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load the lab worklist.')
    }
  })

  onBeforeUnmount(() => release?.())

  function openEntry(item: LabOrderItem) {
    entryItemId.value = item.id
    entryOpen.value = true
  }

  function openAmend(result: LabResultValue) {
    amendResultId.value = result.id
    amendOpen.value = true
  }

  const advance = useAsyncAction(
    async (item: LabOrderItem, status: LabItemStatus) => {
      await lab.setItemStatus(item.id, status)
      await lab.fetchAll()
    },
    { fallbackError: 'Could not update the test.' },
  )

  // Cancelling cannot be undone, so it asks first; moving forward does not.
  const cancelOpen = ref(false)
  const cancelTarget = ref<LabOrderItem | null>(null)

  function onAdvance(item: LabOrderItem, status: LabItemStatus) {
    if (status !== 'cancelled') {
      void advance.run(item, status)
      return
    }
    cancelTarget.value = item
    cancelOpen.value = true
  }

  async function confirmCancel() {
    if (!cancelTarget.value) return
    await advance.run(cancelTarget.value, 'cancelled')
    if (!advance.error.value) cancelOpen.value = false
  }

  const refresh = useAsyncAction(() => lab.fetchAll())

  return {
    now,
    worklist,
    released,
    loading,
    loaded,
    statCount,
    entryOpen,
    entryOrder,
    entryItem,
    amendOpen,
    amendResult,
    openEntry,
    openAmend,
    advance,
    onAdvance,
    cancelOpen,
    cancelTarget,
    confirmCancel,
    refresh,
  }
}
