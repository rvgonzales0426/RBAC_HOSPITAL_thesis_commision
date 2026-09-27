import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePatientForm } from './usePatientForm'
import { useIntakeForm } from './useIntakeForm'
import { usePermissions } from './usePermissions'
import { useToast } from './useToast'
import { useQueueStore } from '@/stores/queue'
import { PERMISSIONS } from '@/config/permissions'
import { ticketLabel } from '@/config/opd'

type SubmittableForm = { validate: () => Promise<{ valid: boolean }> } | null

/**
 * New-patient registration, optionally straight into the queue — the
 * requirement is that a walk-in is enqueued the moment they are registered.
 */
export function usePatientRegistration() {
  const router = useRouter()
  const toast = useToast()
  const queue = useQueueStore()
  const { can } = usePermissions()

  const patientForm = usePatientForm()
  const intakeForm = useIntakeForm()

  const canEnqueue = can(PERMISSIONS.QueueManage)
  const enqueueNow = ref(canEnqueue)
  const formRef = ref<SubmittableForm>(null)
  const submitting = ref(false)
  const error = ref<string | null>(null)

  async function submit() {
    const result = await formRef.value?.validate()
    if (!result?.valid) return

    submitting.value = true
    error.value = null
    try {
      const patient = await patientForm.save()
      if (!patient) {
        error.value = patientForm.error.value
        return
      }

      if (!enqueueNow.value) {
        toast.success(`${patient.patient_no} registered.`)
        await router.push({ name: 'patient-detail', params: { id: patient.id } })
        return
      }

      try {
        const visit = await queue.enqueue(patient.id, intakeForm.toInput())
        toast.success(`${patient.patient_no} registered and queued as ${ticketLabel(visit.queue_number)}.`)
        await router.push({ name: 'queue' })
      } catch (caught) {
        // The profile exists now; send them to it, where "Add to queue" can retry.
        toast.error(
          `Registered, but not queued: ${caught instanceof Error ? caught.message : 'unknown error'}`,
        )
        await router.push({ name: 'patient-detail', params: { id: patient.id } })
      }
    } finally {
      submitting.value = false
    }
  }

  return {
    patientForm,
    intakeForm,
    canEnqueue,
    enqueueNow,
    formRef,
    submitting,
    error,
    submit,
  }
}
