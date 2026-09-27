<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { APP_KIND, APP_NAME, APP_NAME_MEANING } from '@/config/app'

const auth = useAuthStore()
const year = new Date().getFullYear()
</script>

<template>
  <section class="cta">
    <div class="landing-container cta__inner">
      <div>
        <h2 class="cta__title">Ready for today’s clinic?</h2>
        <p class="cta__text">Sign in with the account your administrator set up for you.</p>
      </div>
      <v-btn v-if="auth.isAuthenticated" color="primary" size="large" :to="{ name: 'dashboard' }">
        Open your workspace
      </v-btn>
      <v-btn v-else color="primary" size="large" :to="{ name: 'login' }">Sign in</v-btn>
    </div>
  </section>

  <footer class="footer">
    <div class="landing-container footer__inner">
      <div>
        <div class="footer__name">{{ APP_NAME }}</div>
        <div class="footer__meta">{{ APP_KIND }}</div>
      </div>
      <div class="footer__meta footer__right">
        <div>{{ APP_NAME_MEANING }}</div>
        <div>© {{ year }} {{ APP_NAME }}</div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.cta {
  padding: 56px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background:
    radial-gradient(50% 120% at 100% 50%, rgba(var(--v-theme-primary), 0.14), transparent 70%),
    rgb(var(--v-theme-surface-alt));
}

.cta__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.cta__title {
  font-size: 1.5rem;
  letter-spacing: -0.025em !important;
}

.cta__text {
  margin-top: 6px;
  color: rgb(var(--v-theme-text-secondary));
}

.footer {
  padding: 28px 0 36px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.footer__inner {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.footer__name {
  font-weight: 600;
}

.footer__meta {
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}

.footer__right {
  text-align: right;
}

@media (max-width: 600px) {
  .footer__right {
    text-align: left;
  }
}
</style>
