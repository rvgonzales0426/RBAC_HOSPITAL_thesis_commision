<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import PatientSearchList from '@/components/patients/PatientSearchList.vue'
</script>

<template>
  <PageHeader
    title="Patients"
    description="Find a patient’s record before registering them again — most walk-ins have been here before."
  />

  <PatientSearchList />
</template>
