/**
 * Navigation model for the BridgeCare shell (sidebar + topbar + mobile tabbar).
 *
 * Single source of truth for what appears in the sidebar groups, which item is
 * shown on the mobile tabbar, and how the topbar derives its crumb/title —
 * see professional-web.md (this nav model is the single source of truth for the shell).
 */

import { wizardPanePath } from 'app/onboarding/wizard.service';

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
        // ONBOARDING, and it is back. profile.md:275-277: "Onboarding is displayed in a single
        // dialog wizard pane, not in tabs." This item was removed when the wizard's steps became
        // tabs on the profile page, and the comment on the item below recorded that one destination
        // therefore covered both. The specification reverses that, so there are two destinations
        // again — see sidebar.component.spec.ts, whose assertion was flipped in the same change.
        //
        // The pane is a routed overlay over the dashboard (T8), so this is a real URL rather than a
        // modal trigger: deep-linkable, and the browser's back button steps between panes. Read from
        // wizardPanePath so the address has one spelling here, in the route table and in the spec.
        //
        // Offered to every authenticated account rather than to applicants only, because the panes
        // are the editing forms as well as the sequence: back-navigation stays possible after
        // submission (WizardService's post-submit rule), so an approved clinician who moved house
        // comes here too.
        path: wizardPanePath('account'),
        labelKey: 'healthConnect.navigation.onboarding',
        icon: 'assignment_ind',
        crumbKey: 'global.menu.account.main',
        requiresAuth: true,
        dataCy: 'onboardingMenu',
      },
      {
        // The profile page: what a clinician edits today, and from T9 the My Profile read view. It
        // carries the wizard's steps as tabs until T6 retires it; the item above is the destination
        // onboarding itself now has.
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
