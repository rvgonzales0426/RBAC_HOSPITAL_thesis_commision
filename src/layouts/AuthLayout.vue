<script setup lang="ts">
import { APP_NAME as appName } from '@/config/app'
</script>

<template>
  <v-main class="auth">
    <div class="auth__column">
      <router-link :to="{ name: 'landing' }" class="auth__brand" :aria-label="`${appName} home`">
        <div class="auth__mark">{{ appName.charAt(0) }}</div>
        <span class="auth__name">{{ appName }}</span>
      </router-link>

      <div class="surface-panel auth__panel">
        <router-view />
      </div>
    </div>
  </v-main>
</template>

<style scoped>
.auth {
  min-height: 100vh;
  background-color: rgb(var(--v-theme-background));
  display: grid;
  place-items: center;
  padding: 32px 16px;
}

.auth__column {
  width: 100%;
  max-width: 408px;
}

.auth__brand {
  color: inherit;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 22px;
}

.auth__mark {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  background-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-weight: 600;
  font-size: 0.875rem;
}

.auth__name {
  font-weight: 600;
  font-size: 1rem;
  letter-spacing: -0.015em;
}

.auth__panel {
  padding: 28px;
}

@media (max-width: 600px) {
  .auth__panel {
    padding: 22px 18px;
  }
}
</style>
