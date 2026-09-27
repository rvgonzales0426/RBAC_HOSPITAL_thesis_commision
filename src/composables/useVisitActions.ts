import { ref } from 'vue'
import { useConsultationStore } from '@/stores/consultation'
import { useAsyncAction } from './useAsyncAction'
import { useToast } from './useToast'
import { ticketLabel } from '@/config/opd'
import type { VisitRecord } from '@/types'

/**
 * The three ways a physician ends their time with the patient in the room:
 * send them to the lab (LabOrderDialog), release them unseen, or complete.
 * Each saves the note first, so nothing typed is lost on the way out.
 */
export function useVisitActions(
  visit: () => VisitRecord | null,
  physicianId: () => string,
  saveNote: () => Promise<boolean>,
) {
  const store = useConsultationStore()
  const toast = useToast()

  const completeOpen = ref(false)
  const releaseOpen = ref(false)

  const complete = useAsyncAction(
    async () => {
      const current = visit()
      if (!current) return
      if (!(await saveNote())) throw new Error('The note could not be saved, so the visit was not completed.')
      await store.complete(current.id, physicianId())
      toast.success(`${ticketLabel(current.queue_number)} completed.`)
      completeOpen.value = false
    },
  )

  const release = useAsyncAction(
    async () => {
      const current = visit()
      if (!current) return
      await saveNote()
      await store.release(current.id, physicianId())
      toast.info(`${ticketLabel(current.queue_number)} is back in the waiting line.`)
      releaseOpen.value = false
    },
  )

  return { completeOpen, releaseOpen, complete, release }
}
