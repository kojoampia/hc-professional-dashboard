import { Directive, Input, OnDestroy, TemplateRef, ViewContainerRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AccountService } from 'app/core/auth/account.service';
import { hasHealthConnectRole } from 'app/health-connect/authority-role';
import { AuthorityRole } from 'app/health-connect/health-connect.models';

@Directive({
  standalone: true,
  selector: '[hpdHasRole]',
})
export default class HasRoleDirective implements OnDestroy {
  private roles: AuthorityRole | readonly AuthorityRole[] = [];
  private currentAuthorities: readonly string[] = [];
  private subscribed = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private accountService: AccountService,
    private templateRef: TemplateRef<unknown>,
    private viewContainerRef: ViewContainerRef,
  ) {}

  @Input()
  set hpdHasRole(value: AuthorityRole | readonly AuthorityRole[]) {
    this.roles = value;
    this.updateView();
    if (!this.subscribed) {
      this.subscribed = true;
      this.accountService
        .getAuthenticationState()
        .pipe(takeUntil(this.destroy$))
        .subscribe(account => {
          this.currentAuthorities = account?.authorities ?? [];
          this.updateView();
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    this.viewContainerRef.clear();
    if (hasHealthConnectRole(this.currentAuthorities, this.roles)) {
      this.viewContainerRef.createEmbeddedView(this.templateRef);
    }
  }
}
