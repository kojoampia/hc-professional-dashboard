import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpHeaders, HttpResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { HCPayOptionService } from '../service/hc-pay-option.service';

import { HCPayOptionComponent } from './hc-pay-option.component';

describe('HCPayOption Management Component', () => {
  let comp: HCPayOptionComponent;
  let fixture: ComponentFixture<HCPayOptionComponent>;
  let service: HCPayOptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [RouterTestingModule.withRoutes([{ path: 'hc-pay-option', component: HCPayOptionComponent }]),
        HCPayOptionComponent],
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
      .overrideTemplate(HCPayOptionComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(HCPayOptionComponent);
    comp = fixture.componentInstance;
    service = TestBed.inject(HCPayOptionService);

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
    expect(comp.hCPayOptions?.[0]).toEqual(expect.objectContaining({ id: 'ABC' }));
  });

  describe('trackId', () => {
    it('Should forward to hCPayOptionService', () => {
      const entity = { id: 'ABC' };
      jest.spyOn(service, 'getHCPayOptionIdentifier');
      const id = comp.trackId(0, entity);
      expect(service.getHCPayOptionIdentifier).toHaveBeenCalledWith(entity);
      expect(id).toBe(entity.id);
    });
  });
});
