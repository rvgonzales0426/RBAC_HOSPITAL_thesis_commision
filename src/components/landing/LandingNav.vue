<script setup lang="ts">
import ThemeToggle from '@/components/app/ThemeToggle.vue'
import { useAuthStore } from '@/stores/auth'
import { APP_NAME } from '@/config/app'

const auth = useAuthStore()

const sections = [
  { href: '#workflow', label: 'How it works' },
  { href: '#roles', label: 'Roles' },
  { href: '#principles', label: 'Safeguards' },
]
</script>

<template>
  <header class="nav">
    <div class="landing-container nav__inner">
      <router-link :to="{ name: 'landing' }" class="nav__brand" :aria-label="`${APP_NAME} home`">
        <span class="nav__mark">{{ APP_NAME.charAt(0) }}</span>
        <span class="nav__name">{{ APP_NAME }}</span>
      </router-link>

      <nav class="nav__links" aria-label="Sections">
        <a v-for="section in sections" :key="section.href" :href="section.href">{{ section.label }}</a>
      </nav>

      <div class="nav__actions">
        <ThemeToggle />
        <v-btn v-if="auth.isAuthenticated" color="primary" :to="{ name: 'dashboard' }">
          Open workspace
        </v-btn>
        <v-btn v-else color="primary" :to="{ name: 'login' }">Sign in</v-btn>
      </div>
    </div>
  </header>
</template>

<style scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: rgba(var(--v-theme-background), 0.86);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.nav__inner {
  display: flex;
  align-items: center;
  gap: 24px;
  height: 60px;
}

.nav__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
}

.nav__mark {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  background-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-weight: 600;
  font-size: 0.875rem;
}

.nav__name {
  font-weight: 600;
  letter-spacing: -0.015em;
}

.nav__links {
  display: flex;
  gap: 22px;
  margin-left: 12px;
}

.nav__links a {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-text-secondary));
  text-decoration: none;
}

.nav__links a:hover {
  color: rgb(var(--v-theme-on-background));
}

.nav__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

@media (max-width: 760px) {
  .nav__links {
    display: none;
  }
}
</style>
