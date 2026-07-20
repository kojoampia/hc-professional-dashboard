import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpHeaders, HttpResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { MetadataService } from '../service/metadata.service';

import { MetadataComponent } from './metadata.component';

describe('Metadata Management Component', () => {
  let comp: MetadataComponent;
  let fixture: ComponentFixture<MetadataComponent>;
  let service: MetadataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [RouterTestingModule.withRoutes([{ path: 'metadata', component: MetadataComponent }]),
        MetadataComponent],
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
      .overrideTemplate(MetadataComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(MetadataComponent);
    comp = fixture.componentInstance;
    service = TestBed.inject(MetadataService);

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
    expect(comp.metadata?.[0]).toEqual(expect.objectContaining({ id: 'ABC' }));
  });

  describe('trackId', () => {
    it('Should forward to metadataService', () => {
      const entity = { id: 'ABC' };
      jest.spyOn(service, 'getMetadataIdentifier');
      const id = comp.trackId(0, entity);
      expect(service.getMetadataIdentifier).toHaveBeenCalledWith(entity);
      expect(id).toBe(entity.id);
    });
  });
});
