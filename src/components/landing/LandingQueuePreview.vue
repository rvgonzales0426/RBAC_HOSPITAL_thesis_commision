<script setup lang="ts">
import StatusPill from '@/components/common/StatusPill.vue'
import type { Tone } from '@/config/opd'

/**
 * An illustration of the queue board, drawn with the app's own status pills
 * so it looks like the product. The rows are example data, not live data.
 */
const rows: { ticket: string; name: string; note: string; tone: Tone; status: string; priority?: boolean }[] = [
  { ticket: '#014', name: 'Santos, Maria L.', note: 'Dizziness · Senior citizen', tone: 'pending', status: 'Waiting', priority: true },
  { ticket: '#011', name: 'Dela Cruz, Juan P.', note: 'Cough for 3 days', tone: 'active', status: 'In consultation' },
  { ticket: '#009', name: 'Reyes, Ana M.', note: 'CBC, fasting blood sugar', tone: 'lab', status: 'At laboratory' },
  { ticket: '#006', name: 'Bautista, Leo R.', note: 'Results released', tone: 'urgent', status: 'Results ready' },
]
</script>

<template>
  <figure class="preview" aria-label="Illustration of the OPD queue board with example patients">
    <div class="preview__bar">
      <span class="preview__dot" /><span class="preview__dot" /><span class="preview__dot" />
      <span class="preview__title">OPD queue</span>
      <span class="preview__live"><span class="preview__pulse" />Live</span>
    </div>

    <div class="preview__stats">
      <div><span>Waiting</span><strong>12</strong></div>
      <div><span>With a doctor</span><strong>4</strong></div>
      <div><span>At the lab</span><strong>3</strong></div>
    </div>

    <ul class="preview__rows">
      <li v-for="row in rows" :key="row.ticket" class="preview__row">
        <span class="preview__ticket tabular-nums">{{ row.ticket }}</span>
        <div class="preview__who">
          <div class="preview__name">
            {{ row.name }}
            <StatusPill v-if="row.priority" tone="urgent" label="Priority" />
          </div>
          <div class="preview__note">{{ row.note }}</div>
        </div>
        <StatusPill :tone="row.tone" :label="row.status" />
      </li>
    </ul>
    <figcaption class="preview__caption">Example data</figcaption>
  </figure>
</template>

<style scoped>
.preview {
  margin: 0;
  border-radius: 14px;
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.06),
    0 24px 48px -24px rgba(15, 23, 42, 0.35);
  overflow: hidden;
}

.preview__bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background-color: rgb(var(--v-theme-surface-alt));
}

.preview__dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background-color: rgb(var(--v-theme-surface-variant));
}

.preview__title {
  margin-left: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
}

.preview__live {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: rgb(var(--v-theme-success));
}

.preview__pulse {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background-color: rgb(var(--v-theme-success));
  animation: pulse 1.8s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .preview__pulse {
    animation: none;
  }
}

.preview__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.preview__stats div {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
}

.preview__stats div + div {
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.preview__stats span {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-text-secondary));
}

.preview__stats strong {
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.preview__rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

.preview__row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.preview__ticket {
  font-weight: 600;
  font-size: 0.8125rem;
}

.preview__name {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 0.8125rem;
  font-weight: 500;
}

.preview__note {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-text-secondary));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview__caption {
  padding: 8px 14px;
  font-size: 0.6875rem;
  color: rgb(var(--v-theme-text-secondary));
  text-align: right;
}
</style>
