import { ChangeDetectionStrategy, Component } from '@angular/core';

import SharedModule from 'app/shared/shared.module';
import SettingsComponent from 'app/account/settings/settings.component';
import PasswordComponent from 'app/account/password/password.component';
import ClinicalProfileComponent from './clinical-profile.component';

/**
 * One page for everything about you: account details, clinical profile, password.
 *
 * <p>These were three places, two of which were routes in the sidebar and one of which did not
 * exist as a screen at all — the clinical profile could only ever be entered inside the onboarding
 * wizard, which closes on approval. Folding them together means the sidebar carries one destination
 * instead of two, and the answer to "where do I change that?" stops depending on which of the two
 * stores happens to hold the field.
 *
 * <p>The three sections stay three components. They own unrelated forms, talk to two different
 * services, and save independently — one form spanning all of them would make changing a password
 * and correcting an address the same submit, which is neither what the endpoints do nor what
 * anyone means. This component only supplies the column they stack in.
 */
@Component({
  standalone: true,
  selector: 'hpd-profile-page',
  imports: [SharedModule, SettingsComponent, ClinicalProfileComponent, PasswordComponent],
  templateUrl: './profile-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ProfilePageComponent {}
