<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import StatusPill from '@/components/common/StatusPill.vue'
import { useStaffStore } from '@/stores/staff'
import { useQueueStore } from '@/stores/queue'
import { DUTY_STATUS, formatTime, physicianName, ticketLabel } from '@/config/opd'
import type { Physician } from '@/types'

/**
 * Who is on duty, and whether they are free. "With patient" is derived from
 * the visits, so it can never disagree with the queue beside it.
 */
defineProps<{ physicians: Physician[] }>()

const staff = useStaffStore()
const queue = useQueueStore()

const currentTicket = (profileId: string) =>
  queue.visits.find(
    (visit) => visit.physician_id === profileId && visit.status === 'in_consultation',
  )?.queue_number ?? null
</script>

<template>
  <EmptyState
    v-if="!physicians.length"
    icon="mdi-stethoscope"
    title="No physicians have gone on duty yet"
    description="Doctors appear here once they set their status from the consultation workspace."
  />

  <ul v-else class="roster">
    <li v-for="physician in physicians" :key="physician.profile_id" class="roster__row">
      <div class="roster__main">
        <div class="roster__name">{{ physicianName(staff.get(physician.profile_id)) }}</div>
        <div class="roster__meta">
          <template v-if="physician.room">Room {{ physician.room }} · </template>
          since {{ formatTime(physician.duty_changed_at) }}
        </div>
      </div>
      <div class="roster__status">
        <StatusPill
          v-if="physician.duty_status === 'available' && currentTicket(physician.profile_id) !== null"
          tone="lab"
          :label="`With ${ticketLabel(currentTicket(physician.profile_id)!)}`"
        />
        <StatusPill v-else v-bind="DUTY_STATUS[physician.duty_status]" />
      </div>
    </li>
  </ul>
</template>

<style scoped>
.roster {
  list-style: none;
  margin: 0;
  padding: 0;
}

.roster__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.roster__row:last-child {
  border-bottom: none;
}

.roster__main {
  min-width: 0;
}

.roster__name {
  font-weight: 500;
  font-size: 0.875rem;
}

.roster__meta {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-text-secondary));
}
</style>
