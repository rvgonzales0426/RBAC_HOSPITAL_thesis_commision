<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import DutyControl from '@/components/consultation/DutyControl.vue'
import MyPatientsPanel from '@/components/consultation/MyPatientsPanel.vue'
import CurrentVisitPanel from '@/components/consultation/CurrentVisitPanel.vue'
import PhysicianDetailsDialog from '@/components/dialogs/PhysicianDetailsDialog.vue'
import { useConsultationWorkspace } from '@/composables/useConsultationWorkspace'
import { useClock } from '@/composables/useClock'

const {
  me,
  current,
  loaded,
  dutyStatus,
  waitingCount,
  myAtLab,
  myReady,
  canCallNext,
  callNextHint,
  setDuty,
  callNext,
} = useConsultationWorkspace()

const { now } = useClock()
const detailsOpen = ref(false)
</script>

<template>
  <PageHeader
    title="Consultation"
    description="Call the next patient, document the visit, order tests and review results — all from here."
  >
    <template #actions>
      <v-btn variant="text" prepend-icon="mdi-card-account-details-outline" @click="detailsOpen = true">
        My details
      </v-btn>
      <DutyControl :status="dutyStatus" :loading="setDuty.loading.value" @change="setDuty.run" />
    </template>
  </PageHeader>

  <div v-if="!loaded" class="surface-panel pa-6">
    <v-skeleton-loader type="list-item-avatar-two-line, paragraph" />
  </div>

  <CurrentVisitPanel v-else-if="current" :key="current.id" :visit="current" :physician-id="me" />

  <div v-else class="idle">
    <section class="surface-panel idle__call">
      <EmptyState
        icon="mdi-account-arrow-right-outline"
        title="No patient in the room"
        :description="callNextHint ?? `${waitingCount} waiting. The next patient in line is yours when you call.`"
      >
        <template #action>
          <v-btn
            color="primary"
            size="large"
            prepend-icon="mdi-bullhorn-outline"
            :disabled="!canCallNext"
            :loading="callNext.loading.value"
            @click="callNext.run()"
          >
            Call next patient
          </v-btn>
        </template>
      </EmptyState>
    </section>

    <SectionCard
      title="Your patients elsewhere"
      description="Back from the lab, or still there. Results-ready patients are called before new arrivals."
      flush
    >
      <MyPatientsPanel :ready="myReady" :at-lab="myAtLab" :now="now" />
    </SectionCard>
  </div>

  <PhysicianDetailsDialog v-model="detailsOpen" :profile-id="me" />
</template>

<style scoped>
.idle {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
  align-items: start;
}

.idle__call {
  padding: 24px 0;
}

@media (max-width: 1100px) {
  .idle {
    grid-template-columns: 1fr;
  }
}
</style>
