import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, toMessage } from '@/lib/supabase'
import type { Patient, PatientInput } from '@/types'

/** LIKE treats % and _ as wildcards; a search for "100%" means the text. */
const escapeLike = (text: string) => text.replace(/[\\%_]/g, (char) => `\\${char}`)

/**
 * Patient profiles: lookup, registration and demographic edits. Reads need
 * patients.read and writes patients.write — enforced by RLS in 0005.
 */
export const usePatientsStore = defineStore('patients', () => {
  const results = ref<Patient[]>([])
  const searching = ref(false)
  const saving = ref(false)

  /**
   * Every word must appear somewhere in the name, record number, phone or
   * PhilHealth number, in any order — "juan dela cruz" and "cruz juan" both
   * find Juan Dela Cruz. An empty term lists the most recent registrations.
   */
  async function search(term: string, limit = 25) {
    searching.value = true
    try {
      let query = supabase.from('patients').select('*')
      const words = term.trim().toLowerCase().split(/\s+/).filter(Boolean)

      for (const word of words) {
        query = query.ilike('search_text', `%${escapeLike(word)}%`)
      }

      const { data, error } = await (words.length
        ? query.order('last_name').order('first_name')
        : query.order('created_at', { ascending: false })
      ).limit(limit)

      if (error) throw new Error(toMessage(error))
      results.value = (data ?? []) as Patient[]
      return results.value
    } finally {
      searching.value = false
    }
  }

  async function fetchById(id: string) {
    const { data, error } = await supabase.from('patients').select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(toMessage(error))
    return (data as Patient | null) ?? null
  }

  /** Same name and birthday — the check the desk runs before registering. */
  async function findPossibleDuplicates(lastName: string, firstName: string, birthDate: string) {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .ilike('last_name', escapeLike(lastName.trim()))
      .ilike('first_name', escapeLike(firstName.trim()))
      .eq('birth_date', birthDate)
      .limit(5)

    if (error) throw new Error(toMessage(error))
    return (data ?? []) as Patient[]
  }

  async function create(input: PatientInput) {
    saving.value = true
    try {
      const { data, error } = await supabase.from('patients').insert(input).select('*').single()
      if (error) throw new Error(toMessage(error))
      return data as Patient
    } finally {
      saving.value = false
    }
  }

  async function update(id: string, changes: Partial<PatientInput>) {
    saving.value = true
    try {
      const { data, error } = await supabase
        .from('patients')
        .update(changes)
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw new Error(toMessage(error))
      const updated = data as Patient
      const index = results.value.findIndex((patient) => patient.id === id)
      if (index !== -1) results.value[index] = updated
      return updated
    } finally {
      saving.value = false
    }
  }

  return { results, searching, saving, search, fetchById, findPossibleDuplicates, create, update }
})
