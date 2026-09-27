<script setup lang="ts">
import LandingNav from '@/components/landing/LandingNav.vue'
import LandingHero from '@/components/landing/LandingHero.vue'
import LandingWorkflow from '@/components/landing/LandingWorkflow.vue'
import LandingRoles from '@/components/landing/LandingRoles.vue'
import LandingPrinciples from '@/components/landing/LandingPrinciples.vue'
import LandingFooter from '@/components/landing/LandingFooter.vue'
</script>

<template>
  <!-- Outside both app layouts: the public face of the system. -->
  <v-main class="landing">
    <LandingNav />
    <LandingHero />
    <LandingWorkflow />
    <LandingRoles />
    <LandingPrinciples />
    <LandingFooter />
  </v-main>
</template>

<style scoped>
.landing {
  background-color: rgb(var(--v-theme-background));
  min-height: 100vh;
}

/* One content measure for the whole page. */
.landing :deep(.landing-container) {
  max-width: 1120px;
  margin-inline: auto;
  padding-inline: 24px;
}

@media (max-width: 600px) {
  .landing :deep(.landing-container) {
    padding-inline: 16px;
  }
}
</style>
