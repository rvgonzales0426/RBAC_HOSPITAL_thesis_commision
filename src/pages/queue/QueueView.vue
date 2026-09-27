<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatCard from '@/components/common/StatCard.vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import QueueTable from '@/components/queue/QueueTable.vue'
import PhysicianRoster from '@/components/queue/PhysicianRoster.vue'
import IntakeDialog from '@/components/dialogs/IntakeDialog.vue'
import CancelVisitDialog from '@/components/dialogs/CancelVisitDialog.vue'
import ReassignDialog from '@/components/dialogs/ReassignDialog.vue'
import { useQueueBoard } from '@/composables/useQueueBoard'
import { usePermissions } from '@/composables/usePermissions'
import { PERMISSIONS } from '@/config/permissions'

const {
  now,
  waiting,
  inConsultation,
  awaitingLab,
  readyForReview,
  roster,
  loading,
  loaded,
  stale,
  canManage,
  intakeOpen,
  cancelOpen,
  reassignOpen,
  target,
  cancelAsNoShow,
  openIntake,
  openCancel,
  openReassign,
  closeStale,
  refresh,
} = useQueueBoard()

const { can } = usePermissions()
</script>

<template>
  <PageHeader
    title="OPD queue"
    description="First in, first out — with the priority lane called ahead. Updates live as patients move."
  >
    <template #actions>
      <v-btn variant="outlined" prepend-icon="mdi-refresh" :loading="refresh.loading.value" @click="refresh.run()">
        Refresh
      </v-btn>
      <v-btn
        v-if="can(PERMISSIONS.PatientsWrite)"
        color="primary"
        prepend-icon="mdi-account-plus-outline"
        :to="{ name: 'patient-register' }"
      >
        Register patient
      </v-btn>
      <v-btn
        v-else-if="can(PERMISSIONS.PatientsRead)"
        color="primary"
        prepend-icon="mdi-magnify"
        :to="{ name: 'patients' }"
      >
        Find patient
      </v-btn>
    </template>
  </PageHeader>

  <v-alert
    v-if="canManage && stale.length"
    type="warning"
    class="mb-5"
    :title="`${stale.length} ${stale.length === 1 ? 'patient is' : 'patients are'} still waiting from an earlier day`"
  >
    They were never called. Close them as no-shows so today’s line starts clean — their records stay.
    <template #append>
      <v-btn
        variant="outlined"
        color="warning"
        :loading="closeStale.loading.value"
        @click="closeStale.run()"
      >
        Close as no-show
      </v-btn>
    </template>
  </v-alert>

  <div class="surface-panel stats mb-5">
    <StatCard label="Waiting" :value="waiting.length" icon="mdi-timer-sand" icon-color="warning" :loading="!loaded" />
    <StatCard label="In consultation" :value="inConsultation.length" icon="mdi-stethoscope" icon-color="success" :loading="!loaded" />
    <StatCard label="At laboratory" :value="awaitingLab.length" icon="mdi-flask-outline" icon-color="info" :loading="!loaded" />
    <StatCard label="Results ready" :value="readyForReview.length" icon="mdi-file-check-outline" icon-color="error" :loading="!loaded" />
  </div>

  <div class="board">
    <div class="board__main">
      <SectionCard
        title="Waiting line"
        description="In the order they will be called. The next physician to press Next gets the top patient."
        flush
      >
        <TableSkeleton v-if="loading && !loaded" :rows="4" :columns="5" />
        <QueueTable
          v-else
          :visits="waiting"
          variant="waiting"
          :now="now"
          :can-manage="canManage"
          empty-title="Nobody is waiting"
          empty-description="Registered patients join the line here the moment they are queued."
          @edit-intake="openIntake"
          @cancel="(visit) => openCancel(visit, false)"
          @no-show="(visit) => openCancel(visit, true)"
        />
      </SectionCard>

      <SectionCard title="With a physician" description="Being seen now, or back from the lab and waiting for their doctor." flush>
        <QueueTable
          :visits="[...inConsultation, ...readyForReview]"
          variant="assigned"
          :now="now"
          :can-manage="canManage"
          empty-title="No consultations in progress"
          empty-description="Patients show here once a physician calls them in."
          @edit-intake="openIntake"
          @cancel="(visit) => openCancel(visit, false)"
          @reassign="openReassign"
        />
      </SectionCard>

      <SectionCard title="At the laboratory" description="Tests ordered; the patient returns to their doctor when results are released." flush>
        <QueueTable
          :visits="awaitingLab"
          variant="assigned"
          :now="now"
          :can-manage="canManage"
          empty-title="No one is at the lab"
          empty-description="Patients show here while their tests are being processed."
          @edit-intake="openIntake"
          @cancel="(visit) => openCancel(visit, false)"
          @reassign="openReassign"
        />
      </SectionCard>
    </div>

    <SectionCard title="Physicians on duty" description="Live availability." flush class="board__side">
      <PhysicianRoster :physicians="roster" />
    </SectionCard>
  </div>

  <template v-if="canManage">
    <IntakeDialog v-model="intakeOpen" :visit="target" />
    <CancelVisitDialog v-model="cancelOpen" :visit="target" :no-show="cancelAsNoShow" />
    <ReassignDialog v-model="reassignOpen" :visit="target" />
  </template>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.stats > * + * {
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

@media (max-width: 760px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .stats > :nth-child(odd) {
    border-left: none;
  }

  .stats > :nth-child(n + 3) {
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
}

.board {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 20px;
  align-items: start;
}

.board__main {
  display: grid;
  gap: 20px;
  min-width: 0;
}

@media (max-width: 1100px) {
  .board {
    grid-template-columns: 1fr;
  }
}
</style>
