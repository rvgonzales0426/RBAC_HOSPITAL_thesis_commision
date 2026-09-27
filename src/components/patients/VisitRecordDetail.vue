<script setup lang="ts">
import { computed } from 'vue'
import VitalsSummary from '@/components/opd/VitalsSummary.vue'
import LabResultsList from '@/components/opd/LabResultsList.vue'
import PrescriptionList from '@/components/opd/PrescriptionList.vue'
import { useStaffStore } from '@/stores/staff'
import { formatDate, formatDateTime, physicianName, staffName } from '@/config/opd'
import type { VisitRecord } from '@/types'

/**
 * Everything recorded for one visit: intake, the physician's note,
 * prescriptions, labs and addenda. Sections the reader has no access to
 * arrive empty from RLS and are simply not drawn.
 */
const props = defineProps<{ visit: VisitRecord; canAddAddendum?: boolean }>()
const emit = defineEmits<{ addAddendum: [consultationId: string] }>()

const staff = useStaffStore()
const note = computed(() => props.visit.consultation ?? null)

const noteSections = computed(() => {
  const c = note.value
  if (!c) return []
  return [
    { label: 'Symptoms', text: c.symptoms },
    { label: 'Physical examination', text: c.physical_exam },
    {
      label: 'Diagnosis',
      text: c.diagnosis && (c.icd10_code ? `${c.diagnosis} (${c.icd10_code})` : c.diagnosis),
    },
    { label: 'Treatment plan', text: c.treatment_plan },
    { label: 'Notes', text: c.notes },
  ].filter((section) => section.text?.trim())
})
</script>

<template>
  <div class="record">
    <section class="record__block">
      <h4 class="record__heading">Intake</h4>
      <p class="record__text"><strong>Chief complaint:</strong> {{ visit.chief_complaint }}</p>
      <VitalsSummary :vitals="visit" class="mt-2" />
      <p v-if="visit.cancel_reason" class="record__muted mt-2">
        Closed: {{ visit.cancel_reason }}
      </p>
    </section>

    <section v-if="note" class="record__block">
      <h4 class="record__heading">
        Consultation
        <span class="record__muted">
          — {{ physicianName(staff.get(note.physician_id)) }}
          <template v-if="note.finalized_at">, finalized {{ formatDateTime(note.finalized_at) }}</template>
          <template v-else>, in progress</template>
        </span>
      </h4>
      <dl v-if="noteSections.length" class="record__note">
        <template v-for="section in noteSections" :key="section.label">
          <dt>{{ section.label }}</dt>
          <dd>{{ section.text }}</dd>
        </template>
      </dl>
      <p v-else class="record__muted">Nothing documented yet.</p>
      <p v-if="note.follow_up_date" class="record__text mt-2">
        <strong>Follow-up:</strong> {{ formatDate(note.follow_up_date) }}
      </p>
    </section>

    <section v-if="note?.prescriptions?.length" class="record__block">
      <div class="record__heading-row">
        <h4 class="record__heading">Prescriptions</h4>
        <v-btn
          size="small"
          variant="text"
          prepend-icon="mdi-printer-outline"
          :to="{ name: 'print-prescription', params: { visitId: visit.id } }"
          target="_blank"
        >
          Print
        </v-btn>
      </div>
      <PrescriptionList :prescriptions="note.prescriptions" />
    </section>

    <section v-if="visit.lab_orders?.length" class="record__block">
      <h4 class="record__heading">Laboratory</h4>
      <LabResultsList :orders="visit.lab_orders" />
    </section>

    <section v-if="note?.finalized_at" class="record__block">
      <div class="record__heading-row">
        <h4 class="record__heading">Addenda</h4>
        <v-btn
          v-if="canAddAddendum"
          size="small"
          variant="text"
          prepend-icon="mdi-plus"
          @click="emit('addAddendum', note.id)"
        >
          Add addendum
        </v-btn>
      </div>
      <ul v-if="note.addenda?.length" class="record__addenda">
        <li v-for="addendum in note.addenda" :key="addendum.id">
          <div class="record__muted">
            {{ staffName(staff.get(addendum.author_id)) }} · {{ formatDateTime(addendum.created_at) }}
          </div>
          <div class="record__text">{{ addendum.body }}</div>
        </li>
      </ul>
      <p v-else class="record__muted">
        None. A finalized note is not edited; corrections are added here, signed and dated.
      </p>
    </section>
  </div>
</template>

<style scoped>
.record {
  display: grid;
  gap: 18px;
}

.record__block + .record__block {
  padding-top: 18px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.record__heading {
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.record__heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.record__heading-row .record__heading {
  margin-bottom: 0;
}

.record__text {
  font-size: 0.875rem;
  white-space: pre-line;
}

.record__muted {
  font-size: 0.8125rem;
  font-weight: 400;
  color: rgb(var(--v-theme-text-secondary));
}

.record__note {
  display: grid;
  grid-template-columns: 170px 1fr;
  gap: 6px 16px;
  font-size: 0.875rem;
}

.record__note dt {
  color: rgb(var(--v-theme-text-secondary));
}

.record__note dd {
  margin: 0;
  white-space: pre-line;
}

@media (max-width: 600px) {
  .record__note {
    grid-template-columns: 1fr;
  }

  .record__note dd {
    margin-bottom: 6px;
  }
}

.record__addenda {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.record__addenda li {
  padding-left: 10px;
  border-left: 2px solid rgb(var(--v-theme-primary));
}
</style>
