import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpHeaders, HttpResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { AddressService } from '../service/address.service';

import { AddressComponent } from './address.component';

describe('Address Management Component', () => {
  let comp: AddressComponent;
  let fixture: ComponentFixture<AddressComponent>;
  let service: AddressService;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [RouterTestingModule.withRoutes([{ path: 'address', component: AddressComponent }]),
        AddressComponent],
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
      .overrideTemplate(AddressComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(AddressComponent);
    comp = fixture.componentInstance;
    service = TestBed.inject(AddressService);

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
    expect(comp.addresses?.[0]).toEqual(expect.objectContaining({ id: 'ABC' }));
  });

  describe('trackId', () => {
    it('Should forward to addressService', () => {
      const entity = { id: 'ABC' };
      jest.spyOn(service, 'getAddressIdentifier');
      const id = comp.trackId(0, entity);
      expect(service.getAddressIdentifier).toHaveBeenCalledWith(entity);
      expect(id).toBe(entity.id);
    });
  });
});
