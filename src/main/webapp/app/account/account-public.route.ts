import { Routes } from '@angular/router';

import activateRoute from './activate/activate.route';
import passwordResetFinishRoute from './password-reset/finish/password-reset-finish.route';
import passwordResetInitRoute from './password-reset/init/password-reset-init.route';
import registerRoute from './register/register.route';

/**
 * The account screens reachable without an account: registration, activation and the two halves of
 * a password reset.
 *
 * <p>Split from {@link accountRoutes} so these four can render on the signed-out shell while
 * settings and password-change stay inside the portal. They were one list when every route shared
 * one layout; now the layout is chosen by the parent, and mixing them would put the sidebar back in
 * front of somebody activating an account they have not signed into yet.
 */
const accountPublicRoutes: Routes = [activateRoute, passwordResetFinishRoute, passwordResetInitRoute, registerRoute];

export default accountPublicRoutes;
