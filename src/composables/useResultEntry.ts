import { computed, ref, watch } from 'vue'
import { useLabStore } from '@/stores/lab'
import { useAsyncAction } from './useAsyncAction'
import { useToast } from './useToast'
import type { LabOrderItem, LabTestParameter, ResultEntry, ResultFlag } from '@/types'

const NUMBER = /^-?\d+(\.\d+)?$/

/**
 * What the database will flag a number as (0004 trigger), shown while typing
 * so the tech sees "High" before releasing rather than after.
 */
export function previewFlag(
  value: string,
  parameter: Pick<LabTestParameter, 'ref_low' | 'ref_high'> | undefined,
): ResultFlag | null {
  if (!parameter || !NUMBER.test(value.trim())) return null
  const number = Number(value.trim())
  if (parameter.ref_low !== null && number < parameter.ref_low) return 'low'
  if (parameter.ref_high !== null && number > parameter.ref_high) return 'high'
  if (parameter.ref_low !== null || parameter.ref_high !== null) return 'normal'
  return null
}

/**
 * The result grid for one test: a row per catalog parameter, pre-filled with
 * anything saved earlier, plus free rows for findings the catalog lacks.
 */
export function useResultEntry(item: () => LabOrderItem | null) {
  const lab = useLabStore()
  const toast = useToast()

  const entries = ref<ResultEntry[]>([])
  const remarks = ref('')

  const parameters = computed(() => item()?.test_type?.parameters ?? [])
  const parameterById = computed(
    () => new Map(parameters.value.map((parameter) => [parameter.id, parameter])),
  )

  function reset() {
    const current = item()
    if (!current) {
      entries.value = []
      remarks.value = ''
      return
    }
    const saved = current.results ?? []
    const fromCatalog: ResultEntry[] = parameters.value.map((parameter) => {
      const existing = saved.find((row) => row.parameter_id === parameter.id)
      return {
        id: existing?.id,
        parameter_id: parameter.id,
        parameter_name: parameter.name,
        value: existing?.value ?? '',
        unit: existing?.unit ?? parameter.unit,
        reference_range: existing?.reference_range ?? parameter.reference_range,
        flag: existing?.flag ?? null,
        sort_order: parameter.sort_order,
      }
    })
    const extra: ResultEntry[] = saved
      .filter((row) => !row.parameter_id || !parameterById.value.has(row.parameter_id))
      .map((row) => ({
        id: row.id,
        parameter_id: row.parameter_id,
        parameter_name: row.parameter_name,
        value: row.value,
        unit: row.unit,
        reference_range: row.reference_range,
        flag: row.flag,
        sort_order: row.sort_order,
      }))
    entries.value = [...fromCatalog, ...extra]
    remarks.value = current.remarks ?? ''
  }

  watch(() => item()?.id, reset, { immediate: true })

  function addRow() {
    const last = entries.value.reduce((max, row) => Math.max(max, row.sort_order), 0)
    entries.value.push({
      parameter_id: null,
      parameter_name: '',
      value: '',
      unit: null,
      reference_range: null,
      flag: null,
      sort_order: last + 1,
    })
  }

  function removeRow(index: number) {
    entries.value.splice(index, 1)
  }

  const suggestedFlag = (entry: ResultEntry) =>
    previewFlag(entry.value, entry.parameter_id ? parameterById.value.get(entry.parameter_id) : undefined)

  const filledCount = computed(
    () => entries.value.filter((entry) => entry.value.trim() && entry.parameter_name.trim()).length,
  )

  const remarksValue = () => remarks.value.trim() || null

  const saveDraft = useAsyncAction(
    async () => {
      const current = item()
      if (!current) return false
      await lab.saveDraft(current.id, current.status, entries.value, current.results ?? [], remarksValue())
      toast.success('Results saved. Not yet released.')
      return true
    },
    { toastOnError: false },
  )

  const release = useAsyncAction(
    async () => {
      const current = item()
      if (!current) return false
      if (!filledCount.value) throw new Error('Enter at least one result before releasing.')
      await lab.release(current.id, entries.value, current.results ?? [], remarksValue())
      toast.success(`${current.test_type?.name ?? 'Test'} released to the physician.`)
      return true
    },
    { toastOnError: false },
  )

  return {
    entries,
    remarks,
    filledCount,
    suggestedFlag,
    addRow,
    removeRow,
    reset,
    saveDraft,
    release,
  }
}
