/**
 * Navigation model for the BridgeCare shell (sidebar + topbar + mobile tabbar).
 *
 * Single source of truth for what appears in the sidebar groups, which item is
 * shown on the mobile tabbar, and how the topbar derives its crumb/title —
 * see professional-web.md (this nav model is the single source of truth for the shell).
 */

export interface ShellNavItem {
  /** Absolute router path. */
  path: string;
  labelKey: string;
  /** Material icon name. */
  icon: string;
  /** Topbar crumb shown while this item's route (or a child of it) is active. */
  crumbKey: string;
  /** Match only the exact URL (for `/`). */
  exact?: boolean;
  /** Only meaningful for the `/` entry, which swaps label by auth state. */
  unauthOnly?: boolean;
  requiresAuth?: boolean;
  /** Rendered on the mobile bottom tabbar. */
  tabbar?: boolean;
  /** Live badge source (resolved by the shell components via DI). */
  badge?: 'unreadMessages';
  dataCy?: string;
}

export interface ShellNavGroup {
  labelKey: string;
  items: ShellNavItem[];
  requiresAuth?: boolean;
  /** Restrict the whole group to these authorities (e.g. ROLE_ADMIN). */
  authorities?: string[];
  /**
   * Hide the group from an account holding no clinical authority at all.
   *
   * <p>An applicant holds only ROLE_USER until their credentials are approved, and every
   * destination in such a group refuses them. Onboarding used to avoid this by rendering on the
   * signed-out shell; now that it is a tab on the profile page inside the portal, the sidebar has
   * to do it instead — otherwise an applicant reads a list of rooms they cannot enter.
   *
   * <p>Deliberately keyed on <em>authority</em>, not on the application reaching ACTIVE. Clinicians
   * seeded or created before onboarding existed hold a clinical role and no application at all;
   * gating on the application would take the whole portal away from them.
   */
  clinicalOnly?: boolean;
  dataCy?: string;
}

export const SHELL_NAV_GROUPS: ShellNavGroup[] = [
  {
    labelKey: 'healthConnect.navigation.care',
    clinicalOnly: true,
    items: [
      {
        // `/dashboard` rather than `/`, and no `exact`. The root is now a redirect to this path, so
        // matching on `/` would highlight nothing once the redirect resolves. The signed-out `Home`
        // entry that used to sit above this one is gone with the signed-out portal view — this
        // sidebar only renders inside ShellComponent, which is guarded as a whole.
        path: '/dashboard',
        labelKey: 'healthConnect.navigation.dashboard',
        icon: 'space_dashboard',
        crumbKey: 'healthConnect.navigation.overview',
        requiresAuth: true,
        tabbar: true,
      },
      {
        path: '/patients',
        labelKey: 'healthConnect.patient.directory',
        icon: 'group',
        crumbKey: 'healthConnect.navigation.care',
        requiresAuth: true,
        tabbar: true,
      },
      {
        path: '/cases',
        labelKey: 'healthConnect.case.queue',
        icon: 'list_alt',
        crumbKey: 'healthConnect.navigation.care',
        requiresAuth: true,
        tabbar: true,
      },
      {
        path: '/duty-roster',
        labelKey: 'healthConnect.navigation.dutyRoster',
        icon: 'calendar_month',
        crumbKey: 'healthConnect.navigation.care',
        requiresAuth: true,
        tabbar: true,
      },
    ],
  },
  {
    labelKey: 'global.menu.admin.main',
    authorities: ['ROLE_ADMIN'],
    dataCy: 'adminMenu',
    items: [
      {
        path: '/review',
        labelKey: 'healthConnect.review.title',
        icon: 'fact_check',
        crumbKey: 'global.menu.admin.main',
        dataCy: 'reviewMenu',
      },
      {
        path: '/compliance',
        labelKey: 'healthConnect.compliance.title',
        icon: 'policy',
        crumbKey: 'global.menu.admin.main',
        dataCy: 'complianceMenu',
      },
      {
        path: '/admin/metrics',
        labelKey: 'global.menu.admin.metrics',
        icon: 'speed',
        crumbKey: 'global.menu.admin.main',
      },
      {
        path: '/admin/health',
        labelKey: 'global.menu.admin.health',
        icon: 'favorite',
        crumbKey: 'global.menu.admin.main',
      },
    ],
  },
  {
    labelKey: 'global.menu.account.main',
    requiresAuth: true,
    items: [
      {
        // Was "Onboarding" pointing at the standalone wizard. The wizard's steps are tabs on the
        // profile page now, so one destination covers both what onboarding asked for and what a
        // clinician edits afterwards.
        path: '/account/profile',
        labelKey: 'healthConnect.navigation.profile',
        icon: 'badge',
        crumbKey: 'global.menu.account.main',
        requiresAuth: true,
        dataCy: 'profileMenu',
      },
      {
        path: '/earnings',
        labelKey: 'healthConnect.navigation.earnings',
        icon: 'payments',
        crumbKey: 'global.menu.account.main',
        requiresAuth: true,
        dataCy: 'earningsMenu',
      },
      {
        path: '/messages',
        labelKey: 'healthConnect.navigation.messages',
        icon: 'chat',
        crumbKey: 'global.menu.account.main',
        requiresAuth: true,
        tabbar: true,
        badge: 'unreadMessages',
        dataCy: 'messagesMenu',
      },
    ],
  },
];

const flatItems: ShellNavItem[] = SHELL_NAV_GROUPS.flatMap(group => group.items);

export const shellTabbarItems = (): ShellNavItem[] => flatItems.filter(item => item.tabbar);

/**
 * Longest-prefix match of the current URL against the nav items; drives the
 * topbar crumb (and the title when the route itself declares none).
 */
export const findShellNavItem = (url: string, authenticated: boolean): ShellNavItem | null => {
  const path = url.split('?')[0].split('#')[0] || '/';
  let best: ShellNavItem | null = null;
  for (const item of flatItems) {
    if (item.unauthOnly && authenticated) {
      continue;
    }
    if (item.requiresAuth && !authenticated && item.path !== '/') {
      continue;
    }
    const matches = item.exact ? path === item.path : path === item.path || path.startsWith(`${item.path}/`);
    if (matches && (!best || item.path.length > best.path.length)) {
      best = item;
    }
  }
  return best;
};
