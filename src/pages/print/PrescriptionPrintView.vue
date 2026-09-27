<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useEmrStore } from '@/stores/emr'
import { useStaffStore } from '@/stores/staff'
import { APP_NAME } from '@/config/app'
import { formatDate, patientAge, patientName } from '@/config/opd'
import type { Physician, Prescription, VisitRecord } from '@/types'

/**
 * A prescription sheet, laid out for A5/letter paper. Opens in its own tab
 * without the app shell, so the browser's print dialog prints just the Rx.
 */
const route = useRoute()
const emr = useEmrStore()
const staff = useStaffStore()

const appName = APP_NAME
const visit = ref<VisitRecord | null>(null)
const physician = ref<Physician | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const [sheet] = await Promise.all([
      emr.fetchPrescriptionSheet(String(route.params.visitId)),
      staff.ensureLoaded(),
    ])
    if (!sheet) error.value = 'This visit could not be found, or your role cannot open it.'
    else {
      visit.value = sheet.visit
      physician.value = sheet.physician
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not load the prescription.'
  } finally {
    loading.value = false
  }
})

const patient = computed(() => visit.value?.patient ?? null)
const prescriptions = computed(() => visit.value?.consultation?.prescriptions ?? [])
const doctorName = computed(() => {
  const id = visit.value?.consultation?.physician_id ?? visit.value?.physician_id
  return staff.get(id)?.full_name?.trim() || '______________________'
})
const address = computed(() => {
  const p = patient.value
  if (!p) return ''
  return [p.address_line, p.barangay, p.city_municipality, p.province].filter(Boolean).join(', ')
})

const sig = (row: Prescription) =>
  [row.dose, row.frequency, row.duration && `for ${row.duration}`].filter(Boolean).join(', ')

// Templates cannot reach `window`; the button calls this instead.
const printSheet = () => window.print()
</script>

<template>
  <div class="print-page">
    <div class="print-toolbar no-print">
      <v-btn color="primary" prepend-icon="mdi-printer-outline" :disabled="!visit" @click="printSheet">
        Print
      </v-btn>
      <span class="text-body-2 text-medium-emphasis">Use your browser’s print dialog; choose A5 or Letter.</span>
    </div>

    <p v-if="loading" class="print-message">Loading prescription…</p>
    <p v-else-if="error" class="print-message">{{ error }}</p>
    <p v-else-if="!prescriptions.length" class="print-message">
      No medicines were prescribed at this visit.
    </p>

    <article v-else-if="visit && patient" class="rx-sheet">
      <header class="rx-sheet__head">
        <div class="rx-sheet__facility">{{ appName }}</div>
        <div class="rx-sheet__dept">Outpatient Department</div>
      </header>

      <section class="rx-sheet__patient">
        <div><span>Name</span>{{ patientName(patient) }}</div>
        <div><span>Age / sex</span>{{ patientAge(patient.birth_date) }} / {{ patient.sex === 'female' ? 'F' : 'M' }}</div>
        <div><span>Record no.</span>{{ patient.patient_no }}</div>
        <div><span>Date</span>{{ formatDate(visit.visit_date) }}</div>
        <div class="rx-sheet__wide"><span>Address</span>{{ address || '—' }}</div>
        <div v-if="visit.consultation?.diagnosis" class="rx-sheet__wide">
          <span>Diagnosis</span>{{ visit.consultation.diagnosis }}
        </div>
      </section>

      <div class="rx-sheet__symbol">℞</div>

      <ol class="rx-sheet__list">
        <li v-for="row in prescriptions" :key="row.id">
          <div class="rx-sheet__drug">
            {{ row.medicine }}
            <span v-if="row.quantity">#{{ row.quantity }}</span>
          </div>
          <div v-if="sig(row)" class="rx-sheet__sig">Sig: {{ sig(row) }}</div>
          <div v-if="row.instructions" class="rx-sheet__sig">{{ row.instructions }}</div>
        </li>
      </ol>

      <footer class="rx-sheet__foot">
        <div v-if="visit.consultation?.follow_up_date" class="rx-sheet__follow">
          Follow-up: {{ formatDate(visit.consultation.follow_up_date) }}
        </div>
        <div class="rx-sheet__sign">
          <div class="rx-sheet__line" />
          <div class="rx-sheet__doctor">{{ doctorName }}, MD</div>
          <div>License no. {{ physician?.license_no || '____________' }}</div>
        </div>
      </footer>
    </article>
  </div>
</template>

<style scoped>
.print-page {
  min-height: 100vh;
  padding: 24px 16px 48px;
  background-color: rgb(var(--v-theme-background));
}

.print-toolbar {
  max-width: 640px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.print-message {
  max-width: 640px;
  margin: 40px auto;
  text-align: center;
  color: rgb(var(--v-theme-text-secondary));
}

/* Paper is white in both themes. */
.rx-sheet {
  max-width: 640px;
  margin: 0 auto;
  padding: 36px 40px;
  background: #fff;
  color: #111;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.9375rem;
}

.rx-sheet__head {
  text-align: center;
  padding-bottom: 14px;
  border-bottom: 2px solid #111;
}

.rx-sheet__facility {
  font-size: 1.125rem;
  font-weight: 700;
}

.rx-sheet__dept {
  font-size: 0.8125rem;
}

.rx-sheet__patient {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 20px;
  padding: 14px 0;
  border-bottom: 1px solid #cbd5e1;
  font-size: 0.875rem;
}

.rx-sheet__patient span {
  display: inline-block;
  min-width: 78px;
  color: #475569;
}

.rx-sheet__wide {
  grid-column: 1 / -1;
}

.rx-sheet__symbol {
  margin: 14px 0 6px;
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1;
}

.rx-sheet__list {
  margin: 0;
  padding-left: 22px;
  display: grid;
  gap: 12px;
  min-height: 180px;
}

.rx-sheet__drug {
  font-weight: 700;
}

.rx-sheet__drug span {
  margin-left: 8px;
  font-weight: 500;
}

.rx-sheet__sig {
  font-size: 0.875rem;
}

.rx-sheet__foot {
  margin-top: 36px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  font-size: 0.875rem;
}

.rx-sheet__sign {
  margin-left: auto;
  text-align: center;
  min-width: 220px;
}

.rx-sheet__line {
  border-top: 1px solid #111;
  margin-bottom: 4px;
}

.rx-sheet__doctor {
  font-weight: 700;
}

@media print {
  .no-print {
    display: none !important;
  }

  .print-page {
    padding: 0;
    background: #fff;
  }

  .rx-sheet {
    border: none;
    max-width: none;
    padding: 0;
  }
}
</style>
