<script setup lang="ts">
import { ref, watch } from 'vue'
import FormError from '@/components/common/FormError.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { required } from '@/composables/useValidation'
import { useLabStore } from '@/stores/lab'
import { RESULT_FLAG, RESULT_FLAG_OPTIONS } from '@/config/opd'
import type { LabResultValue, ResultFlag } from '@/types'

/**
 * Corrects a released value. The old value, the new one and the reason are
 * kept (lab_result_amendments), and the physician's view marks it Amended.
 */
const props = defineProps<{ result: LabResultValue | null }>()
const open = defineModel<boolean>({ required: true })

const lab = useLabStore()
const value = ref('')
const flag = ref<ResultFlag | null>(null)
const reason = ref('')
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)

watch(open, (isOpen) => {
  if (!isOpen || !props.result) return
  value.value = props.result.value
  flag.value = null
  reason.value = ''
})

const { loading, error, run } = useAsyncAction(
  async () => {
    if (!props.result) return false
    await lab.amend(props.result.id, value.value.trim(), reason.value.trim(), flag.value)
    return true
  },
  { toastOnError: false, successMessage: 'Result amended.' },
)

async function onSave() {
  const check = await formRef.value?.validate()
  if (!check?.valid) return
  if (await run()) open.value = false
}
</script>

<template>
  <v-dialog v-model="open" max-width="520">
    <v-card class="rounded-overlay">
      <v-card-title>Amend released result</v-card-title>
      <v-card-subtitle v-if="result">
        {{ result.parameter_name }} — currently {{ result.value }} {{ result.unit ?? '' }}
        <template v-if="result.flag">({{ RESULT_FLAG[result.flag].label }})</template>
      </v-card-subtitle>
      <v-card-text>
        <v-form ref="formRef" class="d-flex flex-column ga-4" @submit.prevent="onSave">
          <v-text-field
            v-model="value"
            label="Corrected value"
            :suffix="result?.unit ?? undefined"
            :rules="[required('The corrected value')]"
            :disabled="loading"
            autofocus
          />
          <v-select
            v-model="flag"
            :items="RESULT_FLAG_OPTIONS"
            label="Flag"
            placeholder="Auto — from the reference range"
            persistent-placeholder
            clearable
            :disabled="loading"
          />
          <v-textarea
            v-model="reason"
            label="Reason for amendment"
            placeholder="e.g. Transcription error; rerun on a fresh specimen"
            rows="2"
            :rules="[required('A reason')]"
            :disabled="loading"
          />
          <FormError :message="error" />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="open = false">Cancel</v-btn>
        <v-btn color="primary" :loading="loading" @click="onSave">Amend result</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
