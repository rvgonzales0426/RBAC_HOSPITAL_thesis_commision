<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PatientHistory from '@/components/patients/PatientHistory.vue'
import { useEmrStore } from '@/stores/emr'
import { patientName } from '@/config/opd'
import type { Patient, VisitRecord } from '@/types'

/**
 * The patient's past visits, opened over the consultation so the physician
 * never loses their place in the note. The current visit is left out.
 */
const props = defineProps<{ patient: Patient; excludeVisitId?: string }>()
const open = defineModel<boolean>({ required: true })

const emr = useEmrStore()
const visits = ref<VisitRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const past = computed(() => visits.value.filter((visit) => visit.id !== props.excludeVisitId))

watch(open, async (value) => {
  if (!value) return
  loading.value = true
  error.value = null
  try {
    visits.value = await emr.fetchHistory(props.patient.id)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not load the history.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <v-dialog v-model="open" max-width="960" scrollable>
    <v-card class="rounded-overlay">
      <v-card-title>Medical history</v-card-title>
      <v-card-subtitle>{{ patientName(patient) }} · {{ patient.patient_no }}</v-card-subtitle>
      <v-card-text>
        <v-skeleton-loader v-if="loading" type="list-item-two-line, list-item-two-line" />
        <v-alert v-else-if="error" type="error">{{ error }}</v-alert>
        <PatientHistory v-else :key="past.length" :visits="past" />
      </v-card-text>
      <v-card-actions>
        <v-btn
          variant="text"
          prepend-icon="mdi-open-in-new"
          :to="{ name: 'patient-detail', params: { id: patient.id } }"
          target="_blank"
        >
          Open full record
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="open = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
