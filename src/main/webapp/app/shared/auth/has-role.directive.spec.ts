import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReplaySubject } from 'rxjs';

import { AccountService } from 'app/core/auth/account.service';
import { Account } from 'app/core/auth/account.model';
import { AuthorityRole } from 'app/health-connect/health-connect.models';

import HasRoleDirective from './has-role.directive';

@Component({
  standalone: true,
  imports: [HasRoleDirective],
  selector: 'hpd-role-directive-test',
  template: `<span *hpdHasRole="[roles.DOCTOR, roles.NURSE]" data-cy="restricted">restricted</span>`,
})
class RoleDirectiveTestComponent {
  readonly roles = AuthorityRole;
}

describe('HasRoleDirective', () => {
  const authenticationState = new ReplaySubject<Account | null>(1);
  const accountService = { getAuthenticationState: jest.fn(() => authenticationState.asObservable()) };
  let fixture: ComponentFixture<RoleDirectiveTestComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RoleDirectiveTestComponent],
      providers: [{ provide: AccountService, useValue: accountService }],
    });
    fixture = TestBed.createComponent(RoleDirectiveTestComponent);
  });

  it('renders against the full authority set and removes content for read-only users', () => {
    fixture.detectChanges();
    authenticationState.next({
      activated: true,
      authorities: ['ROLE_USER', 'ROLE_NURSE'],
      email: '',
      firstName: null,
      langKey: 'en',
      lastName: null,
      login: 'nurse',
      imageUrl: null,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-cy="restricted"]')).not.toBeNull();

    authenticationState.next({
      activated: true,
      authorities: ['ROLE_CARER'],
      email: '',
      firstName: null,
      langKey: 'en',
      lastName: null,
      login: 'carer',
      imageUrl: null,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-cy="restricted"]')).toBeNull();
  });
});
