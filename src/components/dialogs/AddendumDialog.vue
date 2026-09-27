<script setup lang="ts">
import { ref, watch } from 'vue'
import FormError from '@/components/common/FormError.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { required } from '@/composables/useValidation'
import { useEmrStore } from '@/stores/emr'

/** Appends a signed, dated correction to a finalized consultation. */
const props = defineProps<{ consultationId: string | null }>()
const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>({ required: true })

const emr = useEmrStore()
const body = ref('')
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)

watch(open, (value) => value && (body.value = ''))

const { loading, error, run } = useAsyncAction(
  async () => {
    if (!props.consultationId) throw new Error('No consultation selected.')
    await emr.addAddendum(props.consultationId, body.value)
    return true
  },
  { toastOnError: false, successMessage: 'Addendum added.' },
)

async function onSave() {
  const result = await formRef.value?.validate()
  if (!result?.valid) return
  if (await run()) {
    emit('saved')
    open.value = false
  }
}
</script>

<template>
  <v-dialog v-model="open" max-width="560">
    <v-card class="rounded-overlay">
      <v-card-title>Add addendum</v-card-title>
      <v-card-subtitle>
        The original note stays as it was. This is added below it, under your name.
      </v-card-subtitle>
      <v-card-text>
        <v-form ref="formRef" @submit.prevent="onSave">
          <v-textarea
            v-model="body"
            label="Addendum"
            rows="4"
            autofocus
            :rules="[required('The addendum')]"
            :disabled="loading"
          />
          <FormError :message="error" class="mt-4" />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="open = false">Cancel</v-btn>
        <v-btn color="primary" :loading="loading" @click="onSave">Add addendum</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
