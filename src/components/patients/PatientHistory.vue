<script setup lang="ts">
import { ref } from 'vue'
import EmptyState from '@/components/common/EmptyState.vue'
import StatusPill from '@/components/common/StatusPill.vue'
import VisitRecordDetail from './VisitRecordDetail.vue'
import { useStaffStore } from '@/stores/staff'
import { VISIT_STATUS, formatDate, physicianName, ticketLabel } from '@/config/opd'
import type { VisitRecord } from '@/types'

/**
 * The chart: one expandable entry per visit, newest first and open. A
 * diagnosis in the header lets a physician scan years of visits without
 * opening each one.
 */
const props = defineProps<{ visits: VisitRecord[]; canAddAddendum?: boolean }>()
const emit = defineEmits<{ addAddendum: [consultationId: string] }>()

const staff = useStaffStore()
const open = ref<string[]>(props.visits[0] ? [props.visits[0].id] : [])
</script>

<template>
  <EmptyState
    v-if="!visits.length"
    icon="mdi-file-document-outline"
    title="No visits on record"
    description="Each OPD visit, with its notes and lab results, is added here as it happens."
  />

  <v-expansion-panels v-else v-model="open" multiple variant="accordion" class="history">
    <v-expansion-panel v-for="visit in visits" :key="visit.id" :value="visit.id" elevation="0">
      <v-expansion-panel-title>
        <div class="history__title">
          <div class="history__date">
            {{ formatDate(visit.visit_date) }}
            <span class="history__ticket tabular-nums">{{ ticketLabel(visit.queue_number) }}</span>
          </div>
          <div class="history__summary">
            {{ visit.consultation?.diagnosis || visit.chief_complaint }}
          </div>
          <div class="history__meta">
            <StatusPill v-bind="VISIT_STATUS[visit.status]" />
            <span v-if="visit.physician_id">{{ physicianName(staff.get(visit.physician_id)) }}</span>
          </div>
        </div>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <VisitRecordDetail
          :visit="visit"
          :can-add-addendum="canAddAddendum"
          @add-addendum="(id) => emit('addAddendum', id)"
        />
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<style scoped>
.history :deep(.v-expansion-panel) {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.history__title {
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding-right: 8px;
}

.history__date {
  font-weight: 600;
  font-size: 0.875rem;
}

.history__ticket {
  margin-left: 6px;
  font-weight: 400;
  font-size: 0.75rem;
  color: rgb(var(--v-theme-text-secondary));
}

.history__summary {
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}

@media (max-width: 760px) {
  .history__title {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
