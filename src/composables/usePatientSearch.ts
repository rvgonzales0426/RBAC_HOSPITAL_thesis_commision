import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePatientsStore } from '@/stores/patients'
import { useToast } from './useToast'

/**
 * The patient lookup box. Searches as the user types, a beat after they stop,
 * so a fast typist triggers one request rather than one per keystroke.
 */
export function usePatientSearch(delay = 300) {
  const store = usePatientsStore()
  const toast = useToast()
  const { results, searching } = storeToRefs(store)

  const term = ref('')
  const searchedFor = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | null = null

  async function run() {
    const value = term.value ?? ''
    try {
      await store.search(value)
      searchedFor.value = value.trim()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not search patients.')
    }
  }

  watch(term, () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(run, delay)
  })

  onMounted(run)
  onBeforeUnmount(() => timer && clearTimeout(timer))

  return { term, results, searching, searchedFor, refresh: run }
}
