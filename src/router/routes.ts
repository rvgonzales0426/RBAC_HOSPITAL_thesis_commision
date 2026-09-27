import type { RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import type { PermissionKey } from '@/config/permissions'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    /** Redirects to /login when there is no active session. */
    requiresAuth?: boolean
    /** Bounces signed-in users away (login, register, forgot password). */
    guestOnly?: boolean
    /**
     * Permissions that grant access. Holding ANY one of them is enough.
     * Omit to allow any signed-in user.
     */
    permissions?: readonly PermissionKey[]
    /** Page + breadcrumb label, and the document title suffix. */
    title?: string
  }
}

/**
 * Where "/" sends each role. First match wins, so someone holding several
 * workspaces lands on the most specific one. Returning true keeps them on
 * the dashboard — the admin, and accounts with no role yet.
 */
function homeFor(auth: ReturnType<typeof useAuthStore>): true | RouteLocationRaw {
  if (auth.can('dashboard.read')) return true
  if (auth.can('queue.serve')) return { name: 'consultation' }
  if (auth.can('lab.process')) return { name: 'laboratory' }
  if (auth.can('queue.read')) return { name: 'queue' }
  if (auth.can('patients.read')) return { name: 'patients' }
  return true
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/pages/dashboard/DashboardView.vue'),
        meta: { title: 'Dashboard' },
        // Role-based portals: each role lands on the screen its day starts
        // from. Only operations monitoring (the admin) stays on the dashboard.
        beforeEnter: () => homeFor(useAuthStore()),
      },
      {
        path: 'patients',
        name: 'patients',
        component: () => import('@/pages/patients/PatientsView.vue'),
        meta: { title: 'Patients', permissions: ['patients.read'] },
      },
      {
        path: 'patients/new',
        name: 'patient-register',
        component: () => import('@/pages/patients/PatientRegisterView.vue'),
        meta: { title: 'Register patient', permissions: ['patients.write'] },
      },
      {
        path: 'patients/:id',
        name: 'patient-detail',
        component: () => import('@/pages/patients/PatientDetailView.vue'),
        meta: { title: 'Patient record', permissions: ['patients.read'] },
      },
      {
        path: 'queue',
        name: 'queue',
        component: () => import('@/pages/queue/QueueView.vue'),
        meta: { title: 'OPD queue', permissions: ['queue.read'] },
      },
      {
        path: 'consultation',
        name: 'consultation',
        component: () => import('@/pages/consultation/ConsultationView.vue'),
        meta: { title: 'Consultation', permissions: ['queue.serve'] },
      },
      {
        path: 'laboratory',
        name: 'laboratory',
        component: () => import('@/pages/laboratory/LaboratoryView.vue'),
        meta: { title: 'Laboratory', permissions: ['lab.process'] },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/pages/settings/SettingsView.vue'),
        meta: { title: 'Settings' },
      },
      {
        // Adding a protected route: drop it in here and list the permissions
        // that grant access. Nothing else to wire up — the guard reads
        // meta.permissions, and roles are assigned those permissions at runtime.
        path: 'admin/users',
        name: 'admin-users',
        component: () => import('@/pages/admin/UsersView.vue'),
        meta: { title: 'Users', permissions: ['users.read'] },
      },
      {
        path: 'admin/roles',
        name: 'admin-roles',
        component: () => import('@/pages/admin/RolesView.vue'),
        meta: { title: 'Roles', permissions: ['roles.read'] },
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/pages/auth/LoginView.vue'),
        meta: { guestOnly: true, title: 'Sign in' },
      },
      {
        path: 'register',
        name: 'register',
        component: () => import('@/pages/auth/RegisterView.vue'),
        meta: { guestOnly: true, title: 'Create account' },
      },
      {
        path: 'forgot-password',
        name: 'forgot-password',
        component: () => import('@/pages/auth/ForgotPasswordView.vue'),
        meta: { guestOnly: true, title: 'Reset password' },
      },
      {
        // Reached from the emailed link, which arrives with a recovery session,
        // so this one is deliberately neither guest-only nor auth-required.
        path: 'reset-password',
        name: 'reset-password',
        component: () => import('@/pages/auth/ResetPasswordView.vue'),
        meta: { title: 'Choose a new password' },
      },
    ],
  },
  {
    // The public front page. Signed-out visitors to "/" land here (guards.ts).
    path: '/welcome',
    name: 'landing',
    component: () => import('@/pages/landing/LandingView.vue'),
  },
  {
    // Outside the app shell so the browser prints only the sheet.
    path: '/print/prescription/:visitId',
    name: 'print-prescription',
    component: () => import('@/pages/print/PrescriptionPrintView.vue'),
    meta: { requiresAuth: true, title: 'Prescription', permissions: ['consultations.read'] },
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/pages/error/ForbiddenView.vue'),
    meta: { title: 'No access' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/error/NotFoundView.vue'),
    meta: { title: 'Page not found' },
  },
]
