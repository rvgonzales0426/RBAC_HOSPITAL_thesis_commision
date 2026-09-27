<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import FormError from '@/components/common/FormError.vue'
import IntakeFields from '@/components/opd/IntakeFields.vue'
import { useIntakeForm } from '@/composables/useIntakeForm'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useToast } from '@/composables/useToast'
import { useQueueStore } from '@/stores/queue'
import { patientName, ticketLabel } from '@/config/opd'
import type { Patient, Visit } from '@/types'

/**
 * Two jobs, one form: queue a returning patient (pass `patient`), or correct
 * the intake of a visit already in the queue (pass `visit`).
 */
const props = defineProps<{ patient?: Patient | null; visit?: Visit | null }>()
const emit = defineEmits<{ saved: [visit: Visit] }>()
const open = defineModel<boolean>({ required: true })

const queue = useQueueStore()
const toast = useToast()
const { draft, reset, toInput } = useIntakeForm(() => props.visit ?? null)
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)

const editing = computed(() => Boolean(props.visit))
const subject = computed(() => props.visit?.patient ?? props.patient ?? null)

watch(open, (value) => value && reset())

const { loading, error, run } = useAsyncAction(
  async () => {
    if (props.visit) return queue.updateIntake(props.visit.id, toInput())
    if (!props.patient) throw new Error('Choose a patient first.')
    return queue.enqueue(props.patient.id, toInput())
  },
  { toastOnError: false },
)

async function onSave() {
  const result = await formRef.value?.validate()
  if (!result?.valid) return
  const visit = await run()
  if (visit) {
    toast.success(editing.value ? 'Intake updated.' : `Queued as ${ticketLabel(visit.queue_number)}.`)
    emit('saved', visit)
    open.value = false
  }
}
</script>

<template>
  <v-dialog v-model="open" max-width="720" scrollable>
    <v-card class="rounded-overlay">
      <v-card-title>{{ editing ? 'Edit intake' : 'Add to queue' }}</v-card-title>
      <v-card-subtitle v-if="subject">{{ patientName(subject) }} · {{ subject.patient_no }}</v-card-subtitle>
      <v-card-text>
        <v-form ref="formRef" @submit.prevent="onSave">
          <IntakeFields :draft="draft" :disabled="loading" />
          <FormError :message="error" class="mt-4" />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="open = false">Cancel</v-btn>
        <v-btn color="primary" :loading="loading" @click="onSave">
          {{ editing ? 'Save intake' : 'Add to queue' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
