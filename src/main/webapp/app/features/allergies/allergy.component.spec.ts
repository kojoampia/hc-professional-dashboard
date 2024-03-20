import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllergyComponent } from './allergy.component';

describe('AllergyComponent', () => {
  let component: AllergyComponent;
  let fixture: ComponentFixture<AllergyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllergyComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AllergyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
