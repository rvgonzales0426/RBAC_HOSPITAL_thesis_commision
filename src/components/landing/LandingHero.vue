<script setup lang="ts">
import LandingQueuePreview from './LandingQueuePreview.vue'
import corridorPhoto from '@/assets/landing/hospital-corridor.jpg'
import { useAuthStore } from '@/stores/auth'
import { APP_KIND, APP_NAME, APP_TAGLINE } from '@/config/app'

const auth = useAuthStore()
const photo = `url(${corridorPhoto})`
</script>

<template>
  <section class="hero">
    <!-- Decorative: the photo sits behind a theme-coloured wash so the copy
         always reads, in light and dark. -->
    <div class="hero__photo" :style="{ backgroundImage: photo }" aria-hidden="true" />
    <div class="hero__wash" aria-hidden="true" />

    <div class="landing-container hero__inner">
      <div class="hero__copy">
        <p class="hero__kind">{{ APP_KIND }}</p>
        <h1 class="hero__title">{{ APP_TAGLINE }}</h1>
        <p class="hero__lead">
          {{ APP_NAME }} carries every outpatient visit from the registration desk to the doctor,
          the laboratory and back — replacing paper logbooks, hand-carried lab slips and
          unmanaged waiting lines with one shared record.
        </p>

        <div class="hero__actions">
          <template v-if="auth.isAuthenticated">
            <v-btn color="primary" size="large" :to="{ name: 'dashboard' }">Open your workspace</v-btn>
          </template>
          <template v-else>
            <v-btn color="primary" size="large" :to="{ name: 'login' }">Sign in</v-btn>
            <v-btn variant="outlined" size="large" :to="{ name: 'register' }">Create an account</v-btn>
          </template>
        </div>
        <p v-if="!auth.isAuthenticated" class="hero__note">
          New accounts start without access until an administrator assigns a role.
        </p>
      </div>

      <LandingQueuePreview class="hero__preview" />
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  padding: 72px 0 80px;
  background-color: rgb(var(--v-theme-background));
}

/* The source photo is small; a slight blur turns upscaling into depth of
   field instead of pixels. The scale hides the blur's soft edges. */
.hero__photo {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center 40%;
  filter: blur(3px) saturate(0.9);
  transform: scale(1.06);
}

/* Solid behind the copy on the left, easing to reveal the corridor on the
   right, then fading into the next section at the bottom. */
.hero__wash {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to bottom, transparent 55%, rgb(var(--v-theme-background)) 100%),
    linear-gradient(
      90deg,
      rgba(var(--v-theme-background), 0.97) 0%,
      rgba(var(--v-theme-background), 0.9) 40%,
      rgba(var(--v-theme-background), 0.62) 70%,
      rgba(var(--v-theme-background), 0.5) 100%
    ),
    radial-gradient(60% 60% at 85% 20%, rgba(var(--v-theme-primary), 0.16), transparent 70%);
}

.hero__inner {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 56px;
  align-items: center;
}

.hero__kind {
  display: inline-block;
  margin-bottom: 18px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.1);
}

.hero__title {
  font-size: clamp(2.1rem, 4.6vw, 3.25rem);
  line-height: 1.08;
  letter-spacing: -0.035em !important;
  max-width: 14ch;
}

.hero__lead {
  margin-top: 20px;
  max-width: 52ch;
  font-size: 1.0625rem;
  line-height: 1.6;
  color: rgb(var(--v-theme-text-secondary));
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 30px;
}

.hero__note {
  margin-top: 14px;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-text-secondary));
}

@media (max-width: 960px) {
  .hero {
    padding: 48px 0 56px;
  }

  /* Stacked layout: copy runs full width, so the wash evens out. */
  .hero__wash {
    background:
      linear-gradient(to bottom, transparent 60%, rgb(var(--v-theme-background)) 100%),
      linear-gradient(rgba(var(--v-theme-background), 0.88), rgba(var(--v-theme-background), 0.88));
  }

  .hero__inner {
    grid-template-columns: 1fr;
    gap: 40px;
  }
}
</style>
