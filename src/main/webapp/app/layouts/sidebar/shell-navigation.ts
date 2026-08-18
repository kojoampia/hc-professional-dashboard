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
  dataCy?: string;
}

export const SHELL_NAV_GROUPS: ShellNavGroup[] = [
  {
    labelKey: 'healthConnect.navigation.care',
    items: [
      {
        path: '/',
        labelKey: 'global.menu.home',
        icon: 'home',
        crumbKey: 'healthConnect.navigation.overview',
        exact: true,
        unauthOnly: true,
      },
      {
        path: '/',
        labelKey: 'healthConnect.navigation.dashboard',
        icon: 'space_dashboard',
        crumbKey: 'healthConnect.navigation.overview',
        exact: true,
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
        path: '/clinical-case',
        labelKey: 'professionalDashboardApp.patientserviceClinicalCase.home.title',
        icon: 'folder_shared',
        crumbKey: 'global.menu.admin.main',
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
        path: '/onboarding',
        labelKey: 'healthConnect.navigation.onboarding',
        icon: 'assignment_ind',
        crumbKey: 'global.menu.account.main',
        requiresAuth: true,
        dataCy: 'onboardingMenu',
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
      {
        path: '/about',
        labelKey: 'healthConnect.navigation.about',
        icon: 'help',
        crumbKey: 'global.menu.account.main',
        requiresAuth: true,
        dataCy: 'aboutMenu',
      },
      {
        path: '/account/settings',
        labelKey: 'global.menu.account.settings',
        icon: 'build',
        crumbKey: 'global.menu.account.main',
        dataCy: 'settings',
      },
      {
        path: '/account/password',
        labelKey: 'global.menu.account.password',
        icon: 'lock',
        crumbKey: 'global.menu.account.main',
        dataCy: 'passwordItem',
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
