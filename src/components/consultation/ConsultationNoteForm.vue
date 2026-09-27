<script setup lang="ts">
import { computed } from 'vue'
import { formatTime } from '@/config/opd'
import type { useConsultationNote } from '@/composables/useConsultationNote'

/**
 * The clinical note, in the order a consultation happens. Saving is
 * automatic; the footer says so, so nobody hunts for a Save button.
 */
const props = defineProps<{ note: ReturnType<typeof useConsultationNote> }>()

const draft = props.note.draft

const status = computed(() => {
  const note = props.note
  if (note.locked.value) return 'Finalized — read only'
  if (note.saving.value) return 'Saving…'
  if (note.error.value) return 'Not saved — retrying on your next change'
  if (note.dirty.value) return 'Unsaved changes'
  if (note.savedAt.value) return `Saved at ${formatTime(note.savedAt.value.toISOString())}`
  return 'Saved automatically as you type'
})
</script>

<template>
  <div class="note">
    <v-textarea
      v-model="draft.symptoms"
      label="Symptoms and history of present illness"
      rows="3"
      :readonly="note.locked.value"
    />
    <v-textarea
      v-model="draft.physical_exam"
      label="Physical examination"
      rows="3"
      :readonly="note.locked.value"
    />
    <div class="note__row">
      <v-text-field
        v-model="draft.diagnosis"
        label="Diagnosis"
        hint="Required to complete the consultation."
        persistent-hint
        :readonly="note.locked.value"
        class="note__diagnosis"
      />
      <v-text-field
        v-model="draft.icd10_code"
        label="ICD-10 code"
        placeholder="e.g. J06.9"
        :readonly="note.locked.value"
        class="note__code"
      />
    </div>
    <v-textarea
      v-model="draft.treatment_plan"
      label="Treatment plan"
      rows="3"
      :readonly="note.locked.value"
    />
    <v-textarea v-model="draft.notes" label="Other notes" rows="2" :readonly="note.locked.value" />
    <v-text-field
      v-model="draft.follow_up_date"
      label="Follow-up date"
      type="date"
      :readonly="note.locked.value"
      class="note__date"
    />

    <div class="note__status" :class="{ 'text-error': note.error.value }">
      <v-icon
        :icon="note.dirty.value || note.saving.value ? 'mdi-cloud-upload-outline' : 'mdi-cloud-check-outline'"
        size="16"
      />
      {{ status }}
    </div>
  </div>
</template>

<style scoped>
.note {
  display: grid;
  gap: 16px;
}

.note__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  gap: 14px;
}

.note__date {
  max-width: 240px;
}

.note__status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: rgb(var(--v-theme-text-secondary));
}

@media (max-width: 600px) {
  .note__row {
    grid-template-columns: 1fr;
  }
}
</style>
