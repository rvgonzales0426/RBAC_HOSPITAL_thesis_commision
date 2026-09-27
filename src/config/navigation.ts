import type { NavItem } from '@/types'
import { PERMISSIONS } from './permissions'

/**
 * Sidebar sections. An item with `permissions` is hidden from anyone who holds
 * none of them — but that is cosmetic only. The real gates are the route guard
 * (router/guards.ts) and RLS in the database.
 *
 * Each role sees its own portal: OPD staff get Patients and the queue, a
 * physician the consultation workspace, the lab its worklist, and the admin
 * everything plus the monitoring dashboard.
 */
export interface NavSection {
  /** Optional heading. Leave undefined for the first, unlabelled group. */
  title?: string
  items: NavItem[]
}

export const navigation: NavSection[] = [
  {
    items: [
      {
        title: 'Dashboard',
        icon: 'mdi-view-dashboard-outline',
        to: '/',
        permissions: [PERMISSIONS.DashboardRead],
      },
    ],
  },
  {
    title: 'Outpatient',
    items: [
      {
        title: 'OPD queue',
        icon: 'mdi-clipboard-text-clock-outline',
        to: '/queue',
        permissions: [PERMISSIONS.QueueRead],
      },
      {
        title: 'Consultation',
        icon: 'mdi-stethoscope',
        to: '/consultation',
        permissions: [PERMISSIONS.QueueServe],
      },
      {
        title: 'Laboratory',
        icon: 'mdi-flask-outline',
        to: '/laboratory',
        permissions: [PERMISSIONS.LabProcess],
      },
      {
        title: 'Patients',
        icon: 'mdi-folder-account-outline',
        to: '/patients',
        permissions: [PERMISSIONS.PatientsRead],
      },
      {
        title: 'Register patient',
        icon: 'mdi-account-plus-outline',
        to: '/patients/new',
        permissions: [PERMISSIONS.PatientsWrite],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        title: 'Users',
        icon: 'mdi-account-multiple-outline',
        to: '/admin/users',
        permissions: [PERMISSIONS.UsersRead],
      },
      {
        title: 'Roles',
        icon: 'mdi-shield-account-outline',
        to: '/admin/roles',
        permissions: [PERMISSIONS.RolesRead],
      },
    ],
  },
]
