import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import PaginationComponent from './pagination.component';

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PaginationComponent, TranslateModule.forRoot()] }).compileComponents();
    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    component.totalPages = 3;
  });

  it('owns its page state and emits numbered page changes', () => {
    const pageChange = jest.fn();
    component.pageChange.subscribe(pageChange);
    fixture.detectChanges();

    const pageTwo = fixture.nativeElement.querySelector('[aria-label="healthConnect.pagination.page"]') as HTMLButtonElement;
    const pages = fixture.nativeElement.querySelectorAll('li.page-item button');
    (pages[2] as HTMLButtonElement).click();
    expect(component.currentPage()).toBe(2);
    expect(pageChange).toHaveBeenCalledWith(2);
    expect(pageTwo).toBeTruthy();
  });
});
