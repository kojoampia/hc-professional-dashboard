import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';

import SharedModule from 'app/shared/shared.module';
import { PasswordService } from './password.service';
import PasswordStrengthBarComponent from './password-strength-bar/password-strength-bar.component';

/**
 * The password section of the profile page — no longer a route of its own.
 *
 * <p>It used to render its own centred page and title the card "Password for [login]", which is
 * why it needed the account at all. As one of three stacked sections under a page that already
 * says whose profile this is, repeating the login on each card was noise, so the account lookup
 * went with it.
 */
@Component({
  selector: 'hpd-password',
  imports: [SharedModule, FormsModule, ReactiveFormsModule, PasswordStrengthBarComponent],
  templateUrl: './password.component.html',
})
export default class PasswordComponent {
  doNotMatch = false;
  error = false;
  success = false;
  passwordForm = new FormGroup({
    currentPassword: new FormControl('', { nonNullable: true, validators: Validators.required }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4), Validators.maxLength(50)],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4), Validators.maxLength(50)],
    }),
  });

  constructor(private passwordService: PasswordService) {}

  changePassword(): void {
    this.error = false;
    this.success = false;
    this.doNotMatch = false;

    const { newPassword, confirmPassword, currentPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.doNotMatch = true;
    } else {
      this.passwordService.save(newPassword, currentPassword).subscribe({
        next: () => (this.success = true),
        error: () => (this.error = true),
      });
    }
  }
}
