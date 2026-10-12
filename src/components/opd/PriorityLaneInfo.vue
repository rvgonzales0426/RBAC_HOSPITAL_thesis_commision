<script setup lang="ts">
import { PRIORITY_LANE_BASIS } from '@/config/opd'

/**
 * The (i) beside the priority-lane switch: what each lane means and the law
 * behind it. A click-to-open menu, not a tooltip, so it works on a phone.
 */
</script>

<template>
  <v-menu location="bottom start" :close-on-content-click="false" max-width="420">
    <template #activator="{ props: menuProps }">
      <v-btn
        v-bind="menuProps"
        icon="mdi-information-outline"
        variant="text"
        size="small"
        aria-label="Priority lane or regular queue: what is the difference?"
      />
    </template>

    <v-card class="rounded-overlay">
      <v-card-title>Priority lane or regular queue?</v-card-title>
      <v-card-text class="lane-info">
        <p>
          <strong>Regular queue</strong> — patients are called in order of arrival: first in,
          first out.
        </p>
        <p>
          <strong>Priority lane</strong> — called ahead of the regular queue, and in order of
          arrival among themselves.
        </p>

        <div class="lane-info__label">Who qualifies</div>
        <ul class="lane-info__list">
          <li v-for="basis in PRIORITY_LANE_BASIS" :key="basis.reason">
            <div class="lane-info__who">{{ basis.who }}</div>
            <div v-for="law in basis.laws" :key="law.number" class="lane-info__law">
              <a :href="law.url" target="_blank" rel="noopener noreferrer" class="link-inline">
                {{ law.number }}
              </a>
              {{ law.title }}
            </div>
            <div v-if="basis.policyNote" class="lane-info__law">{{ basis.policyNote }}</div>
          </li>
        </ul>
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<style scoped>
.lane-info {
  display: grid;
  gap: 8px;
  font-size: 0.8125rem;
}

.lane-info__label {
  margin-top: 6px;
  font-weight: 600;
  color: rgb(var(--v-theme-text-secondary));
}

.lane-info__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.lane-info__who {
  font-weight: 600;
}

.lane-info__law {
  color: rgb(var(--v-theme-text-secondary));
}
</style>
