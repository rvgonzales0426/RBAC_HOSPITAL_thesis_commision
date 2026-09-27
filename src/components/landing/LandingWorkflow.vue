<script setup lang="ts">
/** The outpatient cycle as six steps — the order the system itself enforces. */
const steps = [
  {
    icon: 'mdi-account-plus-outline',
    title: 'Register',
    text: 'The desk finds the existing record or creates one, with a duplicate check, and takes vital signs.',
  },
  {
    icon: 'mdi-clipboard-text-clock-outline',
    title: 'Queue',
    text: 'The patient joins a first-in, first-out line at once. Seniors, PWDs and pregnant patients go ahead.',
  },
  {
    icon: 'mdi-stethoscope',
    title: 'Consult',
    text: 'The next available doctor calls them in and documents symptoms, findings, diagnosis and plan.',
  },
  {
    icon: 'mdi-flask-outline',
    title: 'Laboratory',
    text: 'Tests are ordered from the consultation and appear on the lab’s worklist the same moment.',
  },
  {
    icon: 'mdi-file-check-outline',
    title: 'Review',
    text: 'Released results route back to the requesting doctor, who sees the patient again ahead of new arrivals.',
  },
  {
    icon: 'mdi-check-decagram-outline',
    title: 'Complete',
    text: 'The note, prescriptions and results are finalized into the patient’s permanent record.',
  },
]
</script>

<template>
  <section id="workflow" class="section">
    <div class="landing-container">
      <header class="section__head">
        <h2 class="section__title">One visit, start to finish</h2>
        <p class="section__lead">
          Every step hands the patient to the next automatically. Nobody carries paper between
          rooms, and nobody is forgotten in a pile of slips.
        </p>
      </header>

      <ol class="steps">
        <li v-for="(step, index) in steps" :key="step.title" class="step">
          <div class="step__icon"><v-icon :icon="step.icon" size="20" /></div>
          <div class="step__number tabular-nums">{{ String(index + 1).padStart(2, '0') }}</div>
          <h3 class="step__title">{{ step.title }}</h3>
          <p class="step__text">{{ step.text }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.section {
  padding: 80px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.section__head {
  max-width: 620px;
  margin-bottom: 40px;
}

.section__title {
  font-size: clamp(1.6rem, 3vw, 2rem);
  letter-spacing: -0.03em !important;
}

.section__lead {
  margin-top: 10px;
  font-size: 1rem;
  color: rgb(var(--v-theme-text-secondary));
}

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.step {
  position: relative;
  padding: 22px;
  border-radius: 12px;
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.step__icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.1);
}

.step__number {
  position: absolute;
  top: 22px;
  right: 22px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgb(var(--v-theme-text-secondary));
}

.step__title {
  margin-top: 16px;
  font-size: 1rem;
}

.step__text {
  margin-top: 6px;
  font-size: 0.875rem;
  color: rgb(var(--v-theme-text-secondary));
}

@media (max-width: 960px) {
  .steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .section {
    padding: 56px 0;
  }

  .steps {
    grid-template-columns: 1fr;
  }
}
</style>
