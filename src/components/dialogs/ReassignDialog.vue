<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import FormError from '@/components/common/FormError.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useQueueStore } from '@/stores/queue'
import { useStaffStore } from '@/stores/staff'
import { DUTY_STATUS, VISIT_STATUS, patientName, physicianName, ticketLabel } from '@/config/opd'
import type { Visit } from '@/types'

/**
 * Hands a patient to another on-duty physician — the fix for a doctor who
 * leaves while their patient is at the lab. The unfinished note goes along.
 */
const props = defineProps<{ visit: Visit | null }>()
const open = defineModel<boolean>({ required: true })

const queue = useQueueStore()
const staff = useStaffStore()
const physicianId = ref<string | null>(null)

watch(open, (value) => value && (physicianId.value = null))

const options = computed(() =>
  queue.onDuty
    .filter((physician) => physician.profile_id !== props.visit?.physician_id)
    .map((physician) => ({
      value: physician.profile_id,
      title: physicianName(staff.get(physician.profile_id)),
      subtitle: queue.isBusy(physician.profile_id)
        ? 'With a patient'
        : DUTY_STATUS[physician.duty_status].label,
    })),
)

const summary = computed(() => {
  const visit = props.visit
  if (!visit) return ''
  const name = visit.patient ? patientName(visit.patient) : 'Patient'
  return `${ticketLabel(visit.queue_number)} — ${name} · ${VISIT_STATUS[visit.status].label}`
})

const { loading, error, run } = useAsyncAction(
  async () => {
    if (!props.visit || !physicianId.value) throw new Error('Choose a physician.')
    await queue.reassign(props.visit.id, physicianId.value)
    return true
  },
  { toastOnError: false, successMessage: 'Patient reassigned.' },
)

async function onConfirm() {
  if (await run()) open.value = false
}
</script>

<template>
  <v-dialog v-model="open" max-width="480">
    <v-card class="rounded-overlay">
      <v-card-title>Reassign physician</v-card-title>
      <v-card-subtitle>{{ summary }}</v-card-subtitle>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Currently with {{ physicianName(staff.get(visit?.physician_id)) }}. The new physician
          sees this patient next, ahead of new arrivals.
        </p>
        <v-select
          v-model="physicianId"
          :items="options"
          label="New physician"
          :disabled="loading"
          :no-data-text="'No other physician is on duty.'"
        >
          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :subtitle="item.raw.subtitle" />
          </template>
        </v-select>
        <FormError :message="error" class="mt-4" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="open = false">Cancel</v-btn>
        <v-btn color="primary" :loading="loading" :disabled="!physicianId" @click="onConfirm">
          Reassign
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
