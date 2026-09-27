<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import FormError from '@/components/common/FormError.vue'
import PatientFormFields from '@/components/patients/PatientFormFields.vue'
import IntakeFields from '@/components/opd/IntakeFields.vue'
import { usePatientRegistration } from '@/composables/usePatientRegistration'
import { formatDate, patientName } from '@/config/opd'

const { patientForm, intakeForm, canEnqueue, enqueueNow, formRef, submitting, error, submit } =
  usePatientRegistration()
const { draft, duplicates, checkDuplicates } = patientForm
</script>

<template>
  <PageHeader
    title="Register patient"
    description="Create the patient’s record. Queue them in the same step if they are here for a consultation today."
  />

  <v-form ref="formRef" class="register" @submit.prevent="submit">
    <v-alert
      v-if="duplicates.length"
      type="warning"
      title="This patient may already have a record"
      class="mb-5"
    >
      <p class="mb-2">
        Same name and date of birth. Open the existing record instead of creating a second one.
      </p>
      <ul class="duplicates">
        <li v-for="patient in duplicates" :key="patient.id">
          <router-link
            :to="{ name: 'patient-detail', params: { id: patient.id } }"
            class="link-inline"
          >
            {{ patientName(patient) }} — {{ patient.patient_no }}
          </router-link>
          <span class="duplicates__meta">registered {{ formatDate(patient.created_at) }}</span>
        </li>
      </ul>
    </v-alert>

    <SectionCard title="Patient details" description="Name, sex and date of birth are required.">
      <PatientFormFields :draft="draft" :disabled="submitting" @identity-blur="checkDuplicates" />
    </SectionCard>

    <SectionCard
      v-if="canEnqueue"
      title="Today’s visit"
      description="Queue the patient now and they join the FIFO line immediately."
    >
      <template #actions>
        <v-switch v-model="enqueueNow" label="Add to queue now" :disabled="submitting" />
      </template>

      <IntakeFields v-if="enqueueNow" :draft="intakeForm.draft" :disabled="submitting" />
      <p v-else class="text-body-2 text-medium-emphasis">
        The record will be created without a visit. You can queue the patient later from their
        record.
      </p>
    </SectionCard>

    <FormError :message="error" />

    <div class="register__actions">
      <v-btn variant="text" :to="{ name: 'patients' }" :disabled="submitting">Cancel</v-btn>
      <v-btn type="submit" color="primary" :loading="submitting">
        {{ canEnqueue && enqueueNow ? 'Register and queue' : 'Register patient' }}
      </v-btn>
    </div>
  </v-form>
</template>

<style scoped>
.register {
  display: grid;
  gap: 20px;
}

.register__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.duplicates {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
}

.duplicates__meta {
  margin-left: 8px;
  font-size: 0.8125rem;
  opacity: 0.8;
}
</style>
