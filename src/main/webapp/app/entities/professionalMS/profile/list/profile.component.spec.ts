import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { ProfileService } from '../service/profile.service';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let service: ProfileService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([{ path: 'profile', component: ProfileComponent }]), ProfileComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .overrideTemplate(ProfileComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(ProfileService);
  });

  it('forwards identity tracking to ProfileService', () => {
    const profile = { id: 'ABC' };
    jest.spyOn(service, 'getProfileIdentifier');

    const id = component.trackId(0, profile);

    expect(service.getProfileIdentifier).toHaveBeenCalledWith(profile);
    expect(id).toBe(profile.id);
  });
});
