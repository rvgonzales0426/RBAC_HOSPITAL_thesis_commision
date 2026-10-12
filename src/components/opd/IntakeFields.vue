<script setup lang="ts">
import { computed } from 'vue'
import PriorityLaneInfo from './PriorityLaneInfo.vue'
import { PRIORITY_REASONS, priorityBasisFor } from '@/config/opd'
import {
  VITAL_FIELDS,
  intakeRules,
  vitalRule,
  type IntakeDraft,
} from '@/composables/useIntakeForm'

/** Chief complaint, priority lane and vital signs. The parent owns the draft and form. */
const props = defineProps<{ draft: IntakeDraft; disabled?: boolean }>()

/** The law (or hospital policy) behind the chosen reason, shown under the picker. */
const basis = computed(() => priorityBasisFor(props.draft.priority_reason))
/** "RA 7277 (Magna Carta…), as amended by RA 9442 and RA 10754" — the first law is the act itself. */
const primaryLaw = computed(() => basis.value?.laws[0] ?? null)
const amendments = computed(() => basis.value?.laws.slice(1) ?? [])
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
      <div class="intake__switch">
        <v-switch
          v-model="draft.is_priority"
          label="Priority lane"
          :disabled="disabled"
          class="flex-grow-0"
        />
        <PriorityLaneInfo />
      </div>

      <!-- Says in words which line the patient joins, so the switch is never ambiguous. -->
      <div class="intake__lane" :class="{ 'intake__lane--priority': draft.is_priority }">
        <v-icon
          :icon="draft.is_priority ? 'mdi-account-arrow-up-outline' : 'mdi-format-list-numbered'"
          size="18"
          class="intake__lane-icon"
        />
        <div>
          <template v-if="draft.is_priority">
            <strong>Priority lane</strong> — this patient is called ahead of the regular queue.
          </template>
          <template v-else>
            <strong>Regular queue</strong> — this patient is called in order of arrival, first
            in, first out.
            <div class="intake__lane-sub">
              Turn on the priority lane for senior citizens, persons with disability and pregnant
              patients.
            </div>
          </template>
        </div>
      </div>

      <template v-if="draft.is_priority">
        <v-select
          v-model="draft.priority_reason"
          :items="PRIORITY_REASONS"
          label="Reason"
          :rules="intakeRules.priorityReason(props.draft)"
          :disabled="disabled"
          class="intake__reason"
        />
        <p v-if="basis" class="intake__basis">
          <template v-if="primaryLaw">
            Legal basis:
            <a :href="primaryLaw.url" target="_blank" rel="noopener noreferrer" class="link-inline">{{
              primaryLaw.number
            }}</a>
            <!-- Joining text goes through {{ }} so Vue's whitespace trimming can't eat the spaces. -->
            {{ `(${primaryLaw.title})` }}{{ amendments.length ? ', as amended by ' : '' }}<template
              v-for="(law, index) in amendments"
              :key="law.number"
            >{{ index > 0 ? ' and ' : '' }}<a
                :href="law.url"
                target="_blank"
                rel="noopener noreferrer"
                class="link-inline"
              >{{ law.number }}</a></template>{{ '.' }}
          </template>
          <template v-else>{{ basis.policyNote }}</template>
        </p>
      </template>
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
  display: grid;
  gap: 12px;
}

.intake__switch {
  display: flex;
  align-items: center;
  gap: 4px;
}

.intake__lane {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.8125rem;
  background-color: rgb(var(--v-theme-surface-alt));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.intake__lane--priority {
  background-color: rgb(var(--v-theme-status-pending-bg));
  border-color: transparent;
}

.intake__lane-icon {
  margin-top: 1px;
  flex: 0 0 auto;
  color: rgb(var(--v-theme-text-secondary));
}

.intake__lane--priority .intake__lane-icon {
  color: rgb(var(--v-theme-warning));
}

.intake__lane-sub {
  margin-top: 2px;
  color: rgb(var(--v-theme-text-secondary));
}

.intake__reason {
  max-width: 360px;
}

.intake__basis {
  margin-top: -4px;
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
