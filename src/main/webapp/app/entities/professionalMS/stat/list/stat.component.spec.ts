import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpHeaders, HttpResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { StatService } from '../service/stat.service';

import { StatComponent } from './stat.component';

describe('Stat Management Component', () => {
  let comp: StatComponent;
  let fixture: ComponentFixture<StatComponent>;
  let service: StatService;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [RouterTestingModule.withRoutes([{ path: 'stat', component: StatComponent }]), StatComponent],
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
      .overrideTemplate(StatComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(StatComponent);
    comp = fixture.componentInstance;
    service = TestBed.inject(StatService);

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
    expect(comp.stats?.[0]).toEqual(expect.objectContaining({ id: 'ABC' }));
  });

  describe('trackId', () => {
    it('Should forward to statService', () => {
      const entity = { id: 'ABC' };
      jest.spyOn(service, 'getStatIdentifier');
      const id = comp.trackId(0, entity);
      expect(service.getStatIdentifier).toHaveBeenCalledWith(entity);
      expect(id).toBe(entity.id);
    });
  });
});
