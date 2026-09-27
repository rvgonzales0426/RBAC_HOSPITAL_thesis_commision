<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import FormError from '@/components/common/FormError.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useToast } from '@/composables/useToast'
import { useConsultationStore } from '@/stores/consultation'
import { useLabStore } from '@/stores/lab'
import type { LabPriority, LabTestType } from '@/types'

/**
 * Requests tests from inside the consultation. Placing the order sends the
 * patient to the lab; they come back to this physician's queue by themselves
 * when every result is released.
 */
const props = defineProps<{
  visitId: string
  physicianId: string
  /** Saves the note first, so the lab request never loses what was typed. */
  beforeSubmit: () => Promise<boolean>
}>()
const open = defineModel<boolean>({ required: true })

const lab = useLabStore()
const consultation = useConsultationStore()
const toast = useToast()

const selected = ref<string[]>([])
const priority = ref<LabPriority>('routine')
const notes = ref('')

watch(open, (value) => {
  if (!value) return
  selected.value = []
  priority.value = 'routine'
  notes.value = ''
})

const groups = computed(() => {
  const byCategory = new Map<string, LabTestType[]>()
  for (const test of lab.catalog) {
    const list = byCategory.get(test.category) ?? []
    list.push(test)
    byCategory.set(test.category, list)
  }
  return [...byCategory.entries()].map(([category, tests]) => ({ category, tests }))
})

const { loading, error, run } = useAsyncAction(
  async () => {
    if (!selected.value.length) throw new Error('Choose at least one test.')
    if (!(await props.beforeSubmit())) throw new Error('Save the note before ordering tests.')
    const order = await consultation.orderLabs(
      props.visitId,
      props.physicianId,
      selected.value,
      priority.value,
      notes.value.trim() || null,
    )
    toast.success(`${order.order_no} sent to the laboratory.`)
    return true
  },
  { toastOnError: false },
)

async function onSubmit() {
  if (await run()) open.value = false
}
</script>

<template>
  <v-dialog v-model="open" max-width="640" scrollable>
    <v-card class="rounded-overlay">
      <v-card-title>Order laboratory tests</v-card-title>
      <v-card-subtitle>
        The patient goes to the lab and returns to your queue when results are released.
      </v-card-subtitle>
      <v-card-text>
        <div v-for="group in groups" :key="group.category" class="tests">
          <div class="tests__category">{{ group.category }}</div>
          <div class="tests__grid">
            <v-checkbox
              v-for="test in group.tests"
              :key="test.id"
              v-model="selected"
              :value="test.id"
              :label="test.name"
              :disabled="loading"
              density="compact"
            />
          </div>
        </div>
        <p v-if="!groups.length" class="text-body-2 text-medium-emphasis">
          The lab catalog is empty. An administrator can add tests.
        </p>

        <v-radio-group v-model="priority" inline label="Priority" class="mt-2" :disabled="loading">
          <v-radio value="routine" label="Routine" />
          <v-radio value="stat" label="STAT — process first" />
        </v-radio-group>

        <v-textarea
          v-model="notes"
          label="Clinical notes for the lab (optional)"
          placeholder="e.g. Rule out anemia; patient on iron supplements"
          rows="2"
          class="mt-2"
          :disabled="loading"
        />
        <FormError :message="error" class="mt-4" />
      </v-card-text>
      <v-card-actions>
        <span class="text-caption text-medium-emphasis ml-1">{{ selected.length }} selected</span>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="open = false">Cancel</v-btn>
        <v-btn color="primary" :loading="loading" :disabled="!selected.length" @click="onSubmit">
          Send to laboratory
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.tests + .tests {
  margin-top: 12px;
}

.tests__category {
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgb(var(--v-theme-text-secondary));
  margin-bottom: 4px;
}

.tests__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 600px) {
  .tests__grid {
    grid-template-columns: 1fr;
  }
}
</style>
