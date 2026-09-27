<script setup lang="ts">
import { computed, watch } from 'vue'
import FormError from '@/components/common/FormError.vue'
import StatusPill from '@/components/common/StatusPill.vue'
import { useResultEntry } from '@/composables/useResultEntry'
import { RESULT_FLAG, RESULT_FLAG_OPTIONS, patientName } from '@/config/opd'
import type { LabOrder, LabOrderItem } from '@/types'

/**
 * Result entry for one test. Save keeps a draft the physician cannot see yet;
 * Release sends it back to the requesting doctor and locks it.
 */
const props = defineProps<{ order: LabOrder | null; item: LabOrderItem | null }>()
const open = defineModel<boolean>({ required: true })

const {
  entries,
  remarks,
  filledCount,
  suggestedFlag,
  addRow,
  removeRow,
  reset,
  saveDraft,
  release,
} = useResultEntry(() => props.item)

// Reopening the same test starts from what is saved, not from an abandoned edit.
watch(open, (value) => value && reset())

const busy = computed(() => saveDraft.loading.value || release.loading.value)
const error = computed(() => saveDraft.error.value || release.error.value)

async function onSave() {
  if (await saveDraft.run()) open.value = false
}

async function onRelease() {
  if (await release.run()) open.value = false
}
</script>

<template>
  <v-dialog v-model="open" max-width="860" scrollable persistent>
    <v-card class="rounded-overlay">
      <v-card-title>{{ item?.test_type?.name ?? 'Enter results' }}</v-card-title>
      <v-card-subtitle v-if="order">
        {{ order.order_no }}
        <template v-if="order.patient"> · {{ patientName(order.patient) }} · {{ order.patient.patient_no }}</template>
      </v-card-subtitle>

      <v-card-text>
        <p v-if="order?.clinical_notes" class="notes">Clinical notes: {{ order.clinical_notes }}</p>

        <div class="grid-wrap">
          <table class="grid">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Result</th>
                <th>Unit</th>
                <th>Reference</th>
                <th>Flag</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="(entry, index) in entries" :key="entry.id ?? `${entry.parameter_id}-${index}`">
                <td class="grid__name">
                  <span v-if="entry.parameter_id">{{ entry.parameter_name }}</span>
                  <v-text-field
                    v-else
                    v-model="entry.parameter_name"
                    placeholder="Finding"
                    density="compact"
                    :disabled="busy"
                  />
                </td>
                <td class="grid__value">
                  <v-text-field v-model="entry.value" density="compact" :disabled="busy" />
                </td>
                <td class="grid__unit">
                  <span v-if="entry.parameter_id">{{ entry.unit || '—' }}</span>
                  <v-text-field v-else v-model="entry.unit" density="compact" :disabled="busy" />
                </td>
                <td class="grid__range">
                  <span v-if="entry.parameter_id">{{ entry.reference_range || '—' }}</span>
                  <v-text-field v-else v-model="entry.reference_range" density="compact" :disabled="busy" />
                </td>
                <td class="grid__flag">
                  <v-select
                    v-model="entry.flag"
                    :items="RESULT_FLAG_OPTIONS"
                    density="compact"
                    clearable
                    :placeholder="suggestedFlag(entry) ? `Auto: ${RESULT_FLAG[suggestedFlag(entry)!].label}` : 'Auto'"
                    :disabled="busy"
                  />
                </td>
                <td class="grid__remove">
                  <v-btn
                    v-if="!entry.parameter_id"
                    icon="mdi-close"
                    size="small"
                    variant="text"
                    aria-label="Remove row"
                    :disabled="busy"
                    @click="removeRow(index)"
                  />
                  <StatusPill
                    v-else-if="!entry.flag && suggestedFlag(entry) && suggestedFlag(entry) !== 'normal'"
                    v-bind="RESULT_FLAG[suggestedFlag(entry)!]"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <v-btn variant="text" size="small" prepend-icon="mdi-plus" class="mt-2" :disabled="busy" @click="addRow">
          Add a finding
        </v-btn>

        <v-textarea
          v-model="remarks"
          label="Remarks (optional)"
          placeholder="e.g. Specimen slightly hemolyzed"
          rows="2"
          class="mt-4"
          :disabled="busy"
        />
        <FormError :message="error" class="mt-4" />
      </v-card-text>

      <v-card-actions>
        <span class="text-caption text-medium-emphasis ml-1">{{ filledCount }} of {{ entries.length }} filled</span>
        <v-spacer />
        <v-btn variant="text" :disabled="busy" @click="open = false">Close</v-btn>
        <v-btn variant="outlined" :loading="saveDraft.loading.value" :disabled="busy" @click="onSave">
          Save draft
        </v-btn>
        <v-btn color="primary" :loading="release.loading.value" :disabled="busy || !filledCount" @click="onRelease">
          Release results
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.notes {
  margin-bottom: 12px;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}

.grid-wrap {
  overflow-x: auto;
}

.grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.grid th {
  text-align: left;
  font-weight: 500;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
  padding: 6px 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.grid td {
  padding: 6px 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.6);
  vertical-align: middle;
}

.grid__name {
  min-width: 150px;
}

.grid__value {
  min-width: 110px;
}

.grid__unit {
  min-width: 80px;
  color: rgb(var(--v-theme-text-secondary));
}

.grid__range {
  min-width: 100px;
  color: rgb(var(--v-theme-text-secondary));
}

.grid__flag {
  min-width: 150px;
}

.grid__remove {
  width: 1%;
  white-space: nowrap;
}
</style>
