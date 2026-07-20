import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import CheckboxListComponent from './checkbox-list.component';
import ContextMenuComponent from './context-menu.component';
import FileUploadTriggerComponent from './file-upload-trigger.component';
import IconButtonComponent from './icon-button.component';
import SearchInputComponent from './search-input.component';
import TextInputComponent from './text-input.component';

describe('HealthConnect form controls', () => {
  it('debounces a labelled search value', fakeAsync(() => {
    TestBed.configureTestingModule({ imports: [SearchInputComponent, TranslateModule.forRoot()] });
    const fixture = TestBed.createComponent(SearchInputComponent);
    const component = fixture.componentInstance;
    component.labelKey = 'healthConnect.patient.search';
    component.debounceMs = 20;
    const search = jest.fn();
    component.searchChange.subscribe(search);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'Ada';
    input.dispatchEvent(new Event('input'));
    tick(19);
    expect(search).not.toHaveBeenCalled();
    tick(1);
    expect(search).toHaveBeenCalledWith('Ada');
    expect(input.getAttribute('type')).toBe('search');
  }));

  it('exposes icon button activation and disabled state', () => {
    TestBed.configureTestingModule({ imports: [IconButtonComponent, TranslateModule.forRoot()] });
    const fixture = TestBed.createComponent(IconButtonComponent);
    const component = fixture.componentInstance;
    component.labelKey = 'healthConnect.actions.close';
    component.icon = '×';
    const activate = jest.fn();
    component.activate.subscribe(activate);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    expect(activate).toHaveBeenCalledTimes(1);
    component.disabled = true;
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
  });

  it('emits text input and textarea values while honoring read-only input', () => {
    TestBed.configureTestingModule({ imports: [TextInputComponent, TranslateModule.forRoot()] });
    const fixture = TestBed.createComponent(TextInputComponent);
    const component = fixture.componentInstance;
    component.labelKey = 'healthConnect.case.symptoms';
    component.multiline = true;
    component.readOnly = true;
    const valueChange = jest.fn();
    component.valueChange.subscribe(valueChange);
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Updated';
    textarea.dispatchEvent(new Event('input'));
    expect(textarea.readOnly).toBe(true);
    expect(valueChange).toHaveBeenCalledWith('Updated');
  });

  it('emits checkbox selection changes and supports disabled options', () => {
    TestBed.configureTestingModule({ imports: [CheckboxListComponent, TranslateModule.forRoot()] });
    const fixture = TestBed.createComponent(CheckboxListComponent);
    const component = fixture.componentInstance;
    component.labelKey = 'healthConnect.case.recommendations';
    component.options = [
      { id: 'one', labelKey: 'healthConnect.stats.open' },
      { id: 'two', labelKey: 'healthConnect.stats.closed', disabled: true },
    ];
    const change = jest.fn();
    component.checkedIdsChange.subscribe(change);
    fixture.detectChanges();

    const inputs = fixture.nativeElement.querySelectorAll('input');
    (inputs[0] as HTMLInputElement).click();
    expect(change).toHaveBeenCalledWith(['one']);
    expect((inputs[1] as HTMLInputElement).disabled).toBe(true);
  });

  it('validates upload type and size at the UI boundary', () => {
    TestBed.configureTestingModule({ imports: [FileUploadTriggerComponent, TranslateModule.forRoot()] });
    const fixture: ComponentFixture<FileUploadTriggerComponent> = TestBed.createComponent(FileUploadTriggerComponent);
    const component = fixture.componentInstance;
    component.labelKey = 'healthConnect.actions.upload';
    component.acceptedTypes = ['application/pdf'];
    component.maximumBytes = 10;
    const selected = jest.fn();
    const invalid = jest.fn();
    component.filesSelected.subscribe(selected);
    component.invalidFiles.subscribe(invalid);
    fixture.detectChanges();

    const accepted = new File(['pdf'], 'report.pdf', { type: 'application/pdf' });
    const rejected = new File(['too big invalid'], 'report.txt', { type: 'text/plain' });
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [accepted, rejected] });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(selected).toHaveBeenCalledWith([accepted]);
    expect(invalid).toHaveBeenCalledWith([rejected]);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('opens a semantic context menu, handles selection, and closes on Escape', () => {
    TestBed.configureTestingModule({ imports: [ContextMenuComponent, TranslateModule.forRoot()] });
    const fixture = TestBed.createComponent(ContextMenuComponent);
    const component = fixture.componentInstance;
    component.labelKey = 'healthConnect.table.actions';
    component.actions = [{ id: 'view', labelKey: 'healthConnect.actions.view' }];
    const selected = jest.fn();
    component.actionSelected.subscribe(selected);
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="menu"]')).not.toBeNull();
    (fixture.nativeElement.querySelector('[role="menuitem"]') as HTMLButtonElement).click();
    expect(selected).toHaveBeenCalledWith('view');
    expect(component.open()).toBe(false);
    toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component.open()).toBe(false);
  });
});
