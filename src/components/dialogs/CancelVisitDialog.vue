<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import FormError from '@/components/common/FormError.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useToast } from '@/composables/useToast'
import { useQueueStore } from '@/stores/queue'
import { patientName, ticketLabel } from '@/config/opd'
import type { Visit } from '@/types'

/** Takes a patient out of the OPD: left before being seen, or never answered their number. */
const props = defineProps<{ visit: Visit | null; noShow: boolean }>()
const open = defineModel<boolean>({ required: true })

const queue = useQueueStore()
const toast = useToast()
const reason = ref('')

watch(open, (value) => value && (reason.value = ''))

const who = computed(() => {
  const visit = props.visit
  if (!visit) return ''
  const name = visit.patient ? patientName(visit.patient) : 'this patient'
  return `${ticketLabel(visit.queue_number)} — ${name}`
})

const { loading, error, run } = useAsyncAction(
  async () => {
    if (!props.visit) return false
    await queue.cancel(props.visit.id, reason.value.trim() || null, props.noShow)
    return true
  },
  { toastOnError: false },
)

async function onConfirm() {
  if (!(await run())) return
  // Read at confirm time: the same dialog serves both actions.
  toast.success(props.noShow ? 'Marked as no-show.' : 'Visit cancelled.')
  open.value = false
}
</script>

<template>
  <v-dialog v-model="open" max-width="480">
    <v-card class="rounded-overlay">
      <v-card-title>{{ noShow ? 'Mark as no-show' : 'Cancel visit' }}</v-card-title>
      <v-card-subtitle>{{ who }}</v-card-subtitle>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-4">
          <template v-if="noShow">
            The patient was called and did not come forward. They leave the queue; their record
            stays.
          </template>
          <template v-else>
            The visit closes and any unfinished lab tests on it are cancelled. The record stays.
          </template>
        </p>
        <v-text-field
          v-model="reason"
          :label="noShow ? 'Note (optional)' : 'Reason'"
          :placeholder="noShow ? 'e.g. Called three times' : 'e.g. Patient left, went to ER'"
          :disabled="loading"
          autofocus
        />
        <FormError :message="error" class="mt-4" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="open = false">Keep in queue</v-btn>
        <v-btn color="error" :loading="loading" @click="onConfirm">
          {{ noShow ? 'Mark as no-show' : 'Cancel visit' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
