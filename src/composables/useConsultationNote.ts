import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useConsultationStore } from '@/stores/consultation'
import { useToast } from './useToast'
import type { Consultation, ConsultationNote } from '@/types'

type NoteDraft = Record<keyof ConsultationNote, string>

const FIELDS: (keyof ConsultationNote)[] = [
  'symptoms',
  'physical_exam',
  'diagnosis',
  'icd10_code',
  'treatment_plan',
  'notes',
  'follow_up_date',
]

const AUTOSAVE_MS = 1500

function draftFrom(consultation: Consultation | null): NoteDraft {
  return Object.fromEntries(
    FIELDS.map((field) => [field, consultation?.[field] ?? '']),
  ) as NoteDraft
}

function toNote(draft: NoteDraft): ConsultationNote {
  return Object.fromEntries(
    FIELDS.map((field) => [field, draft[field].trim() || null]),
  ) as unknown as ConsultationNote
}

/**
 * The physician's note, saved as they type. The draft resets only when a
 * different consultation opens — a live refresh of the same one must never
 * wipe what the doctor is in the middle of writing.
 */
export function useConsultationNote(source: () => Consultation | null) {
  const store = useConsultationStore()
  const toast = useToast()

  const draft = reactive<NoteDraft>(draftFrom(source()))
  const saving = ref(false)
  const savedAt = ref<Date | null>(null)
  const error = ref<string | null>(null)
  /** What the server holds, as last saved or loaded — the baseline for "dirty". */
  const baseline = ref<NoteDraft>(draftFrom(source()))
  let timer: ReturnType<typeof setTimeout> | null = null

  watch(
    () => source()?.id,
    () => {
      Object.assign(draft, draftFrom(source()))
      baseline.value = draftFrom(source())
      savedAt.value = null
      error.value = null
    },
  )

  const dirty = computed(() => FIELDS.some((field) => draft[field] !== baseline.value[field]))
  const locked = computed(() => Boolean(source()?.finalized_at))

  async function save() {
    const consultation = source()
    if (!consultation || locked.value || !dirty.value) return true
    if (timer) clearTimeout(timer)

    const snapshot = { ...draft }
    saving.value = true
    error.value = null
    try {
      await store.saveNote(consultation.id, toNote(snapshot))
      baseline.value = snapshot
      savedAt.value = new Date()
      return true
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Could not save the note.'
      toast.error(error.value)
      return false
    } finally {
      saving.value = false
    }
  }

  watch(
    () => ({ ...draft }),
    () => {
      if (timer) clearTimeout(timer)
      if (dirty.value && !locked.value) timer = setTimeout(save, AUTOSAVE_MS)
    },
  )

  // Leaving the page mid-sentence still saves the sentence.
  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
    if (dirty.value) void save()
  })

  return { draft, dirty, locked, saving, savedAt, error, save }
}
