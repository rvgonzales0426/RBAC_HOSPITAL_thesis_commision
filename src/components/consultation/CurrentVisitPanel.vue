<script setup lang="ts">
import { computed, ref } from 'vue'
import SectionCard from '@/components/common/SectionCard.vue'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog.vue'
import LabOrderDialog from '@/components/dialogs/LabOrderDialog.vue'
import HistoryDialog from '@/components/dialogs/HistoryDialog.vue'
import PatientBanner from '@/components/opd/PatientBanner.vue'
import VitalsSummary from '@/components/opd/VitalsSummary.vue'
import LabResultsList from '@/components/opd/LabResultsList.vue'
import ConsultationNoteForm from './ConsultationNoteForm.vue'
import PrescriptionEditor from './PrescriptionEditor.vue'
import { useConsultationNote } from '@/composables/useConsultationNote'
import { useVisitActions } from '@/composables/useVisitActions'
import { formatTime, ticketLabel } from '@/config/opd'
import type { VisitRecord } from '@/types'

/** The patient in the room: who they are, the note, the orders, and the ways out. */
const props = defineProps<{ visit: VisitRecord; physicianId: string }>()

const note = useConsultationNote(() => props.visit.consultation ?? null)
const { completeOpen, releaseOpen, complete, release } = useVisitActions(
  () => props.visit,
  () => props.physicianId,
  note.save,
)

const labOrderOpen = ref(false)
const historyOpen = ref(false)

const consultation = computed(() => props.visit.consultation ?? null)
const orders = computed(() => props.visit.lab_orders ?? [])
const prescriptions = computed(() => consultation.value?.prescriptions ?? [])
/** Once labs were requested the patient is this doctor's; release is for unseen patients. */
const canRelease = computed(() => !props.visit.lab_requested_at)
const hasDiagnosis = computed(() => Boolean(note.draft.diagnosis.trim()))
</script>

<template>
  <div class="visit">
    <div class="visit__main">
      <section class="surface-panel pa-5">
        <div class="visit__ticket">
          <span class="tabular-nums">{{ ticketLabel(visit.queue_number) }}</span>
          · called {{ formatTime(visit.called_at) }}
          <template v-if="visit.results_ready_at"> · back from the lab</template>
        </div>
        <PatientBanner v-if="visit.patient" :patient="visit.patient">
          <template #actions>
            <v-btn variant="outlined" prepend-icon="mdi-history" @click="historyOpen = true">
              History
            </v-btn>
          </template>
        </PatientBanner>
        <div v-if="visit.patient?.chronic_conditions" class="visit__chronic">
          Chronic conditions: {{ visit.patient.chronic_conditions }}
        </div>
      </section>

      <SectionCard title="Intake" description="Recorded at the desk.">
        <p class="visit__complaint"><strong>Chief complaint:</strong> {{ visit.chief_complaint }}</p>
        <VitalsSummary :vitals="visit" />
      </SectionCard>

      <SectionCard
        v-if="orders.length"
        title="Laboratory results"
        description="Released results for this visit. Out-of-range values are flagged."
      >
        <LabResultsList :orders="orders" />
      </SectionCard>

      <SectionCard title="Consultation note">
        <v-alert v-if="!consultation" type="warning">
          This visit has no consultation record. Release the patient and call them again.
        </v-alert>
        <ConsultationNoteForm v-else :note="note" />
      </SectionCard>

      <SectionCard v-if="consultation" title="Prescriptions">
        <template #actions>
          <v-btn
            v-if="prescriptions.length"
            variant="text"
            size="small"
            prepend-icon="mdi-printer-outline"
            :to="{ name: 'print-prescription', params: { visitId: visit.id } }"
            target="_blank"
          >
            Print
          </v-btn>
        </template>
        <PrescriptionEditor :consultation-id="consultation.id" :prescriptions="prescriptions" />
      </SectionCard>
    </div>

    <aside class="visit__side">
      <SectionCard title="Next step">
        <div class="visit__actions">
          <v-btn
            color="primary"
            block
            prepend-icon="mdi-check-circle-outline"
            :disabled="!consultation"
            @click="completeOpen = true"
          >
            Complete consultation
          </v-btn>
          <p v-if="!hasDiagnosis" class="visit__hint">A diagnosis is required to complete.</p>

          <v-btn
            variant="outlined"
            block
            prepend-icon="mdi-flask-outline"
            :disabled="!consultation"
            @click="labOrderOpen = true"
          >
            Order lab tests
          </v-btn>

          <v-btn
            v-if="canRelease"
            variant="text"
            block
            prepend-icon="mdi-undo-variant"
            @click="releaseOpen = true"
          >
            Return to waiting line
          </v-btn>
        </div>
      </SectionCard>
    </aside>

    <LabOrderDialog
      v-model="labOrderOpen"
      :visit-id="visit.id"
      :physician-id="physicianId"
      :before-submit="note.save"
    />
    <HistoryDialog
      v-if="visit.patient"
      v-model="historyOpen"
      :patient="visit.patient"
      :exclude-visit-id="visit.id"
    />
    <ConfirmDialog
      v-model="completeOpen"
      title="Complete this consultation?"
      message="The note and prescriptions are finalized and can no longer be edited — later corrections go in as addenda. The patient leaves the OPD."
      confirm-label="Complete consultation"
      :loading="complete.loading.value"
      @confirm="complete.run()"
    />
    <ConfirmDialog
      v-model="releaseOpen"
      title="Return the patient to the waiting line?"
      message="They keep their original place and the next available physician calls them. Use this if you cannot see them now."
      confirm-label="Return to line"
      :loading="release.loading.value"
      @confirm="release.run()"
    />
  </div>

</template>

<style scoped>
.visit {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 20px;
  align-items: start;
}

.visit__main {
  display: grid;
  gap: 20px;
  min-width: 0;
}

.visit__side {
  position: sticky;
  top: 80px;
}

.visit__ticket {
  margin-bottom: 12px;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}

.visit__ticket span {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.visit__chronic {
  margin-top: 10px;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}

.visit__complaint {
  margin-bottom: 12px;
  font-size: 0.875rem;
}

.visit__actions {
  display: grid;
  gap: 10px;
}

.visit__hint {
  margin-top: -4px;
  font-size: 0.75rem;
  color: rgb(var(--v-theme-text-secondary));
}

@media (max-width: 1100px) {
  .visit {
    grid-template-columns: 1fr;
  }

  .visit__side {
    position: static;
  }
}
</style>
