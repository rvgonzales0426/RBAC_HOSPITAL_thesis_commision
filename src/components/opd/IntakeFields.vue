<script setup lang="ts">
import { PRIORITY_REASONS } from '@/config/opd'
import {
  VITAL_FIELDS,
  intakeRules,
  vitalRule,
  type IntakeDraft,
} from '@/composables/useIntakeForm'

/** Chief complaint, priority lane and vital signs. The parent owns the draft and form. */
const props = defineProps<{ draft: IntakeDraft; disabled?: boolean }>()
</script>

<template>
  <div class="intake">
    <v-textarea
      v-model="draft.chief_complaint"
      label="Chief complaint"
      placeholder="In the patient’s words, e.g. “Cough and fever for three days”"
      rows="2"
      :rules="intakeRules.chiefComplaint"
      :disabled="disabled"
    />

    <div class="intake__priority">
      <v-switch
        v-model="draft.is_priority"
        label="Priority lane"
        :disabled="disabled"
        class="flex-grow-0"
      />
      <v-select
        v-if="draft.is_priority"
        v-model="draft.priority_reason"
        :items="PRIORITY_REASONS"
        label="Reason"
        :rules="intakeRules.priorityReason(props.draft)"
        :disabled="disabled"
        class="intake__reason"
      />
      <p v-else class="intake__hint">
        Senior citizens, persons with disability and pregnant patients are called ahead of the
        regular line.
      </p>
    </div>

    <div>
      <div class="intake__label">Vital signs <span>(optional)</span></div>
      <div class="intake__vitals">
        <v-text-field
          v-for="field in VITAL_FIELDS"
          :key="field.key"
          v-model="draft.vitals[field.key]"
          :label="field.label"
          :suffix="field.unit"
          inputmode="decimal"
          density="compact"
          :rules="[vitalRule(field)]"
          :disabled="disabled"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.intake {
  display: grid;
  gap: 16px;
}

.intake__priority {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.intake__reason {
  flex: 1 1 220px;
  max-width: 320px;
}

.intake__hint {
  flex: 1 1 260px;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}

.intake__label {
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 10px;
  color: rgb(var(--v-theme-text-secondary));
}

.intake__label span {
  font-weight: 400;
}

.intake__vitals {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 960px) {
  .intake__vitals {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
