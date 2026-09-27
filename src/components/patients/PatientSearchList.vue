<script setup lang="ts">
import { useRouter } from 'vue-router'
import SectionCard from '@/components/common/SectionCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import { usePatientSearch } from '@/composables/usePatientSearch'
import { usePermissions } from '@/composables/usePermissions'
import { PERMISSIONS } from '@/config/permissions'
import { formatDate, patientAge, patientName } from '@/config/opd'
import type { Patient } from '@/types'

const { term, results, searching, searchedFor } = usePatientSearch()
const { can } = usePermissions()
const router = useRouter()

const headers = [
  { title: 'Patient', key: 'name', sortable: false },
  { title: 'Record no.', key: 'patient_no', sortable: false, width: 150 },
  { title: 'Sex / age', key: 'age', sortable: false, width: 110 },
  { title: 'Contact', key: 'contact_number', sortable: false, width: 150 },
  { title: 'Registered', key: 'created_at', sortable: false, width: 130 },
]

function onRowClick(_event: Event, row: { item: Patient }) {
  router.push({ name: 'patient-detail', params: { id: row.item.id } })
}
</script>

<template>
  <SectionCard
    :title="searchedFor ? 'Search results' : 'Recently registered'"
    description="Search by any part of the name, the record number, phone or PhilHealth number."
    flush
  >
    <template #actions>
      <v-btn
        v-if="can(PERMISSIONS.PatientsWrite)"
        color="primary"
        prepend-icon="mdi-account-plus-outline"
        :to="{ name: 'patient-register' }"
      >
        Register patient
      </v-btn>
    </template>

    <div class="toolbar">
      <v-text-field
        v-model="term"
        placeholder="e.g. dela cruz juan, PT-2026-000123, 0917…"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        clearable
        autofocus
        :loading="searching"
      />
    </div>

    <TableSkeleton v-if="searching && !results.length" :rows="6" :columns="5" />

    <EmptyState
      v-else-if="!results.length && searchedFor"
      icon="mdi-account-search-outline"
      title="No patient matches that search"
      description="Check the spelling or try the record number. If this is their first visit, register them."
    >
      <template #action>
        <v-btn
          v-if="can(PERMISSIONS.PatientsWrite)"
          color="primary"
          :to="{ name: 'patient-register' }"
        >
          Register a new patient
        </v-btn>
      </template>
    </EmptyState>

    <EmptyState
      v-else-if="!results.length"
      icon="mdi-account-multiple-outline"
      title="No patients registered yet"
      description="Registered patients show up here, newest first."
    />

    <v-data-table
      v-else
      :headers="headers"
      :items="results"
      item-value="id"
      :items-per-page="25"
      hide-default-footer
      class="patient-table"
      @click:row="onRowClick"
    >
      <template #item.name="{ item }">
        <span class="patient-cell">{{ patientName(item) }}</span>
      </template>
      <template #item.age="{ item }">
        {{ item.sex === 'female' ? 'F' : 'M' }} · {{ patientAge(item.birth_date) }}
      </template>
      <template #item.contact_number="{ item }">
        {{ item.contact_number || '—' }}
      </template>
      <template #item.created_at="{ item }">
        {{ formatDate(item.created_at) }}
      </template>
    </v-data-table>
  </SectionCard>
</template>

<style scoped>
.toolbar {
  padding: 14px 20px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background-color: rgb(var(--v-theme-surface-alt));
}

.patient-table :deep(tbody tr) {
  cursor: pointer;
}

.patient-cell {
  font-weight: 500;
}
</style>
