import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import DataTableComponent, { DataTableColumn } from './data-table.component';

interface Row {
  id: string;
  status: 'urgent' | 'open';
  name: string;
}

describe('DataTableComponent', () => {
  let component: DataTableComponent<Row>;
  let fixture: ComponentFixture<DataTableComponent<Row>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DataTableComponent, TranslateModule.forRoot()] }).compileComponents();
    fixture = TestBed.createComponent(DataTableComponent<Row>);
    component = fixture.componentInstance;
    component.columns = [
      { id: 'name', labelKey: 'healthConnect.patient.patient', value: row => row.name },
      { id: 'status', labelKey: 'healthConnect.case.status', value: row => row.status },
    ] satisfies DataTableColumn<Row>[];
    component.trackBy = row => row.id;
  });

  it('renders semantic headers, applies a status tint, and emits table actions', () => {
    const actionTriggered = jest.fn();
    component.rows = [{ id: '1', name: 'Ada', status: 'urgent' }];
    component.actions = [{ id: 'view', labelKey: 'healthConnect.actions.view' }];
    component.statusVariant = row => row.status;
    component.actionTriggered.subscribe(actionTriggered);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('th[scope="col"]')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('tbody tr').classList).toContain('hpd-data-table--urgent');
    (fixture.nativeElement.querySelector('.hpd-data-table__actions button') as HTMLButtonElement).click();
    expect(actionTriggered).toHaveBeenCalledWith({ actionId: 'view', row: component.rows[0] });
  });

  it('renders the translated empty state without data rows', () => {
    component.rows = [];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('tbody td').getAttribute('colspan')).toBe('2');
  });
});
