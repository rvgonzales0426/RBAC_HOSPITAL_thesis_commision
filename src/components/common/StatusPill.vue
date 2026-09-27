<script setup lang="ts">
import type { Tone } from '@/config/opd'

/**
 * The clinical status badge. Tone carries the meaning — green moving, amber
 * waiting, red needs attention, blue at the lab, grey closed — so pass a
 * StatusMeta from config/opd.ts rather than choosing a colour at the call site.
 */
defineProps<{ tone: Tone; label: string }>()
</script>

<template>
  <span class="status-pill" :class="`status-pill--${tone}`">{{ label }}</span>
</template>

<style scoped>
.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.6;
  white-space: nowrap;
}

.status-pill--active {
  background-color: rgb(var(--v-theme-status-active-bg));
  color: rgb(var(--v-theme-success));
}

.status-pill--pending {
  background-color: rgb(var(--v-theme-status-pending-bg));
  color: rgb(var(--v-theme-warning));
}

.status-pill--urgent {
  background-color: rgb(var(--v-theme-status-urgent-bg));
  color: rgb(var(--v-theme-error));
}

.status-pill--lab {
  background-color: rgb(var(--v-theme-status-lab-bg));
  color: rgb(var(--v-theme-info));
}

.status-pill--neutral {
  background-color: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-text-secondary));
}
</style>
