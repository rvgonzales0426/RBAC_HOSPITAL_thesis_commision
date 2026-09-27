<script setup lang="ts">
import StatusPill from '@/components/common/StatusPill.vue'
import { useStaffStore } from '@/stores/staff'
import {
  LAB_ITEM_STATUS,
  LAB_PRIORITY,
  formatDuration,
  formatTime,
  minutesSince,
  patientAge,
  patientName,
  physicianName,
} from '@/config/opd'
import type { LabItemStatus, LabOrder, LabOrderItem } from '@/types'

/** One incoming request: who it is for, who asked, and a row per test with its next step. */
defineProps<{ order: LabOrder; now: number; busy?: boolean }>()
const emit = defineEmits<{
  advance: [item: LabOrderItem, status: LabItemStatus]
  enter: [item: LabOrderItem]
}>()

const staff = useStaffStore()
const isOpen = (item: LabOrderItem) => item.status !== 'completed' && item.status !== 'cancelled'
</script>

<template>
  <article class="order" :class="{ 'order--stat': order.priority === 'stat' }">
    <header class="order__head">
      <div class="order__who">
        <div class="order__patient">
          {{ order.patient ? patientName(order.patient) : 'Patient' }}
          <span v-if="order.patient" class="order__sub">
            {{ order.patient.patient_no }} · {{ order.patient.sex === 'female' ? 'F' : 'M' }} ·
            {{ patientAge(order.patient.birth_date) }}
          </span>
        </div>
        <div class="order__meta">
          <span class="tabular-nums">{{ order.order_no }}</span> ·
          {{ physicianName(staff.get(order.ordered_by)) }} · ordered {{ formatTime(order.ordered_at) }}
          ({{ formatDuration(minutesSince(order.ordered_at, now)) }} ago)
        </div>
      </div>
      <StatusPill v-bind="LAB_PRIORITY[order.priority]" />
    </header>

    <p v-if="order.clinical_notes" class="order__notes">{{ order.clinical_notes }}</p>

    <ul class="order__items">
      <li v-for="item in order.items" :key="item.id" class="order__item">
        <div class="order__test">
          <span class="order__test-name">{{ item.test_type?.name ?? 'Test' }}</span>
          <span v-if="item.test_type?.specimen" class="order__sub">{{ item.test_type.specimen }}</span>
        </div>
        <StatusPill v-bind="LAB_ITEM_STATUS[item.status]" />
        <div class="order__actions">
          <template v-if="isOpen(item)">
            <v-btn
              v-if="item.status === 'requested'"
              size="small"
              variant="outlined"
              :disabled="busy"
              @click="emit('advance', item, 'specimen_collected')"
            >
              Specimen collected
            </v-btn>
            <v-btn size="small" color="primary" :disabled="busy" @click="emit('enter', item)">
              {{ item.results?.length ? 'Continue results' : 'Enter results' }}
            </v-btn>
            <v-menu location="bottom end">
              <template #activator="{ props: menuProps }">
                <v-btn
                  v-bind="menuProps"
                  size="small"
                  variant="text"
                  icon="mdi-dots-horizontal"
                  :aria-label="`More actions for ${item.test_type?.name ?? 'this test'}`"
                  :disabled="busy"
                />
              </template>
              <v-list density="compact">
                <v-list-item
                  title="Cancel this test"
                  prepend-icon="mdi-close-circle-outline"
                  base-color="error"
                  @click="emit('advance', item, 'cancelled')"
                />
              </v-list>
            </v-menu>
          </template>
        </div>
      </li>
    </ul>
  </article>
</template>

<style scoped>
.order {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background-color: rgb(var(--v-theme-surface));
  overflow: hidden;
}

.order--stat {
  border-left: 3px solid rgb(var(--v-theme-error));
}

.order__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background-color: rgb(var(--v-theme-surface-alt));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.order__patient {
  font-weight: 600;
  font-size: 0.9375rem;
}

.order__sub {
  margin-left: 8px;
  font-weight: 400;
  font-size: 0.75rem;
  color: rgb(var(--v-theme-text-secondary));
}

.order__meta {
  margin-top: 2px;
  font-size: 0.75rem;
  color: rgb(var(--v-theme-text-secondary));
}

.order__notes {
  padding: 10px 16px 0;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}

.order__items {
  list-style: none;
  margin: 0;
  padding: 4px 0;
}

.order__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
}

.order__item + .order__item {
  border-top: 1px solid rgba(var(--v-border-color), 0.6);
}

.order__test-name {
  font-weight: 500;
  font-size: 0.875rem;
}

.order__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
  min-width: 0;
}

@media (max-width: 760px) {
  .order__item {
    grid-template-columns: 1fr auto;
  }

  .order__actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}
</style>
