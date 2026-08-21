import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';

import { RIBBON_ENV } from 'app/app.constants';
import PageRibbonComponent from './page-ribbon.component';

/**
 * The ribbon, and the property that matters more than the ribbon: **this component makes no HTTP
 * call at all**.
 *
 * <p>It used to fetch `GET /management/info` on every page load to read `activeProfiles` off the
 * actuator. A management endpoint should not be reachable from a browser — the production nginx
 * returns 404 for `/management` precisely so it is not — so that call returned no usable body there
 * and the SPA threw on every load of the live site. The `httpMock.verify()` below is the guard
 * against it coming back.
 */
describe('PageRibbonComponent', () => {
  let fixture: ComponentFixture<PageRibbonComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageRibbonComponent, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(PageRibbonComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('issues no request whatsoever — least of all to /management', () => {
    // verify() fails on any outstanding request, so this covers the whole surface rather than just
    // the one URL that used to be called.
    httpMock.verify();
    expect(httpMock.match(() => true)).toHaveLength(0);
  });

  it('takes the environment from the build, not from the server', () => {
    expect(fixture.componentInstance.ribbonEnv).toBe(RIBBON_ENV);
  });

  it('renders the ribbon only when the build named an environment', () => {
    const ribbon = (fixture.nativeElement as HTMLElement).querySelector('.ribbon');
    // RIBBON_ENV is '' in a production build and 'dev' otherwise; under Jest it is whatever the
    // test bundle defined, so assert the relationship rather than one of the two outcomes.
    expect(!!ribbon).toBe(!!RIBBON_ENV);
  });
});
