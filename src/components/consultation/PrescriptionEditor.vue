<script setup lang="ts">
import { ref } from 'vue'
import FormError from '@/components/common/FormError.vue'
import { rxRules, usePrescriptionEditor } from '@/composables/usePrescriptionEditor'
import type { Prescription } from '@/types'

/** Structured prescription lines for the open consultation. */
const props = defineProps<{
  consultationId: string
  prescriptions: Prescription[]
  locked?: boolean
}>()

const { draft, editing, formOpen, startAdd, startEdit, cancel, save, remove } =
  usePrescriptionEditor(() => props.consultationId)

const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)

async function onSubmit() {
  const result = await formRef.value?.validate()
  if (result?.valid) await save.run()
}

const sig = (row: Prescription) =>
  [row.dose, row.frequency, row.duration && `for ${row.duration}`].filter(Boolean).join(', ')
</script>

<template>
  <div class="rx-editor">
    <p v-if="!prescriptions.length && !formOpen" class="rx-editor__empty">
      No medicines prescribed.
    </p>

    <ul v-if="prescriptions.length" class="rx-editor__list">
      <li v-for="row in prescriptions" :key="row.id" class="rx-editor__row">
        <div class="rx-editor__text">
          <div class="rx-editor__drug">
            {{ row.medicine }}
            <span v-if="row.quantity" class="rx-editor__qty tabular-nums">#{{ row.quantity }}</span>
          </div>
          <div v-if="sig(row)" class="rx-editor__sig">Sig: {{ sig(row) }}</div>
          <div v-if="row.instructions" class="rx-editor__sig">{{ row.instructions }}</div>
        </div>
        <div v-if="!locked" class="rx-editor__actions">
          <v-btn
            size="small"
            variant="text"
            icon="mdi-pencil-outline"
            :aria-label="`Edit ${row.medicine}`"
            @click="startEdit(row)"
          />
          <v-btn
            size="small"
            variant="text"
            icon="mdi-delete-outline"
            :aria-label="`Remove ${row.medicine}`"
            :loading="remove.loading.value"
            @click="remove.run(row)"
          />
        </div>
      </li>
    </ul>

    <v-form v-if="formOpen" ref="formRef" class="rx-editor__form" @submit.prevent="onSubmit">
      <div class="rx-editor__grid">
        <v-text-field
          v-model="draft.medicine"
          label="Medicine and strength"
          placeholder="e.g. Amoxicillin 500 mg capsule"
          :rules="rxRules.medicine"
          density="compact"
          autofocus
          class="rx-editor__wide"
        />
        <v-text-field v-model="draft.dose" label="Dose" placeholder="1 capsule" density="compact" />
        <v-text-field
          v-model="draft.frequency"
          label="Frequency"
          placeholder="every 8 hours"
          density="compact"
        />
        <v-text-field v-model="draft.duration" label="Duration" placeholder="7 days" density="compact" />
        <v-text-field
          v-model="draft.quantity"
          label="Quantity"
          inputmode="numeric"
          :rules="rxRules.quantity"
          density="compact"
        />
        <v-text-field
          v-model="draft.instructions"
          label="Instructions"
          placeholder="Take after meals"
          density="compact"
          class="rx-editor__wide"
        />
      </div>
      <FormError :message="save.error.value" class="mt-3" />
      <div class="rx-editor__form-actions">
        <v-btn variant="text" size="small" :disabled="save.loading.value" @click="cancel">Cancel</v-btn>
        <v-btn type="submit" color="primary" size="small" :loading="save.loading.value">
          {{ editing ? 'Save medicine' : 'Add medicine' }}
        </v-btn>
      </div>
    </v-form>

    <v-btn
      v-else-if="!locked"
      variant="outlined"
      size="small"
      prepend-icon="mdi-plus"
      class="mt-2"
      @click="startAdd"
    >
      Add medicine
    </v-btn>
  </div>
</template>

<style scoped>
.rx-editor__empty {
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}

.rx-editor__list {
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
}

.rx-editor__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.rx-editor__row:last-child {
  border-bottom: none;
}

.rx-editor__drug {
  font-weight: 600;
  font-size: 0.875rem;
}

.rx-editor__qty {
  margin-left: 6px;
  font-weight: 500;
  color: rgb(var(--v-theme-text-secondary));
}

.rx-editor__sig {
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}

.rx-editor__actions {
  display: flex;
  flex: 0 0 auto;
}

.rx-editor__form {
  margin-top: 8px;
  padding: 14px;
  border-radius: 10px;
  background-color: rgb(var(--v-theme-surface-alt));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.rx-editor__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.rx-editor__wide {
  grid-column: 1 / -1;
}

.rx-editor__form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

@media (max-width: 760px) {
  .rx-editor__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
