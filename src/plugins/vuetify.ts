import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import '@/styles/main.scss'

import { createVuetify, type ThemeDefinition } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

/* ---------------------------------------------------------------------------
 * Clinical OPD / EMR palette.
 * ------------------------------------------------------------------------- */

const light: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    'surface-alt': '#F8FAFC',
    'surface-variant': '#E2E8F0',
    'on-surface-variant': '#64748B',
    primary: '#0D9488',
    'primary-soft': '#CCFBF1',
    secondary: '#0284C7',
    navy: '#0F172A',
    'text-secondary': '#64748B',
    scrollbar: '#CBD5E1',
    success: '#065F46',
    warning: '#92400E',
    error: '#991B1B',
    info: '#075985',
    'status-active-bg': '#D1FAE5',
    'status-pending-bg': '#FEF3C7',
    'status-urgent-bg': '#FEE2E2',
    'status-lab-bg': '#E0F2FE',
    'on-background': '#0F172A',
    'on-surface': '#0F172A',
    'on-primary': '#FFFFFF',
    'on-navy': '#F8FAFC',
  },
  variables: {
    'border-color': '#E2E8F0',
    'border-opacity': 1,
    'high-emphasis-opacity': 1,
    'medium-emphasis-opacity': 1,
    'hover-opacity': 0.04,
    'focus-opacity': 0.06,
    'selected-opacity': 0.06,
    'activated-opacity': 0.06,
    'disabled-opacity': 0.38,
    'chart-1': '#0D9488',
    'chart-2': '#0284C7',
    'chart-3': '#1E3A8A',
    'chart-4': '#DC2626',
    'chart-grid': '#E2E8F0',
    'chart-axis': '#94A3B8',
  },
}

const dark: ThemeDefinition = {
  dark: true,
  colors: {
    background: '#020617',
    surface: '#0F172A',
    'surface-alt': '#111C35',
    'surface-variant': '#1E293B',
    'on-surface-variant': '#94A3B8',
    primary: '#2DD4BF',
    'primary-soft': '#134E4A',
    secondary: '#38BDF8',
    navy: '#0F172A',
    'text-secondary': '#94A3B8',
    scrollbar: '#334155',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#7DD3FC',
    'status-active-bg': '#064E3B',
    'status-pending-bg': '#78350F',
    'status-urgent-bg': '#7F1D1D',
    'status-lab-bg': '#0C4A6E',
    'on-background': '#E2E8F0',
    'on-surface': '#E2E8F0',
    'on-primary': '#082F49',
    'on-navy': '#E2E8F0',
  },
  variables: {
    'border-color': '#334155',
    'border-opacity': 1,
    'high-emphasis-opacity': 1,
    'medium-emphasis-opacity': 1,
    'hover-opacity': 0.06,
    'focus-opacity': 0.09,
    'selected-opacity': 0.09,
    'activated-opacity': 0.09,
    'disabled-opacity': 0.38,
    'chart-1': '#2DD4BF',
    'chart-2': '#38BDF8',
    'chart-3': '#818CF8',
    'chart-4': '#F87171',
    'chart-grid': '#1E293B',
    'chart-axis': '#475569',
  },
}

/* ---------------------------------------------------------------------------
 * COMPONENT DEFAULTS
 *
 * This block is what keeps the app from looking like stock Material. Feature
 * code writes <v-btn>Save changes</v-btn> and gets the house style for free.
 * If you catch yourself passing the same prop at every call site, it belongs
 * here instead.
 * ------------------------------------------------------------------------- */

const defaults = {
  global: {
    // Material's ink ripple reads as "phone app". Flat hover states read as
    // "tool", which is what a dashboard is.
    ripple: false,
  },

  VBtn: {
    variant: 'flat' as const,
    elevation: 0,
    height: 38,
    class: 'btn-tuned',
  },

  // Panels sit *in* the page: flat, hairline border, 10px radius.
  VCard: {
    variant: 'flat' as const,
    color: 'surface',
    border: true,
    class: 'rounded-panel',
  },
  VCardTitle: { class: 'text-subtitle-1 font-weight-medium px-5 pt-4 pb-1' },
  VCardSubtitle: { class: 'px-5 pb-3 text-body-2' },
  VCardText: { class: 'px-5 py-4' },
  VCardActions: { class: 'px-5 pb-4 pt-0' },

  VSheet: { color: 'surface' },

  // Overlays float above the page: 14px radius, the one real shadow.
  VDialog: { maxWidth: 520, transition: 'fade-transition' },
  VMenu: { offset: 6, transition: 'fade-transition' },

  VTextField: {
    variant: 'outlined' as const,
    density: 'comfortable' as const,
    color: 'primary',
    hideDetails: 'auto' as const,
  },
  VTextarea: {
    variant: 'outlined' as const,
    density: 'comfortable' as const,
    color: 'primary',
    hideDetails: 'auto' as const,
    autoGrow: true,
    rows: 3,
  },
  VSelect: {
    variant: 'outlined' as const,
    density: 'comfortable' as const,
    color: 'primary',
    hideDetails: 'auto' as const,
  },
  VAutocomplete: {
    variant: 'outlined' as const,
    density: 'comfortable' as const,
    color: 'primary',
    hideDetails: 'auto' as const,
  },
  VCheckbox: { color: 'primary', density: 'comfortable' as const, hideDetails: 'auto' as const },
  VSwitch: {
    color: 'primary',
    inset: true,
    density: 'comfortable' as const,
    hideDetails: 'auto' as const,
  },
  VRadioGroup: { color: 'primary', hideDetails: 'auto' as const },

  VList: { density: 'comfortable' as const, class: 'py-2' },
  VListItem: { rounded: true, minHeight: 40 },

  VChip: { size: 'small' as const, variant: 'tonal' as const, class: 'font-weight-medium' },
  VAlert: { variant: 'tonal' as const, density: 'comfortable' as const, class: 'rounded-panel' },

  VDataTable: { density: 'comfortable' as const, hover: true, itemsPerPage: 10 },

  VTabs: { color: 'primary', density: 'comfortable' as const, sliderColor: 'primary' },
  VTab: { class: 'btn-tuned' },

  VProgressLinear: { color: 'primary', height: 2, rounded: false },
  VProgressCircular: { color: 'primary' },
  VSkeletonLoader: { boilerplate: false, color: 'surface' },

  VTooltip: { location: 'top' as const, contentClass: 'text-caption' },
  VSnackbar: { timeout: 4500, location: 'bottom right' as const },

  VPagination: {
    density: 'comfortable' as const,
    variant: 'flat' as const,
    activeColor: 'primary',
    totalVisible: 5,
    rounded: true,
  },

  VAvatar: { color: 'primary-soft' },
  VDivider: { color: 'surface-variant' },
}

export default createVuetify({
  theme: {
    defaultTheme: 'light', // replaced at runtime by stores/theme.ts
    themes: { light, dark },
  },
  defaults,
  icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
  display: { mobileBreakpoint: 'md' },
})
