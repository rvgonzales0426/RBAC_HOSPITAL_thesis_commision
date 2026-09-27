<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import DashboardStats from '@/components/dashboard/DashboardStats.vue'
import DashboardActivity from '@/components/dashboard/DashboardActivity.vue'
import { useDashboard } from '@/composables/useDashboard'
import { useAuthStore } from '@/stores/auth'

const { loading, stats, activity, alerts } = useDashboard()
const auth = useAuthStore()
</script>

<template>
  <PageHeader
    :title="`Good to see you, ${auth.displayName.split(' ')[0]}`"
    description="Live outpatient metrics, queue flow, and operational alerts for the current shift."
  />

  <DashboardStats :stats="stats" :loading="loading" class="mb-6" />

  <div class="dashboard-grid">
    <SectionCard title="Patient queue activity" description="Recent OPD movements and consultation flow." flush>
      <DashboardActivity :entries="activity" :loading="loading" />
    </SectionCard>

    <SectionCard title="Notifications & alerts" description="Monitor urgent and processing updates in real time.">
      <div v-if="loading" class="alerts">
        <div v-for="n in 3" :key="n" class="alerts__skeleton" />
      </div>
      <ul v-else class="alerts">
        <li v-for="alert in alerts" :key="alert.id" class="alerts__item">
          <span class="status-pill" :class="`status-pill--${alert.tone}`">{{ alert.tone }}</span>
          <div>
            <p class="alerts__title">{{ alert.title }}</p>
            <p class="alerts__detail">{{ alert.detail }}</p>
          </div>
        </li>
      </ul>
    </SectionCard>
  </div>
</template>

<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

@media (max-width: 1100px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

.alerts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.alerts__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.alerts__item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.alerts__title {
  font-size: 0.875rem;
  font-weight: 600;
}

.alerts__detail {
  margin-top: 2px;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}

.alerts__skeleton {
  height: 48px;
  border-radius: 8px;
  background-color: rgb(var(--v-theme-surface-alt));
}

.status-pill {
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: capitalize;
}

.status-pill--active {
  background-color: rgb(var(--v-theme-status-active-bg));
  color: rgb(var(--v-theme-success));
}

.status-pill--pending {
  background-color: rgb(var(--v-theme-status-pending-bg));
  color: rgb(var(--v-theme-warning));
}

.status-pill--urgent {
  background-color: rgb(var(--v-theme-status-urgent-bg));
  color: rgb(var(--v-theme-error));
}

.status-pill--lab {
  background-color: rgb(var(--v-theme-status-lab-bg));
  color: rgb(var(--v-theme-info));
}
</style>
