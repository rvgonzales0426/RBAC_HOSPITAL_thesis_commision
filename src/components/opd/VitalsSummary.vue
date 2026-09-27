<script setup lang="ts">
import { computed } from 'vue'
import { formatBloodPressure } from '@/config/opd'
import type { Vitals } from '@/types'

/** Intake vitals as a compact strip. Readings not taken are simply left out. */
const props = defineProps<{ vitals: Vitals }>()

const readings = computed(() => {
  const v = props.vitals
  const bmi =
    v.weight_kg && v.height_cm ? (v.weight_kg / (v.height_cm / 100) ** 2).toFixed(1) : null

  return [
    { label: 'BP', value: formatBloodPressure(v.bp_systolic, v.bp_diastolic), unit: 'mmHg' },
    { label: 'HR', value: v.heart_rate, unit: 'bpm' },
    { label: 'RR', value: v.respiratory_rate, unit: '/min' },
    { label: 'Temp', value: v.temperature_c, unit: '°C' },
    { label: 'SpO₂', value: v.spo2, unit: '%' },
    { label: 'Weight', value: v.weight_kg, unit: 'kg' },
    { label: 'Height', value: v.height_cm, unit: 'cm' },
    { label: 'BMI', value: bmi, unit: '' },
  ].filter((reading) => reading.value !== null && reading.value !== undefined)
})
</script>

<template>
  <div v-if="readings.length" class="vitals">
    <div v-for="reading in readings" :key="reading.label" class="vitals__item">
      <span class="vitals__label">{{ reading.label }}</span>
      <span class="vitals__value tabular-nums">
        {{ reading.value }}<span class="vitals__unit">{{ reading.unit }}</span>
      </span>
    </div>
  </div>
  <p v-else class="vitals__none">No vital signs recorded at intake.</p>
</template>

<style scoped>
.vitals {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.vitals__item {
  display: flex;
  flex-direction: column;
  padding: 6px 10px;
  border-radius: 8px;
  background-color: rgb(var(--v-theme-surface-alt));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  min-width: 72px;
}

.vitals__label {
  font-size: 0.6875rem;
  color: rgb(var(--v-theme-text-secondary));
}

.vitals__value {
  font-size: 0.875rem;
  font-weight: 600;
}

.vitals__unit {
  margin-left: 2px;
  font-size: 0.6875rem;
  font-weight: 400;
  color: rgb(var(--v-theme-text-secondary));
}

.vitals__none {
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}
</style>
