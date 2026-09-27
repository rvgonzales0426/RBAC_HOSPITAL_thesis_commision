<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LabOrderCard from '@/components/lab/LabOrderCard.vue'
import LabResultsList from '@/components/opd/LabResultsList.vue'
import ResultEntryDialog from '@/components/dialogs/ResultEntryDialog.vue'
import LabAmendDialog from '@/components/dialogs/LabAmendDialog.vue'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog.vue'
import { useLabWorklist } from '@/composables/useLabWorklist'
import { formatTime, patientName } from '@/config/opd'

const {
  now,
  worklist,
  released,
  loaded,
  statCount,
  entryOpen,
  entryOrder,
  entryItem,
  amendOpen,
  amendResult,
  openEntry,
  openAmend,
  advance,
  onAdvance,
  cancelOpen,
  cancelTarget,
  confirmCancel,
  refresh,
} = useLabWorklist()
</script>

<template>
  <PageHeader
    title="Laboratory"
    description="Orders arrive here the moment a physician sends them. Released results go straight back to the requesting doctor."
  >
    <template #actions>
      <v-btn variant="outlined" prepend-icon="mdi-refresh" :loading="refresh.loading.value" @click="refresh.run()">
        Refresh
      </v-btn>
    </template>
  </PageHeader>

  <div class="lab">
    <SectionCard
      :title="`Incoming orders${worklist.length ? ` (${worklist.length})` : ''}`"
      :description="statCount ? `${statCount} STAT — process these first.` : 'STAT orders first, then oldest first.'"
    >
      <v-skeleton-loader v-if="!loaded" type="list-item-three-line, list-item-three-line" />
      <EmptyState
        v-else-if="!worklist.length"
        icon="mdi-flask-empty-outline"
        title="No pending orders"
        description="New lab requests appear here as soon as a physician places them."
      />
      <div v-else class="lab__orders">
        <LabOrderCard
          v-for="order in worklist"
          :key="order.id"
          :order="order"
          :now="now"
          :busy="advance.loading.value"
          @advance="onAdvance"
          @enter="openEntry"
        />
      </div>
    </SectionCard>

    <SectionCard
      title="Released in the last 24 hours"
      description="Found a mistake? Amend the value — the original and your reason are kept on record."
    >
      <EmptyState
        v-if="loaded && !released.length"
        icon="mdi-file-check-outline"
        title="Nothing released yet today"
        description="Completed orders show here for correction."
      />
      <div v-else class="lab__released">
        <div v-for="order in released" :key="order.id">
          <div class="lab__released-head">
            {{ order.patient ? patientName(order.patient) : 'Patient' }}
            <span>released {{ formatTime(order.completed_at) }}</span>
          </div>
          <LabResultsList :orders="[order]" amendable :show-order-meta="false" @amend="openAmend" />
        </div>
      </div>
    </SectionCard>
  </div>

  <ResultEntryDialog v-model="entryOpen" :order="entryOrder" :item="entryItem" />
  <LabAmendDialog v-model="amendOpen" :result="amendResult" />
  <ConfirmDialog
    v-model="cancelOpen"
    title="Cancel this test?"
    :message="`${cancelTarget?.test_type?.name ?? 'The test'} will not be processed. If it was the last open test on the order, the patient returns to their physician.`"
    confirm-label="Cancel test"
    destructive
    :loading="advance.loading.value"
    @confirm="confirmCancel"
  />
</template>

<style scoped>
.lab {
  display: grid;
  gap: 20px;
}

.lab__orders,
.lab__released {
  display: grid;
  gap: 14px;
}

.lab__released-head {
  margin-bottom: 6px;
  font-weight: 600;
  font-size: 0.875rem;
}

.lab__released-head span {
  margin-left: 8px;
  font-weight: 400;
  font-size: 0.75rem;
  color: rgb(var(--v-theme-text-secondary));
}
</style>
