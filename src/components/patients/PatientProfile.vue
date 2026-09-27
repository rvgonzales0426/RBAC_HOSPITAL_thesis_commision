<script setup lang="ts">
import { computed } from 'vue'
import { CIVIL_STATUS_OPTIONS, formatDate } from '@/config/opd'
import type { Patient } from '@/types'

/** Demographics as a read-only sheet. Editing happens in PatientEditDialog. */
const props = defineProps<{ patient: Patient }>()

const civilStatus = computed(
  () =>
    CIVIL_STATUS_OPTIONS.find((option) => option.value === props.patient.civil_status)?.title ??
    null,
)

const address = computed(() =>
  [
    props.patient.address_line,
    props.patient.barangay && `Brgy. ${props.patient.barangay}`,
    props.patient.city_municipality,
    props.patient.province,
  ]
    .filter(Boolean)
    .join(', '),
)

const emergency = computed(() => {
  const p = props.patient
  if (!p.emergency_contact_name) return null
  const relation = p.emergency_contact_relation ? ` (${p.emergency_contact_relation})` : ''
  const phone = p.emergency_contact_number ? ` — ${p.emergency_contact_number}` : ''
  return `${p.emergency_contact_name}${relation}${phone}`
})

const rows = computed(() => [
  { label: 'Date of birth', value: formatDate(props.patient.birth_date) },
  { label: 'Civil status', value: civilStatus.value },
  { label: 'PhilHealth no.', value: props.patient.philhealth_no },
  { label: 'Contact number', value: props.patient.contact_number },
  { label: 'Email', value: props.patient.email },
  { label: 'Address', value: address.value },
  { label: 'Emergency contact', value: emergency.value },
  { label: 'Blood type', value: props.patient.blood_type },
  { label: 'Allergies', value: props.patient.allergies },
  { label: 'Chronic conditions', value: props.patient.chronic_conditions },
  { label: 'Registered', value: formatDate(props.patient.created_at) },
])
</script>

<template>
  <dl class="profile">
    <template v-for="row in rows" :key="row.label">
      <dt>{{ row.label }}</dt>
      <dd :class="{ 'profile__empty': !row.value }">{{ row.value || 'Not recorded' }}</dd>
    </template>
  </dl>
</template>

<style scoped>
.profile {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 10px 20px;
  font-size: 0.875rem;
}

.profile dt {
  color: rgb(var(--v-theme-text-secondary));
}

.profile dd {
  margin: 0;
  white-space: pre-line;
}

.profile__empty {
  color: rgb(var(--v-theme-text-secondary));
}

@media (max-width: 600px) {
  .profile {
    grid-template-columns: 1fr;
    gap: 2px;
  }

  .profile dd {
    margin-bottom: 10px;
  }
}
</style>
