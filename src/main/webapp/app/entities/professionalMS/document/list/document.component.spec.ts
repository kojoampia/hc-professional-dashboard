import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpHeaders, HttpResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { DocumentService } from '../service/document.service';

import { DocumentComponent } from './document.component';

describe('Document Management Component', () => {
  let comp: DocumentComponent;
  let fixture: ComponentFixture<DocumentComponent>;
  let service: DocumentService;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [RouterTestingModule.withRoutes([{ path: 'document', component: DocumentComponent }]),
        DocumentComponent],
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
      .overrideTemplate(DocumentComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(DocumentComponent);
    comp = fixture.componentInstance;
    service = TestBed.inject(DocumentService);

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
    expect(comp.documents?.[0]).toEqual(expect.objectContaining({ id: 'ABC' }));
  });

  describe('trackId', () => {
    it('Should forward to documentService', () => {
      const entity = { id: 'ABC' };
      jest.spyOn(service, 'getDocumentIdentifier');
      const id = comp.trackId(0, entity);
      expect(service.getDocumentIdentifier).toHaveBeenCalledWith(entity);
      expect(id).toBe(entity.id);
    });
  });
});
