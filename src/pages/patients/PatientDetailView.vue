<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import SectionCard from '@/components/common/SectionCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import StatusPill from '@/components/common/StatusPill.vue'
import PatientBanner from '@/components/opd/PatientBanner.vue'
import PatientProfile from '@/components/patients/PatientProfile.vue'
import PatientHistory from '@/components/patients/PatientHistory.vue'
import PatientEditDialog from '@/components/dialogs/PatientEditDialog.vue'
import IntakeDialog from '@/components/dialogs/IntakeDialog.vue'
import AddendumDialog from '@/components/dialogs/AddendumDialog.vue'
import { usePatientRecord } from '@/composables/usePatientRecord'
import { VISIT_STATUS, ticketLabel } from '@/config/opd'

const route = useRoute()
const {
  patient,
  visits,
  loading,
  notFound,
  error,
  openVisit,
  canSeeHistory,
  canEdit,
  canEnqueue,
  canAddAddendum,
  editOpen,
  intakeOpen,
  addendumFor,
  reload,
  reloadHistory,
  onSaved,
} = usePatientRecord(() => String(route.params.id))

const tab = ref<'history' | 'profile'>(canSeeHistory.value ? 'history' : 'profile')

const addendumOpen = computed({
  get: () => addendumFor.value !== null,
  set: (value: boolean) => {
    if (!value) addendumFor.value = null
  },
})
</script>

<template>
  <div v-if="loading" class="surface-panel pa-6">
    <v-skeleton-loader type="list-item-avatar-two-line, divider, paragraph" />
  </div>

  <EmptyState
    v-else-if="error"
    icon="mdi-alert-circle-outline"
    title="This record could not be loaded"
    :description="error"
  >
    <template #action>
      <v-btn variant="outlined" @click="reload">Try again</v-btn>
    </template>
  </EmptyState>

  <EmptyState
    v-else-if="notFound || !patient"
    icon="mdi-account-question-outline"
    title="Patient not found"
    description="The record may not exist, or your role cannot open patient records."
  >
    <template #action>
      <v-btn variant="outlined" :to="{ name: 'patients' }">Back to patients</v-btn>
    </template>
  </EmptyState>

  <template v-else>
    <section class="surface-panel pa-5 mb-5">
      <PatientBanner :patient="patient">
        <template #actions>
          <v-btn
            v-if="canEdit"
            variant="outlined"
            prepend-icon="mdi-pencil-outline"
            @click="editOpen = true"
          >
            Edit details
          </v-btn>
          <v-btn
            v-if="canEnqueue"
            color="primary"
            prepend-icon="mdi-clipboard-plus-outline"
            :disabled="Boolean(openVisit)"
            @click="intakeOpen = true"
          >
            Add to queue
          </v-btn>
        </template>
      </PatientBanner>

      <div v-if="openVisit" class="open-visit">
        <v-icon icon="mdi-information-outline" size="16" />
        In the OPD today as {{ ticketLabel(openVisit.queue_number) }}
        <StatusPill v-bind="VISIT_STATUS[openVisit.status]" />
      </div>
    </section>

    <v-tabs v-model="tab" class="mb-4">
      <v-tab v-if="canSeeHistory" value="history">Medical history</v-tab>
      <v-tab value="profile">Profile</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item v-if="canSeeHistory" value="history">
        <PatientHistory
          :key="visits.length"
          :visits="visits"
          :can-add-addendum="canAddAddendum"
          @add-addendum="(id) => (addendumFor = id)"
        />
      </v-window-item>
      <v-window-item value="profile">
        <SectionCard title="Demographics" description="Kept current at each visit.">
          <PatientProfile :patient="patient" />
        </SectionCard>
      </v-window-item>
    </v-window>

    <PatientEditDialog v-if="canEdit" v-model="editOpen" :patient="patient" @saved="onSaved" />
    <IntakeDialog v-if="canEnqueue" v-model="intakeOpen" :patient="patient" @saved="reloadHistory" />
    <AddendumDialog v-model="addendumOpen" :consultation-id="addendumFor" @saved="reloadHistory" />
  </template>
</template>

<style scoped>
.open-visit {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}
</style>
