<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import StatusPill from '@/components/common/StatusPill.vue'
import DashboardStats from '@/components/dashboard/DashboardStats.vue'
import DashboardActivity from '@/components/dashboard/DashboardActivity.vue'
import { useDashboard } from '@/composables/useDashboard'
import { useAuthStore } from '@/stores/auth'

const { allowed, loading, stats, activity, alerts } = useDashboard()
const auth = useAuthStore()
</script>

<template>
  <PageHeader
    :title="`Good to see you, ${auth.displayName.split(' ')[0]}`"
    :description="
      allowed
        ? 'Live outpatient metrics, patient flow and alerts for the current clinic day.'
        : undefined
    "
  />

  <!-- Anyone with a workspace is sent to it by the router; reaching this
       means the account has no role with any OPD access yet. -->
  <section v-if="!allowed" class="surface-panel">
    <EmptyState
      icon="mdi-account-clock-outline"
      title="Your account is waiting for a role"
      description="An administrator needs to assign you a role — OPD Staff, Physician, or Laboratory Technician — before you can use the system. Sign out and back in once they have."
    />
  </section>

  <template v-else>
    <DashboardStats :stats="stats" :loading="loading" class="mb-6" />

    <div class="dashboard-grid">
      <SectionCard title="Live activity" description="Every patient movement, newest first." flush>
        <DashboardActivity :entries="activity" :loading="loading" />
      </SectionCard>

      <SectionCard title="Alerts" description="Computed from the live numbers — they clear themselves.">
        <div v-if="loading" class="alerts">
          <div v-for="n in 3" :key="n" class="alerts__skeleton" />
        </div>
        <ul v-else class="alerts">
          <li v-for="alert in alerts" :key="alert.id" class="alerts__item">
            <StatusPill :tone="alert.tone" :label="alert.label" />
            <div>
              <p class="alerts__title">{{ alert.title }}</p>
              <p class="alerts__detail">{{ alert.detail }}</p>
            </div>
          </li>
        </ul>
      </SectionCard>
    </div>
  </template>
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
</style>
