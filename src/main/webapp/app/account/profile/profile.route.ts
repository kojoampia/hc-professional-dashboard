import { Route } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import ProfileDetailComponent from 'app/entities/profile/detail.component';

/**
 * `/account/profile` — the My Profile read view (`profile.md` § Profile detail view, T9).
 *
 * <p>Q2 (`../docs/profile-addendum.md` § 5): the route the retired tab page held, **re-pointed**
 * rather than a new path — it is the sidebar user card's destination and whatever clinicians have
 * bookmarked. The tab page (`profile-page.component.ts` beside this file) is now unrouted and
 * retires with T6, which also owns re-pointing the `/onboarding` redirect; until then a `?tab=…`
 * query parameter arriving here (the old deep links) is simply ignored — the read view has no tabs,
 * and the wizard's panes live under `/dashboard` since T8.
 *
 * <p>Authenticated but **no clinical role required**: an applicant holding only `ROLE_USER` is
 * exactly who spends the most time looking at their own profile.
 */
const profileRoute: Route = {
  path: 'profile',
  component: ProfileDetailComponent,
  title: 'healthConnect.profile.detail.title',
  canActivate: [UserRouteAccessService],
};

export default profileRoute;
