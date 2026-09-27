<script setup lang="ts">
import type { DutyStatus } from '@/types'

/** The physician's own availability. The queue board and the Next button both follow it. */
const props = defineProps<{ status: DutyStatus; loading?: boolean }>()
const emit = defineEmits<{ change: [status: DutyStatus] }>()

function onUpdate(value: DutyStatus) {
  if (value !== props.status) emit('change', value)
}

const options: { value: DutyStatus; label: string; icon: string }[] = [
  { value: 'available', label: 'Available', icon: 'mdi-check-circle-outline' },
  { value: 'on_break', label: 'On break', icon: 'mdi-coffee-outline' },
  { value: 'off_duty', label: 'Off duty', icon: 'mdi-power' },
]
</script>

<template>
  <v-btn-toggle
    :model-value="status"
    mandatory
    divided
    variant="outlined"
    density="comfortable"
    color="primary"
    :disabled="loading"
    class="duty"
    @update:model-value="onUpdate"
  >
    <v-btn v-for="option in options" :key="option.value" :value="option.value" :prepend-icon="option.icon">
      {{ option.label }}
    </v-btn>
  </v-btn-toggle>
</template>

<style scoped>
.duty {
  height: 38px !important;
}
</style>
