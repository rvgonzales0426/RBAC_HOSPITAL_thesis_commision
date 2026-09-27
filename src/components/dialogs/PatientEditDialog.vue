<script setup lang="ts">
import { ref, watch } from 'vue'
import FormError from '@/components/common/FormError.vue'
import PatientFormFields from '@/components/patients/PatientFormFields.vue'
import { usePatientForm } from '@/composables/usePatientForm'
import { useToast } from '@/composables/useToast'
import type { Patient } from '@/types'

const props = defineProps<{ patient: Patient }>()
const emit = defineEmits<{ saved: [patient: Patient] }>()
const open = defineModel<boolean>({ required: true })

const toast = useToast()
const { draft, reset, saving, error, save } = usePatientForm(() => props.patient)
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)

// Every opening starts from the saved record, not from a cancelled edit.
watch(open, (value) => value && reset())

async function onSave() {
  const result = await formRef.value?.validate()
  if (!result?.valid) return
  const saved = await save()
  if (saved) {
    toast.success('Patient details saved.')
    emit('saved', saved)
    open.value = false
  }
}
</script>

<template>
  <v-dialog v-model="open" max-width="900" scrollable>
    <v-card class="rounded-overlay">
      <v-card-title>Edit patient details</v-card-title>
      <v-card-subtitle>{{ patient.patient_no }}</v-card-subtitle>
      <v-card-text>
        <v-form ref="formRef" @submit.prevent="onSave">
          <PatientFormFields :draft="draft" :disabled="saving" />
          <FormError :message="error" class="mt-4" />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="open = false">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="onSave">Save changes</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
