import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { ProfileInfo } from 'app/layouts/profiles/profile-info.model';
import { ProfileService } from 'app/layouts/profiles/profile.service';

import PageRibbonComponent from './page-ribbon.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Page Ribbon Component', () => {
  let comp: PageRibbonComponent;
  let fixture: ComponentFixture<PageRibbonComponent>;
  let profileService: ProfileService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [PageRibbonComponent],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
})
      .overrideTemplate(PageRibbonComponent, '')
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PageRibbonComponent);
    comp = fixture.componentInstance;
    profileService = TestBed.inject(ProfileService);
  });

  it('Should call profileService.getProfileInfo on init', () => {
    // GIVEN
    jest.spyOn(profileService, 'getProfileInfo').mockReturnValue(of(new ProfileInfo()));

    // WHEN
    comp.ngOnInit();

    // THEN
    expect(profileService.getProfileInfo).toHaveBeenCalled();
  });
});
