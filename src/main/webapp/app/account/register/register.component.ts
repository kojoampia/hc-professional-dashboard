import { Component, AfterViewInit, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormGroup, FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { catchError, debounceTime, distinctUntilChanged, filter, map, of, switchMap, tap } from 'rxjs';

import { EMAIL_ALREADY_USED_TYPE, LOGIN_ALREADY_USED_TYPE } from 'app/config/error.constants';
import { CareersHandoffService } from 'app/core/careers/careers-handoff.service';
import { StateStorageService } from 'app/core/auth/state-storage.service';
import SharedModule from 'app/shared/shared.module';
import PasswordStrengthBarComponent from '../password/password-strength-bar/password-strength-bar.component';
import { RegisterService } from './register.service';

@Component({
  selector: 'hpd-register',
  imports: [SharedModule, RouterModule, FormsModule, ReactiveFormsModule, PasswordStrengthBarComponent],
  templateUrl: './register.component.html',
})
export default class RegisterComponent implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly careersHandoff = inject(CareersHandoffService);
  private readonly stateStorageService = inject(StateStorageService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('login', { static: false })
  login?: ElementRef;

  doNotMatch = false;
  error = false;
  errorEmailExists = false;
  errorUserExists = false;
  success = false;

  /**
   * Look-ahead state for the login field.
   *
   * `error` is deliberately its own state rather than folding into `taken`: a failed check means we
   * do not know, and colouring the field red for a network blip would push people into renaming a
   * login that was fine. Nothing here gates submission — the server decides.
   */
  loginStatus: 'idle' | 'checking' | 'available' | 'taken' | 'error' = 'idle';
  loginSuggestions: string[] = [];

  registerForm = new FormGroup({
    login: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(1),
        Validators.maxLength(50),
        Validators.pattern('^[a-zA-Z0-9!$&*+=?^_`{|}~.-]+@[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*$|^[_.@A-Za-z0-9-]+$'),
      ],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5), Validators.maxLength(254), Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4), Validators.maxLength(50)],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4), Validators.maxLength(50)],
    }),
  });

  constructor(
    private translateService: TranslateService,
    private registerService: RegisterService,
  ) {}

  ngOnInit(): void {
    this.watchLoginAvailability();

    // Careers handoff (docs/careers-handoff-contract.md): capture
    // track/locale/src for the onboarding wizard and honour the locale the
    // candidate was reading in. Absent/unknown parameters change nothing.
    const handoff = this.careersHandoff.capture(this.route.snapshot.queryParamMap);
    if (handoff?.locale && handoff.locale !== this.translateService.currentLang) {
      this.stateStorageService.storeLocale(handoff.locale);
      this.translateService.use(handoff.locale);
    }
  }

  ngAfterViewInit(): void {
    if (this.login) {
      this.login.nativeElement.focus();
    }
  }

  /**
   * Ask the server about the login as it is typed.
   *
   * Only fires when the control is otherwise valid, so a half-typed name does not spend a request
   * that the server would answer with a 400 anyway. `switchMap` drops the in-flight answer when a
   * newer keystroke arrives, which is what stops a slow early response from overwriting the verdict
   * for what is currently in the box.
   */
  private watchLoginAvailability(): void {
    const loginControl = this.registerForm.controls.login;
    loginControl.valueChanges
      .pipe(
        map(value => value.trim().toLowerCase()),
        tap(() => {
          this.loginStatus = 'idle';
          this.loginSuggestions = [];
        }),
        debounceTime(350),
        distinctUntilChanged(),
        filter(value => value.length > 0 && loginControl.valid),
        tap(() => (this.loginStatus = 'checking')),
        switchMap(value => this.registerService.checkLoginAvailability(value).pipe(catchError(() => of(null)))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(result => {
        if (result === null) {
          this.loginStatus = 'error';
          this.loginSuggestions = [];
          return;
        }
        // Ignore an answer that no longer describes what is in the field — the user may have kept
        // typing while it was in flight, and a stale green tick is worse than none.
        if (result.login !== loginControl.value.trim().toLowerCase()) {
          return;
        }
        this.loginStatus = result.available ? 'available' : 'taken';
        this.loginSuggestions = result.available ? [] : result.suggestions;
        // A login the server has just told us is taken is worth clearing the stale submit error for.
        if (!result.available) {
          this.errorUserExists = false;
        }
      });
  }

  /** Adopt one of the offered names. The value change re-runs the check, which confirms it. */
  useSuggestion(suggestion: string): void {
    this.registerForm.controls.login.setValue(suggestion);
    this.registerForm.controls.login.markAsDirty();
  }

  register(): void {
    this.doNotMatch = false;
    this.error = false;
    this.errorEmailExists = false;
    this.errorUserExists = false;

    const { password, confirmPassword } = this.registerForm.getRawValue();
    if (password !== confirmPassword) {
      this.doNotMatch = true;
    } else {
      const { login, email } = this.registerForm.getRawValue();
      this.registerService
        .save({ login, email, password, langKey: this.translateService.currentLang })
        .subscribe({ next: () => (this.success = true), error: response => this.processError(response) });
    }
  }

  private processError(response: HttpErrorResponse): void {
    if (response.status === 400 && response.error.type === LOGIN_ALREADY_USED_TYPE) {
      this.errorUserExists = true;
    } else if (response.status === 400 && response.error.type === EMAIL_ALREADY_USED_TYPE) {
      this.errorEmailExists = true;
    } else {
      this.error = true;
    }
  }
}
