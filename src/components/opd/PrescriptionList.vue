<script setup lang="ts">
import type { Prescription } from '@/types'

/** Prescriptions, read-only, written the way a pharmacist reads a script. */
defineProps<{ prescriptions: Prescription[] }>()

const sig = (row: Prescription) =>
  [row.dose, row.frequency, row.duration && `for ${row.duration}`].filter(Boolean).join(', ')
</script>

<template>
  <ol class="rx">
    <li v-for="row in prescriptions" :key="row.id" class="rx__item">
      <div class="rx__drug">
        {{ row.medicine }}
        <span v-if="row.quantity" class="rx__qty tabular-nums">#{{ row.quantity }}</span>
      </div>
      <div v-if="sig(row)" class="rx__sig">Sig: {{ sig(row) }}</div>
      <div v-if="row.instructions" class="rx__sig">{{ row.instructions }}</div>
    </li>
  </ol>
</template>

<style scoped>
.rx {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 8px;
}

.rx__drug {
  font-weight: 600;
  font-size: 0.875rem;
}

.rx__qty {
  margin-left: 6px;
  font-weight: 500;
  color: rgb(var(--v-theme-text-secondary));
}

.rx__sig {
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}
</style>
