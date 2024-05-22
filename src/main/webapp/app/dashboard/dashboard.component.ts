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
  page: string = 'status';
  temp = { id: 1, name: 'temperature', label: 'Temperature', value: 36, route: 'temperature', extra: '1' };
  pressure = { id: 2, name: 'pressure', label: 'Blood pressure', value: 140, route: 'pressure', extra: '2' };
  heart = { id: 3, name: 'heart rate', label: 'Heart rate', value: 36, route: 'heartrate', extra: '3' };
  sugar = { id: 4, name: 'sugar', label: 'Sugar', value: 36, route: 'sugar', extra: '4' };
  emergencies = { id: 1, name: 'emergencies', label: 'Emergencies', value: 1, route: 'emergencies', extra: '1' };
  alergies = { id: 2, name: 'allergies', label: 'Allergies', value: 0, route: 'allergies', extra: '2' };
  service = { id: 3, name: 'services', label: 'Services', value: 10, route: 'services', extra: '3' };
  diet = { id: 4, name: 'diet', label: 'Diet', value: 3, route: 'diet', extra: '4' };

  topCards: any[] = [];
  lowCards: any[] = [];

  isUserRole!: boolean;

  isOpen = false;
  isNavbarCollapsed = false;

  constructor(
    private dashboardService: DashboardService,
    private modalService: NgbModal,
  ) {}

  ngOnInit(): void {
    this.page = sessionStorage.getItem('page') || 'status';
    this.topCards = [this.temp, this.pressure, this.heart, this.sugar];
    this.lowCards = [this.emergencies, this.alergies, this.service, this.diet];
    if (this.account && this.account.activated) {
      this.isUserRole = this.account.authorities.indexOf(Authority.USER) > -1;
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
