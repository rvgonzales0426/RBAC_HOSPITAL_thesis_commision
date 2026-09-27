<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import UserMenu from './UserMenu.vue'
import { useAuthStore } from '@/stores/auth'

defineProps<{ rail: boolean }>()
defineEmits<{ 'toggle-sidebar': [] }>()

const auth = useAuthStore()
const patientQuery = ref('')
const now = ref(new Date())
let timer: number | null = null

const dateTimeLabel = computed(() =>
  now.value.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }),
)

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = new Date()
  }, 30000)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <v-app-bar :height="56" flat color="surface" class="appbar">
    <v-btn
      variant="text"
      size="small"
      class="ml-2"
      :aria-label="rail ? 'Expand sidebar' : 'Collapse sidebar'"
      @click="$emit('toggle-sidebar')"
    >
      <v-icon icon="mdi-dock-left" size="20" />
    </v-btn>

    <span class="appbar__title">OPD &amp; EMR</span>

    <v-spacer />

    <div class="appbar__meta">
      <span class="appbar__datetime">{{ dateTimeLabel }}</span>
      <v-chip color="info" size="small" variant="tonal" class="appbar__role">
        {{ auth.currentRoleLabel }}
      </v-chip>
      <v-text-field
        v-model="patientQuery"
        density="compact"
        hide-details
        placeholder="Quick patient search"
        prepend-inner-icon="mdi-magnify"
        class="appbar__search"
      />
      <UserMenu />
    </div>
  </v-app-bar>
</template>

<style scoped>
/* Hairline, no shadow: the bar is part of the page frame, not a floating layer. */
.appbar {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}

.appbar__title {
  margin-left: 10px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.appbar__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 12px;
}

.appbar__datetime {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-text-secondary));
  white-space: nowrap;
}

.appbar__search {
  min-width: 240px;
  max-width: 280px;
}

@media (max-width: 1100px) {
  .appbar__datetime,
  .appbar__role {
    display: none;
  }
}

@media (max-width: 760px) {
  .appbar__search {
    display: none;
  }
}
</style>
