<script setup lang="ts">
/** The four portals. Each role signs in to its own workspace and sees only what it needs. */
const roles = [
  {
    icon: 'mdi-card-account-details-outline',
    name: 'OPD Staff',
    lands: 'Opens to the live queue',
    points: [
      'Register walk-ins and find returning patients',
      'Record chief complaint and vital signs at intake',
      'Manage the line: no-shows, cancellations, handovers',
    ],
  },
  {
    icon: 'mdi-stethoscope',
    name: 'Physician',
    lands: 'Opens to the consultation workspace',
    points: [
      'Set availability and call the next patient',
      'Document the visit, prescribe and order labs',
      'Review returned results and finalize the visit',
    ],
  },
  {
    icon: 'mdi-flask-outline',
    name: 'Laboratory Technician',
    lands: 'Opens to the lab worklist',
    points: [
      'See orders the moment they are placed, STAT first',
      'Encode results with out-of-range values flagged',
      'Release to the doctor; amend with a recorded reason',
    ],
  },
  {
    icon: 'mdi-shield-account-outline',
    name: 'Administrator',
    lands: 'Opens to operations monitoring',
    points: [
      'Watch patients, queue, lab load and doctors on duty',
      'Follow every patient movement in a live feed',
      'Manage accounts, roles and permissions',
    ],
  },
]
</script>

<template>
  <section id="roles" class="section">
    <div class="landing-container">
      <header class="section__head">
        <h2 class="section__title">A workspace for every role</h2>
        <p class="section__lead">
          Four roles, four portals. Each person signs in to the screen their day starts from — and
          the database, not just the menu, decides what they can see.
        </p>
      </header>

      <div class="roles">
        <article v-for="role in roles" :key="role.name" class="role">
          <div class="role__head">
            <div class="role__icon"><v-icon :icon="role.icon" size="20" /></div>
            <div>
              <h3 class="role__name">{{ role.name }}</h3>
              <p class="role__lands">{{ role.lands }}</p>
            </div>
          </div>
          <ul class="role__points">
            <li v-for="point in role.points" :key="point">
              <v-icon icon="mdi-check" size="16" class="role__check" />
              {{ point }}
            </li>
          </ul>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section {
  padding: 80px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background-color: rgb(var(--v-theme-surface-alt));
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

.roles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.role {
  padding: 24px;
  border-radius: 12px;
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.role__head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.role__icon {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: rgb(var(--v-theme-secondary));
  background-color: rgba(var(--v-theme-secondary), 0.1);
}

.role__name {
  font-size: 1.0625rem;
}

.role__lands {
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}

.role__points {
  list-style: none;
  margin: 18px 0 0;
  padding: 0;
  display: grid;
  gap: 8px;
  font-size: 0.875rem;
}

.role__points li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.role__check {
  margin-top: 3px;
  color: rgb(var(--v-theme-primary));
}

@media (max-width: 760px) {
  .section {
    padding: 56px 0;
  }

  .roles {
    grid-template-columns: 1fr;
  }
}
</style>
