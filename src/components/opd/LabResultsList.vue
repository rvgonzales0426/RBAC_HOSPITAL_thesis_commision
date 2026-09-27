<script setup lang="ts">
import StatusPill from '@/components/common/StatusPill.vue'
import {
  LAB_ITEM_STATUS,
  LAB_ORDER_STATUS,
  LAB_PRIORITY,
  RESULT_FLAG,
  formatDateTime,
} from '@/config/opd'
import type { LabOrder, LabResultValue } from '@/types'

/**
 * Lab orders and their results, read-only. Used by the consultation
 * workspace, the EMR and the lab's released list. Pass `amendable` to offer
 * the lab an Amend action on released values.
 */
defineProps<{ orders: LabOrder[]; amendable?: boolean; showOrderMeta?: boolean }>()
const emit = defineEmits<{ amend: [result: LabResultValue] }>()
</script>

<template>
  <div class="lab-list">
    <article v-for="order in orders" :key="order.id" class="lab-order">
      <header class="lab-order__head">
        <span class="lab-order__no tabular-nums">{{ order.order_no }}</span>
        <StatusPill v-bind="LAB_ORDER_STATUS[order.status]" />
        <StatusPill v-if="order.priority === 'stat'" v-bind="LAB_PRIORITY.stat" />
        <span v-if="showOrderMeta !== false" class="lab-order__meta">
          Ordered {{ formatDateTime(order.ordered_at) }}
        </span>
      </header>
      <p v-if="order.clinical_notes" class="lab-order__notes">
        Clinical notes: {{ order.clinical_notes }}
      </p>

      <section v-for="item in order.items" :key="item.id" class="lab-item">
        <div class="lab-item__head">
          <span class="lab-item__name">{{ item.test_type?.name ?? 'Test' }}</span>
          <StatusPill v-bind="LAB_ITEM_STATUS[item.status]" />
          <span v-if="item.completed_at" class="lab-order__meta">
            Released {{ formatDateTime(item.completed_at) }}
          </span>
        </div>

        <table v-if="item.status === 'completed' && item.results?.length" class="results">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Result</th>
              <th>Reference</th>
              <th>Flag</th>
              <th v-if="amendable" class="results__action" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="result in item.results" :key="result.id">
              <td>{{ result.parameter_name }}</td>
              <td class="results__value tabular-nums">
                {{ result.value }}
                <span v-if="result.unit" class="results__unit">{{ result.unit }}</span>
                <span v-if="result.amended_at" class="results__amended">
                  Amended
                  <v-tooltip activator="parent" location="top" max-width="320">
                    <div v-for="amendment in result.amendments" :key="amendment.id">
                      {{ formatDateTime(amendment.amended_at) }}: {{ amendment.old_value }} →
                      {{ amendment.new_value }} ({{ amendment.reason }})
                    </div>
                  </v-tooltip>
                </span>
              </td>
              <td class="results__range">{{ result.reference_range || '—' }}</td>
              <td>
                <StatusPill v-if="result.flag" v-bind="RESULT_FLAG[result.flag]" />
              </td>
              <td v-if="amendable" class="results__action">
                <v-btn size="small" variant="text" @click="emit('amend', result)">Amend</v-btn>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else-if="item.status === 'completed'" class="lab-item__pending">
          Released without values.
        </p>
        <p v-else-if="item.status !== 'cancelled'" class="lab-item__pending">
          Results pending.
        </p>
        <p v-if="item.remarks" class="lab-item__remarks">Remarks: {{ item.remarks }}</p>
      </section>
    </article>
  </div>
</template>

<style scoped>
.lab-list {
  display: grid;
  gap: 16px;
}

.lab-order {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  overflow: hidden;
}

.lab-order__head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 14px;
  background-color: rgb(var(--v-theme-surface-alt));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.lab-order__no {
  font-weight: 600;
  font-size: 0.8125rem;
}

.lab-order__meta {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-text-secondary));
}

.lab-order__notes {
  padding: 8px 14px 0;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}

.lab-item {
  padding: 12px 14px;
}

.lab-item + .lab-item {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.lab-item__head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.lab-item__name {
  font-weight: 600;
  font-size: 0.875rem;
}

.lab-item__pending,
.lab-item__remarks {
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}

.results {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.results th {
  text-align: left;
  font-weight: 500;
  color: rgb(var(--v-theme-text-secondary));
  padding: 4px 8px 4px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.results td {
  padding: 6px 8px 6px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.6);
  vertical-align: middle;
}

.results tr:last-child td {
  border-bottom: none;
}

.results__value {
  font-weight: 600;
}

.results__unit,
.results__range {
  font-weight: 400;
  color: rgb(var(--v-theme-text-secondary));
}

.results__amended {
  margin-left: 6px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-warning));
  text-decoration: underline dotted;
  cursor: help;
}

.results__action {
  text-align: right;
  width: 1%;
  white-space: nowrap;
}
</style>
