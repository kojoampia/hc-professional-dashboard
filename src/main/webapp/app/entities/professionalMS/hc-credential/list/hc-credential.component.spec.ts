import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpHeaders, HttpResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { HCCredentialService } from '../service/hc-credential.service';

import { HCCredentialComponent } from './hc-credential.component';

describe('HCCredential Management Component', () => {
  let comp: HCCredentialComponent;
  let fixture: ComponentFixture<HCCredentialComponent>;
  let service: HCCredentialService;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [RouterTestingModule.withRoutes([{ path: 'hc-credential', component: HCCredentialComponent }]),
        HCCredentialComponent],
    providers: [
        {
            provide: ActivatedRoute,
            useValue: {
                data: of({
                    defaultSort: 'id,asc',
                }),
                queryParamMap: of(jest.requireActual('@angular/router').convertToParamMap({
                    page: '1',
                    size: '1',
                    sort: 'id,desc',
                })),
                snapshot: { queryParams: {} },
            },
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
})
      .overrideTemplate(HCCredentialComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(HCCredentialComponent);
    comp = fixture.componentInstance;
    service = TestBed.inject(HCCredentialService);

    const headers = new HttpHeaders();
    jest.spyOn(service, 'query').mockReturnValue(
      of(
        new HttpResponse({
          body: [{ id: 'ABC' }],
          headers,
        }),
      ),
    );
  });

  it('Should call load all on init', () => {
    // WHEN
    comp.ngOnInit();

    // THEN
    expect(service.query).toHaveBeenCalled();
    expect(comp.hCCredentials?.[0]).toEqual(expect.objectContaining({ id: 'ABC' }));
  });

  describe('trackId', () => {
    it('Should forward to hCCredentialService', () => {
      const entity = { id: 'ABC' };
      jest.spyOn(service, 'getHCCredentialIdentifier');
      const id = comp.trackId(0, entity);
      expect(service.getHCCredentialIdentifier).toHaveBeenCalledWith(entity);
      expect(id).toBe(entity.id);
    });
  });
});
