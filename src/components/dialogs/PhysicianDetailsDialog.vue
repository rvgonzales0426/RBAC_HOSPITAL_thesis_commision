<script setup lang="ts">
import { reactive, watch } from 'vue'
import FormError from '@/components/common/FormError.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useQueueStore } from '@/stores/queue'

/**
 * The physician's own practice details. The licence number is printed on
 * every prescription; the room tells the desk where to send the patient.
 */
const props = defineProps<{ profileId: string }>()
const open = defineModel<boolean>({ required: true })

const queue = useQueueStore()
const draft = reactive({ license_no: '', specialization: '', room: '' })

watch(open, (value) => {
  if (!value) return
  const row = queue.physicianFor(props.profileId)
  draft.license_no = row?.license_no ?? ''
  draft.specialization = row?.specialization ?? ''
  draft.room = row?.room ?? ''
})

const { loading, error, run } = useAsyncAction(
  async () => {
    await queue.upsertPhysician(props.profileId, {
      license_no: draft.license_no.trim() || null,
      specialization: draft.specialization.trim() || null,
      room: draft.room.trim() || null,
    })
    return true
  },
  { toastOnError: false, successMessage: 'Details saved.' },
)

async function onSave() {
  if (await run()) open.value = false
}
</script>

<template>
  <v-dialog v-model="open" max-width="480">
    <v-card class="rounded-overlay">
      <v-card-title>My practice details</v-card-title>
      <v-card-subtitle>Printed on prescriptions and shown to the desk.</v-card-subtitle>
      <v-card-text>
        <v-form class="d-flex flex-column ga-4" @submit.prevent="onSave">
          <v-text-field v-model="draft.license_no" label="PRC license number" :disabled="loading" />
          <v-text-field
            v-model="draft.specialization"
            label="Specialization"
            placeholder="e.g. Internal Medicine"
            :disabled="loading"
          />
          <v-text-field v-model="draft.room" label="Consultation room" placeholder="e.g. 3" :disabled="loading" />
          <FormError :message="error" />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="open = false">Cancel</v-btn>
        <v-btn color="primary" :loading="loading" @click="onSave">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
