import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Account } from 'app/core/auth/account.model';
import SharedModule from 'app/shared/shared.module';
import { Subject, takeUntil } from 'rxjs';
import { DashboardService } from './dashboard.service';
import { HttpResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MetricPanelModule } from './metric-panel/metric-panel.module';
import { StatusModule } from './status-panel/status.module';
import { Authority } from 'app/config/authority.constants';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'jhi-dashboard',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, MetricPanelModule, StatusModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  @Input() account!: Account;
  phoneNumber!: string;
  membership!: string;
  private readonly destroy$ = new Subject<void>();
  page: string = 'calendaraaaaaa';
  patients = { id: 1, name: 'patients', label: 'Patients', value: 176, route: 'patients', extra: '1' };
  female = { id: 2, name: 'female', label: 'Female', value: 104, route: 'female', extra: '2' };
  male = { id: 3, name: 'male', label: 'Male', value: 36, route: 'male', extra: '3' };
  kids = { id: 4, name: 'children', label: 'Chilren', value: 36, route: 'Children', extra: '4' };
  urgent = { id: 1, name: 'urgent', label: 'Urgent', value: 1, route: 'urgent', extra: '1' };
  open = { id: 2, name: 'open', label: 'Open', value: 2, route: 'open', extra: '2' };
  cases = { id: 3, name: 'cases', label: 'Cases', value: 10, route: 'cases', extra: '3' };
  notifications = { id: 4, name: 'notifications', label: 'Notifications', value: 3, route: 'notifications', extra: '4' };

  topCards: any[] = [];
  lowCards: any[] = [];

  isUserRole!: boolean;

  isOpen = false;
  isNavbarCollapsed = false;

  imageUrl = 'content/images/healthconnect-angel.png';

  constructor(
    private dashboardService: DashboardService,
  ) {}

  ngOnInit(): void {
    this.page = sessionStorage.getItem('page') || 'calendar';
    this.topCards = [this.patients, this.female, this.male, this.kids];
    this.lowCards = [this.urgent, this.open, this.cases, this.notifications];
    if (this.account && this.account.activated) {
      this.isUserRole = this.account.authorities.indexOf(Authority.USER) > -1;
      this.imageUrl = this.account.imageUrl || 'content/images/healthconnect-angel.png';
      this.fetchProfileInformation(this.account.email);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchProfileInformation(email: string): void {
    // phoneNumber = data.phoneNumber
    // membership = data.membership
    this.dashboardService
      .fetchInformationByEmail(email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: HttpResponse<any>) => {
          this.phoneNumber = res.body.phoneNumber;
          this.membership = res.body.membership;
        },
      });
  }
  openPage(page: string): void {
    this.page = page;
    sessionStorage.setItem('page', page);
  }

  metricSelected(stat: any): void {}

  toggleNavbar(): void {
    this.isNavbarCollapsed = !this.isNavbarCollapsed;
  }
}
