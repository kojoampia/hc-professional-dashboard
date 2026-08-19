import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import SharedModule from 'app/shared/shared.module';

/**
 * The signed-out layout: brand on the left, whatever form the route supplies on the right.
 *
 * <p>Shared by sign-in, registration, activation, password reset and the onboarding wizard, so
 * those five never look like they belong to different products. The same three-portal design as
 * {@code hc-admin/app} and {@code hc-patient/web} — hc-admin inlines it into its login template,
 * hc-patient extracted it into a layout, and this follows hc-patient because a design repeated in
 * five templates is a design that drifts in five places.
 *
 * <p><b>It carries no navigation, and that is the point.</b> The portal shell used to wrap these
 * screens, which meant a visitor with no account read a sidebar of destinations they could not
 * open — Patient directory, Case queue, Duty roster — every one of which bounced them to sign-in.
 *
 * <p>Onboarding renders here too, behind the auth guard rather than in front of it. An applicant
 * holds only {@code ROLE_USER} until their credentials are approved, so the portal shell would show
 * them that same unusable sidebar with a valid session behind it.
 */
@Component({
  standalone: true,
  selector: 'hpd-auth-shell',
  imports: [SharedModule, RouterOutlet],
  templateUrl: './auth-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AuthShellComponent {
  /**
   * The four figures under the blurb. Translation keys rather than numbers: the values are as
   * user-visible as the labels, and a "24/7" that stays "24/7" in German is a decision to take
   * deliberately in the catalogue rather than by hardcoding it here.
   */
  readonly facts = [
    { valueKey: 'healthConnect.brand.facts.rolesValue', labelKey: 'healthConnect.brand.facts.roles' },
    { valueKey: 'healthConnect.brand.facts.recordsValue', labelKey: 'healthConnect.brand.facts.records' },
    { valueKey: 'healthConnect.brand.facts.rostersValue', labelKey: 'healthConnect.brand.facts.rosters' },
    { valueKey: 'healthConnect.brand.facts.languagesValue', labelKey: 'healthConnect.brand.facts.languages' },
  ];
}
