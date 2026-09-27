<script setup lang="ts">
import { computed } from 'vue'
import { patientAge, patientName } from '@/config/opd'
import type { Patient } from '@/types'

/**
 * Who the patient is, at a glance: name, record number, age and sex, and —
 * always visible, never behind a tab — their allergies.
 */
const props = defineProps<{ patient: Patient; compact?: boolean }>()

const allergies = computed(() => props.patient.allergies?.trim() || null)
</script>

<template>
  <div class="banner" :class="{ 'banner--compact': compact }">
    <v-avatar :size="compact ? 36 : 44" class="banner__avatar">
      <v-icon icon="mdi-account-outline" :size="compact ? 20 : 24" />
    </v-avatar>
    <div class="banner__body">
      <div class="banner__name">{{ patientName(patient) }}</div>
      <div class="banner__meta">
        <span class="tabular-nums">{{ patient.patient_no }}</span>
        <span>{{ patient.sex === 'female' ? 'Female' : 'Male' }}</span>
        <span>{{ patientAge(patient.birth_date) }}</span>
        <span v-if="patient.blood_type">Blood type {{ patient.blood_type }}</span>
      </div>
      <div v-if="allergies" class="banner__allergy">
        <v-icon icon="mdi-alert-outline" size="14" />
        Allergies: {{ allergies }}
      </div>
    </div>
    <div v-if="$slots.actions" class="banner__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.banner {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.banner__avatar {
  color: rgb(var(--v-theme-primary));
  flex: 0 0 auto;
}

.banner__body {
  min-width: 0;
  flex: 1;
}

.banner__name {
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: -0.015em;
}

.banner--compact .banner__name {
  font-size: 0.9375rem;
}

.banner__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 2px;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}

.banner__allergy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: rgb(var(--v-theme-status-urgent-bg));
  color: rgb(var(--v-theme-error));
}

.banner__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
</style>
