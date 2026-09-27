<script setup lang="ts">
import { computed } from 'vue'
import EmptyState from '@/components/common/EmptyState.vue'
import StatusPill from '@/components/common/StatusPill.vue'
import { useStaffStore } from '@/stores/staff'
import {
  VISIT_STATUS,
  formatDuration,
  formatTime,
  minutesSince,
  opdToday,
  patientAge,
  patientName,
  physicianName,
  ticketLabel,
} from '@/config/opd'
import type { Visit } from '@/types'

/**
 * One slice of the floor as a table. `waiting` numbers the rows in FIFO
 * order and measures the wait from arrival; the other slices show who has
 * the patient and for how long they have been in that state.
 */
const props = defineProps<{
  visits: Visit[]
  variant: 'waiting' | 'assigned'
  now: number
  canManage?: boolean
  emptyTitle: string
  emptyDescription: string
}>()

const emit = defineEmits<{
  editIntake: [visit: Visit]
  cancel: [visit: Visit]
  noShow: [visit: Visit]
  reassign: [visit: Visit]
}>()

const staff = useStaffStore()
const today = computed(() => opdToday())

const waitMinutes = (visit: Visit) =>
  minutesSince(props.variant === 'waiting' ? visit.queued_at : visit.status_changed_at, props.now)

/** Over an hour in line is worth a second look from the desk. */
const isLong = (visit: Visit) => props.variant === 'waiting' && waitMinutes(visit) >= 60
</script>

<template>
  <EmptyState
    v-if="!visits.length"
    icon="mdi-check-circle-outline"
    :title="emptyTitle"
    :description="emptyDescription"
  />

  <div v-else class="queue-table-wrap">
    <table class="queue-table">
      <thead>
        <tr>
          <th v-if="variant === 'waiting'" class="queue-table__pos">#</th>
          <th>Ticket</th>
          <th>Patient</th>
          <th>Chief complaint</th>
          <th>{{ variant === 'waiting' ? 'Arrived' : 'Physician' }}</th>
          <th>{{ variant === 'waiting' ? 'Waiting' : 'Status' }}</th>
          <th v-if="canManage" class="queue-table__actions" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="(visit, index) in visits" :key="visit.id">
          <td v-if="variant === 'waiting'" class="queue-table__pos tabular-nums">{{ index + 1 }}</td>
          <td class="tabular-nums">
            <span class="ticket">{{ ticketLabel(visit.queue_number) }}</span>
            <StatusPill v-if="visit.is_priority" tone="urgent" label="Priority" class="ml-1" />
            <div v-if="visit.visit_date < today" class="queue-table__stale">From an earlier day</div>
          </td>
          <td>
            <router-link
              v-if="visit.patient"
              :to="{ name: 'patient-detail', params: { id: visit.patient_id } }"
              class="queue-table__patient"
            >
              {{ patientName(visit.patient) }}
            </router-link>
            <div v-if="visit.patient" class="queue-table__sub">
              {{ visit.patient.sex === 'female' ? 'F' : 'M' }} ·
              {{ patientAge(visit.patient.birth_date) }}
              <template v-if="visit.priority_reason"> · {{ visit.priority_reason }}</template>
            </div>
          </td>
          <td class="queue-table__complaint">{{ visit.chief_complaint }}</td>
          <td>
            <template v-if="variant === 'waiting'">{{ formatTime(visit.queued_at) }}</template>
            <template v-else>{{ physicianName(staff.get(visit.physician_id)) }}</template>
          </td>
          <td>
            <span v-if="variant === 'waiting'" class="tabular-nums" :class="{ 'text-error font-weight-medium': isLong(visit) }">
              {{ formatDuration(waitMinutes(visit)) }}
            </span>
            <template v-else>
              <StatusPill v-bind="VISIT_STATUS[visit.status]" />
              <div class="queue-table__sub">for {{ formatDuration(waitMinutes(visit)) }}</div>
            </template>
          </td>
          <td v-if="canManage" class="queue-table__actions">
            <v-menu location="bottom end">
              <template #activator="{ props: menuProps }">
                <v-btn
                  v-bind="menuProps"
                  variant="text"
                  size="small"
                  icon="mdi-dots-horizontal"
                  :aria-label="`Actions for ticket ${ticketLabel(visit.queue_number)}`"
                />
              </template>
              <v-list density="compact" min-width="200">
                <v-list-item
                  prepend-icon="mdi-pencil-outline"
                  title="Edit intake"
                  @click="emit('editIntake', visit)"
                />
                <v-list-item
                  v-if="variant === 'assigned'"
                  prepend-icon="mdi-account-switch-outline"
                  title="Reassign physician"
                  @click="emit('reassign', visit)"
                />
                <v-list-item
                  v-if="variant === 'waiting'"
                  prepend-icon="mdi-account-off-outline"
                  title="Mark as no-show"
                  @click="emit('noShow', visit)"
                />
                <v-list-item
                  prepend-icon="mdi-close-circle-outline"
                  title="Cancel visit"
                  base-color="error"
                  @click="emit('cancel', visit)"
                />
              </v-list>
            </v-menu>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.queue-table-wrap {
  overflow-x: auto;
}

.queue-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.queue-table th {
  text-align: left;
  font-weight: 500;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
  background-color: rgb(var(--v-theme-surface-alt));
  padding: 8px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  white-space: nowrap;
}

.queue-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  vertical-align: top;
}

.queue-table tr:last-child td {
  border-bottom: none;
}

.queue-table__pos {
  width: 40px;
  color: rgb(var(--v-theme-text-secondary));
}

.ticket {
  font-weight: 600;
}

.queue-table__patient {
  color: inherit;
  font-weight: 500;
  text-decoration: none;
}

.queue-table__patient:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.queue-table__sub {
  margin-top: 2px;
  font-size: 0.75rem;
  color: rgb(var(--v-theme-text-secondary));
}

.queue-table__stale {
  margin-top: 2px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-warning));
}

.queue-table__complaint {
  max-width: 280px;
}

.queue-table__actions {
  width: 1%;
  text-align: right;
}
</style>
