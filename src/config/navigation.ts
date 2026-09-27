import type { NavItem } from '@/types'
import { PERMISSIONS } from './permissions'

/**
 * Sidebar sections. An item with `permissions` is hidden from anyone who holds
 * none of them — but that is cosmetic only. The real gates are the route guard
 * (router/guards.ts) and RLS in the database.
 */
export interface NavSection {
  /** Optional heading. Leave undefined for the first, unlabelled group. */
  title?: string
  items: NavItem[]
}

export const navigation: NavSection[] = [
  {
    items: [
      { title: 'Dashboard', icon: 'mdi-view-dashboard-outline', to: '/' },
      {
        title: 'Registration',
        icon: 'mdi-account-plus-outline',
        to: '/admin/users',
        permissions: [PERMISSIONS.UsersRead],
      },
      {
        title: 'OPD Queue',
        icon: 'mdi-clipboard-text-clock-outline',
        to: '/admin/roles',
        permissions: [PERMISSIONS.RolesRead],
      },
      { title: 'Consultation', icon: 'mdi-stethoscope', to: '/settings' },
      { title: 'Laboratory', icon: 'mdi-flask-outline', to: '/settings#laboratory' },
      { title: 'EMR Viewer', icon: 'mdi-file-document-multiple-outline', to: '/settings#emr' },
    ],
  },
]
