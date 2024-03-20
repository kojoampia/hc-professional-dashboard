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
import { FeaturesModule } from 'app/features/features.module';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TemperatureComponent } from 'app/features/temperature/temperature.component';
import { BloodPressureComponent } from 'app/features/blood-pressure/blood-pressure.component';
import { HeartRateComponent } from 'app/features/heart-rate/heart-rate.component';
import { SugarComponent } from 'app/features/sugar/sugar.component';
import { AllergyComponent } from 'app/features/allergies/allergy.component';
import { EmergencyComponent } from 'app/features/emergency/emergency.component';

@Component({
  selector: 'jhi-dashboard',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, MetricPanelModule, FeaturesModule, StatusModule],
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

  metricSelected(stat: any): void {
    switch (stat.route) {
      case 'temperature':
        // open temperature modal
        console.log('temperature');
        if (!this.isOpen) {
          this.isOpen = true;
          const modalRef: NgbModalRef = this.modalService.open(TemperatureComponent, { size: 'xl', centered: true });
          modalRef.result.finally(() => (this.isOpen = false));
        }
        break;
      case 'pressure':
        // open pressure modal
        console.log('pressure');
        if (!this.isOpen) {
          this.isOpen = true;
          const modalRef: NgbModalRef = this.modalService.open(BloodPressureComponent, { size: 'xl', centered: true });
          modalRef.componentInstance.professional = this.account;
          modalRef.result.finally(() => (this.isOpen = false));
        }
        break;
      case 'heartrate':
        // open heart-rate modal
        console.log('heart-rate');
        if (!this.isOpen) {
          this.isOpen = true;
          const modalRef: NgbModalRef = this.modalService.open(HeartRateComponent, { size: 'xl', centered: true });
          modalRef.componentInstance.professional = this.account;
          modalRef.result.finally(() => (this.isOpen = false));
        }
        break;
      case 'sugar':
        // open sugar modal
        console.log('sugar');
        if (!this.isOpen) {
          this.isOpen = true;
          const modalRef: NgbModalRef = this.modalService.open(SugarComponent, { size: 'xl', centered: true });
          modalRef.componentInstance.professional = this.account;
          modalRef.result.finally(() => (this.isOpen = false));
        }
        break;
      case 'emergencies':
        // open emergencies modal
        console.log('emergencies');
        if (!this.isOpen) {
          this.isOpen = true;
          const modalRef: NgbModalRef = this.modalService.open(EmergencyComponent, { size: 'xl', centered: true });
          modalRef.componentInstance.professional = this.account;
          modalRef.result.finally(() => (this.isOpen = false));
        }
        break;
      case 'allergies':
        // open allergies modal
        console.log('allergies');
        if (!this.isOpen) {
          this.isOpen = true;
          const modalRef: NgbModalRef = this.modalService.open(AllergyComponent, { size: 'xl', centered: true });
          modalRef.componentInstance.professional = this.account;
          modalRef.result.finally(() => (this.isOpen = false));
        }
        break;
      case 'services':
        // open services modal
        console.log('services');
        break;
      case 'diet':
        // open diet modal
        console.log('diet');
        break;
    }
  }

  toggleNavbar(): void {
    this.isNavbarCollapsed = !this.isNavbarCollapsed;
  }
}
