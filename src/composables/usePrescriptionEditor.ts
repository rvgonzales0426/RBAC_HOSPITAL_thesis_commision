import { reactive, ref } from 'vue'
import { useConsultationStore } from '@/stores/consultation'
import { useAsyncAction } from './useAsyncAction'
import type { Prescription, PrescriptionInput } from '@/types'

interface RxDraft {
  medicine: string
  dose: string
  frequency: string
  duration: string
  quantity: string
  instructions: string
}

const empty = (): RxDraft => ({
  medicine: '',
  dose: '',
  frequency: '',
  duration: '',
  quantity: '',
  instructions: '',
})

function toInput(draft: RxDraft): PrescriptionInput {
  const text = (value: string) => value.trim() || null
  const quantity = Number.parseInt(draft.quantity, 10)
  return {
    medicine: draft.medicine.trim(),
    dose: text(draft.dose),
    frequency: text(draft.frequency),
    duration: text(draft.duration),
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
    instructions: text(draft.instructions),
  }
}

export const rxRules = {
  medicine: [(value: unknown) => Boolean(String(value ?? '').trim()) || 'Enter the medicine.'],
  quantity: [
    (value: unknown) => {
      const text = String(value ?? '').trim()
      return !text || /^[1-9]\d*$/.test(text) || 'Quantity must be a whole number.'
    },
  ],
}

/**
 * Add, edit and remove prescription lines on the open consultation. One form
 * serves both add and edit; `editing` says which.
 */
export function usePrescriptionEditor(consultationId: () => string | null) {
  const store = useConsultationStore()
  const draft = reactive<RxDraft>(empty())
  const editing = ref<Prescription | null>(null)
  const formOpen = ref(false)

  function startAdd() {
    editing.value = null
    Object.assign(draft, empty())
    formOpen.value = true
  }

  function startEdit(row: Prescription) {
    editing.value = row
    Object.assign(draft, {
      medicine: row.medicine,
      dose: row.dose ?? '',
      frequency: row.frequency ?? '',
      duration: row.duration ?? '',
      quantity: row.quantity ? String(row.quantity) : '',
      instructions: row.instructions ?? '',
    })
    formOpen.value = true
  }

  function cancel() {
    formOpen.value = false
    editing.value = null
  }

  const save = useAsyncAction(
    async () => {
      const id = consultationId()
      if (!id) throw new Error('No consultation is open.')
      if (editing.value) await store.updatePrescription(editing.value, toInput(draft))
      else await store.addPrescription(id, toInput(draft))
      cancel()
    },
    { toastOnError: false },
  )

  const remove = useAsyncAction((row: Prescription) => store.removePrescription(row), {
    successMessage: 'Prescription removed.',
  })

  return { draft, editing, formOpen, startAdd, startEdit, cancel, save, remove }
}
