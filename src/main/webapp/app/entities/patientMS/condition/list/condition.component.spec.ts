import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { ConditionService } from '../service/condition.service';

import { ConditionComponent } from './condition.component';

describe('Condition Management Component', () => {
  let comp: ConditionComponent;
  let fixture: ComponentFixture<ConditionComponent>;
  let service: ConditionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([{ path: 'condition', component: ConditionComponent }]),
        HttpClientTestingModule,
        ConditionComponent,
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              defaultSort: 'id,asc',
            }),
            queryParamMap: of(
              jest.requireActual('@angular/router').convertToParamMap({
                page: '1',
                size: '1',
                sort: 'id,desc',
              }),
            ),
            snapshot: { queryParams: {} },
          },
        },
      ],
    })
      .overrideTemplate(ConditionComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(ConditionComponent);
    comp = fixture.componentInstance;
    service = TestBed.inject(ConditionService);

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
    expect(comp.conditions?.[0]).toEqual(expect.objectContaining({ id: 'ABC' }));
  });

  describe('trackId', () => {
    it('Should forward to conditionService', () => {
      const entity = { id: 'ABC' };
      jest.spyOn(service, 'getConditionIdentifier');
      const id = comp.trackId(0, entity);
      expect(service.getConditionIdentifier).toHaveBeenCalledWith(entity);
      expect(id).toBe(entity.id);
    });
  });
});
