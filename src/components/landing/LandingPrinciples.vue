<script setup lang="ts">
/** What makes the record trustworthy — each one is enforced in the database, not only the UI. */
const principles = [
  {
    icon: 'mdi-lock-outline',
    title: 'Access by role, enforced at the source',
    text: 'Row-level security in the database checks every read and write against the user’s role. Hiding a button is a courtesy; the database is the gate.',
  },
  {
    icon: 'mdi-file-lock-outline',
    title: 'Nothing is quietly rewritten',
    text: 'Finalized notes and released results are locked. Corrections are added as signed addenda or amendments that keep the original and the reason.',
  },
  {
    icon: 'mdi-account-group-outline',
    title: 'Fair, visible waiting',
    text: 'Strict first-in, first-out order with the priority lane Philippine law requires, and a queue board anyone on the floor can read.',
  },
  {
    icon: 'mdi-broadcast',
    title: 'Every department, the same moment',
    text: 'The desk, the doctors and the lab watch one shared record that updates live — no calls down the hall to ask where a patient is.',
  },
]
</script>

<template>
  <section id="principles" class="section">
    <div class="landing-container principles">
      <header class="principles__head">
        <h2 class="principles__title">Built for how a public hospital works</h2>
        <p class="principles__lead">
          Records a clinician can rely on, and a line a patient can trust.
        </p>
      </header>

      <div class="principles__grid">
        <article v-for="item in principles" :key="item.title" class="principle">
          <v-icon :icon="item.icon" size="22" class="principle__icon" />
          <h3 class="principle__title">{{ item.title }}</h3>
          <p class="principle__text">{{ item.text }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section {
  padding: 80px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.principles {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.6fr);
  gap: 48px;
  align-items: start;
}

.principles__title {
  font-size: clamp(1.6rem, 3vw, 2rem);
  letter-spacing: -0.03em !important;
}

.principles__lead {
  margin-top: 10px;
  color: rgb(var(--v-theme-text-secondary));
}

.principles__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 32px 28px;
}

.principle__icon {
  color: rgb(var(--v-theme-primary));
}

.principle__title {
  margin-top: 10px;
  font-size: 1rem;
}

.principle__text {
  margin-top: 6px;
  font-size: 0.875rem;
  color: rgb(var(--v-theme-text-secondary));
}

@media (max-width: 960px) {
  .principles {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}

@media (max-width: 600px) {
  .section {
    padding: 56px 0;
  }

  .principles__grid {
    grid-template-columns: 1fr;
  }
}
</style>
