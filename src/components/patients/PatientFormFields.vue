<script setup lang="ts">
import { BLOOD_TYPES, CIVIL_STATUS_OPTIONS, SEX_OPTIONS } from '@/config/opd'
import { patientRules, type PatientDraft } from '@/composables/usePatientForm'

/**
 * The demographic fields, grouped the way an intake sheet is. The parent owns
 * the draft (usePatientForm) and the <v-form>; this only lays the fields out.
 */
defineProps<{ draft: PatientDraft; disabled?: boolean }>()
const emit = defineEmits<{ identityBlur: [] }>()
</script>

<template>
  <div class="patient-fields">
    <fieldset class="group">
      <legend class="group__title">Identity</legend>
      <div class="grid grid--4">
        <v-text-field
          v-model="draft.last_name"
          label="Last name"
          :rules="patientRules.lastName"
          :disabled="disabled"
          autocomplete="off"
          @blur="emit('identityBlur')"
        />
        <v-text-field
          v-model="draft.first_name"
          label="First name"
          :rules="patientRules.firstName"
          :disabled="disabled"
          autocomplete="off"
          @blur="emit('identityBlur')"
        />
        <v-text-field
          v-model="draft.middle_name"
          label="Middle name"
          :disabled="disabled"
          autocomplete="off"
        />
        <v-text-field
          v-model="draft.suffix"
          label="Suffix"
          placeholder="Jr., III"
          :disabled="disabled"
          autocomplete="off"
        />
        <v-select
          v-model="draft.sex"
          :items="SEX_OPTIONS"
          label="Sex"
          :rules="patientRules.sex"
          :disabled="disabled"
        />
        <v-text-field
          v-model="draft.birth_date"
          label="Date of birth"
          type="date"
          :rules="patientRules.birthDate"
          :disabled="disabled"
          @blur="emit('identityBlur')"
        />
        <v-select
          v-model="draft.civil_status"
          :items="CIVIL_STATUS_OPTIONS"
          label="Civil status"
          clearable
          :disabled="disabled"
        />
        <v-text-field
          v-model="draft.philhealth_no"
          label="PhilHealth number"
          :disabled="disabled"
          autocomplete="off"
        />
      </div>
    </fieldset>

    <fieldset class="group">
      <legend class="group__title">Contact and address</legend>
      <div class="grid grid--2">
        <v-text-field
          v-model="draft.contact_number"
          label="Contact number"
          type="tel"
          :disabled="disabled"
        />
        <v-text-field
          v-model="draft.email"
          label="Email"
          type="email"
          :rules="patientRules.email"
          :disabled="disabled"
        />
        <v-text-field
          v-model="draft.address_line"
          label="House no. and street"
          :disabled="disabled"
          class="grid__wide"
        />
        <v-text-field v-model="draft.barangay" label="Barangay" :disabled="disabled" />
        <v-text-field
          v-model="draft.city_municipality"
          label="City or municipality"
          :disabled="disabled"
        />
        <v-text-field v-model="draft.province" label="Province" :disabled="disabled" />
      </div>
    </fieldset>

    <fieldset class="group">
      <legend class="group__title">Emergency contact</legend>
      <div class="grid grid--3">
        <v-text-field v-model="draft.emergency_contact_name" label="Name" :disabled="disabled" />
        <v-text-field
          v-model="draft.emergency_contact_relation"
          label="Relationship"
          :disabled="disabled"
        />
        <v-text-field
          v-model="draft.emergency_contact_number"
          label="Contact number"
          type="tel"
          :disabled="disabled"
        />
      </div>
    </fieldset>

    <fieldset class="group">
      <legend class="group__title">Medical background</legend>
      <div class="grid grid--2">
        <v-select
          v-model="draft.blood_type"
          :items="BLOOD_TYPES"
          label="Blood type"
          clearable
          :disabled="disabled"
        />
        <div />
        <v-textarea
          v-model="draft.allergies"
          label="Allergies"
          placeholder="Drug, food or environmental allergies. Write “None known” if asked and none."
          rows="2"
          :disabled="disabled"
        />
        <v-textarea
          v-model="draft.chronic_conditions"
          label="Chronic conditions"
          placeholder="e.g. Hypertension, Type 2 diabetes"
          rows="2"
          :disabled="disabled"
        />
      </div>
    </fieldset>
  </div>
</template>

<style scoped>
.patient-fields {
  display: grid;
  gap: 24px;
}

.group {
  border: none;
  margin: 0;
  padding: 0;
  min-width: 0;
}

.group__title {
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: rgb(var(--v-theme-text-secondary));
}

.grid {
  display: grid;
  gap: 14px;
}

.grid--4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.grid__wide {
  grid-column: 1 / -1;
}

@media (max-width: 960px) {
  .grid--4,
  .grid--3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .grid--4,
  .grid--3,
  .grid--2 {
    grid-template-columns: 1fr;
  }
}
</style>
