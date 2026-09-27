import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * A "now" that ticks, so wait times and "5 min ago" labels stay honest on a
 * screen that is left open all shift. Thirty seconds is finer than any label
 * it drives.
 */
export function useClock(intervalMs = 30_000) {
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    timer = setInterval(() => (now.value = Date.now()), intervalMs)
  })
  onBeforeUnmount(() => timer && clearInterval(timer))

  return { now }
}
