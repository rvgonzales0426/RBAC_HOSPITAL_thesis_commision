<script setup lang="ts">
import StatusPill from '@/components/common/StatusPill.vue'
import { VISIT_STATUS, formatDuration, minutesSince, patientName, ticketLabel } from '@/config/opd'
import type { Visit } from '@/types'

/**
 * The physician's patients outside the room. Results-ready patients are
 * called ahead of new arrivals by the Next button, so they are listed first.
 */
defineProps<{ ready: Visit[]; atLab: Visit[]; now: number }>()
</script>

<template>
  <div v-if="!ready.length && !atLab.length" class="mine__empty">
    None of your patients are at the lab or waiting on results.
  </div>

  <ul v-else class="mine">
    <li v-for="visit in [...ready, ...atLab]" :key="visit.id" class="mine__row">
      <div class="mine__main">
        <div class="mine__name">
          <span class="tabular-nums mine__ticket">{{ ticketLabel(visit.queue_number) }}</span>
          {{ visit.patient ? patientName(visit.patient) : 'Patient' }}
        </div>
        <div class="mine__meta">
          {{ visit.chief_complaint }} · for {{ formatDuration(minutesSince(visit.status_changed_at, now)) }}
        </div>
      </div>
      <StatusPill v-bind="VISIT_STATUS[visit.status]" />
    </li>
  </ul>
</template>

<style scoped>
.mine {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mine__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.mine__row:last-child {
  border-bottom: none;
}

.mine__main {
  min-width: 0;
}

.mine__name {
  font-size: 0.875rem;
  font-weight: 500;
}

.mine__ticket {
  margin-right: 6px;
  font-weight: 600;
}

.mine__meta {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-text-secondary));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mine__empty {
  padding: 16px 20px;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}
</style>
