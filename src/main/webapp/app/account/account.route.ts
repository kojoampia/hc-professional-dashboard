import { Routes } from '@angular/router';

import passwordRoute from './password/password.route';
import settingsRoute from './settings/settings.route';

/**
 * The account screens that require an account: settings and password change.
 *
 * <p>Both carry their own guard, and both are children of the portal shell — someone changing their
 * password is signed in and expects the navigation they had a moment ago. The public four live in
 * {@link accountPublicRoutes}.
 */
const accountRoutes: Routes = [passwordRoute, settingsRoute];

export default accountRoutes;
