import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';

import ShellComponent from './shell.component';

/**
 * The portal frame's own state: the mobile drawer and the desktop icon rail.
 *
 * <p>They look like one feature and are two, which is the thing most worth pinning here — sharing
 * state between them would mean opening the drawer on a phone silently narrowed the sidebar for
 * that account's next desktop session.
 */
describe('Shell Component', () => {
  let comp: ShellComponent;
  let fixture: ComponentFixture<ShellComponent>;

  const build = (): void => {
    fixture = TestBed.createComponent(ShellComponent);
    comp = fixture.componentInstance;
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ShellComponent, RouterTestingModule.withRoutes([]), TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .overrideTemplate(ShellComponent, '')
      .compileComponents();
    build();
  });

  afterEach(() => localStorage.clear());

  it('starts expanded when nothing has been remembered', () => {
    comp.ngOnInit();

    expect(comp.sidebarCollapsed).toBe(false);
  });

  it('collapses and expands on each toggle', () => {
    comp.ngOnInit();

    comp.toggleSidebarCollapsed();
    expect(comp.sidebarCollapsed).toBe(true);

    comp.toggleSidebarCollapsed();
    expect(comp.sidebarCollapsed).toBe(false);
  });

  /** A preference that resets on every navigation is not a preference. */
  it('remembers the collapsed rail across a reload', () => {
    comp.ngOnInit();
    comp.toggleSidebarCollapsed();

    build();
    comp.ngOnInit();

    expect(comp.sidebarCollapsed).toBe(true);
  });

  it('remembers being expanded again, rather than only remembering collapse', () => {
    comp.ngOnInit();
    comp.toggleSidebarCollapsed();
    comp.toggleSidebarCollapsed();

    build();
    comp.ngOnInit();

    expect(comp.sidebarCollapsed).toBe(false);
  });

  /**
   * The two controls are independent. The drawer is a temporary overlay on a small screen; the rail
   * is a persistent preference on a large one.
   */
  it('keeps the mobile drawer and the desktop rail apart', () => {
    comp.ngOnInit();

    comp.toggleSidebar();
    expect(comp.sidebarOpen).toBe(true);
    expect(comp.sidebarCollapsed).toBe(false);
    expect(localStorage.getItem('hpd-sidebar-collapsed')).toBeNull();

    comp.toggleSidebarCollapsed();
    expect(comp.sidebarOpen).toBe(true);
    expect(comp.sidebarCollapsed).toBe(true);
  });

  it('closes the drawer on Escape without touching the rail', () => {
    comp.ngOnInit();
    comp.toggleSidebar();
    comp.toggleSidebarCollapsed();

    comp.onEscape();

    expect(comp.sidebarOpen).toBe(false);
    expect(comp.sidebarCollapsed).toBe(true);
  });
});
