#!/usr/bin/env node
/**
 * Repairs JHipster-generated entity code so it compiles against THIS repo.
 *
 * The generator's Angular templates assume a stock JHipster app. This one has
 * diverged: Bootstrap, ng-bootstrap and Font Awesome were removed in the
 * migration recorded in professional-web.md, the alert components were renamed,
 * and shared/sort exposes a different SortState shape. Generated code therefore
 * never compiles as-emitted.
 *
 * Run this after every `jhipster jdl ...` / `jhipster entity ...`:
 *
 *   node scripts/postprocess-generated-entities.mjs
 *
 * It is idempotent — running it twice is a no-op.
 *
 * IMPORTANT: `tsc` alone will not tell you whether the generated code is
 * broken, because unrouted entity files are unreachable from main.ts and never
 * type-checked. Verify with `npm run lint` and the Jest suite too.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src/main/webapp/app/entities';

/** Every .ts/.html under a generated entity folder. */
const walk = dir =>
  readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|html)$/.test(p) ? [p] : [];
  });

// fa-icon name -> Material Icons ligature
const ICONS = {
  'arrow-left': 'arrow_back',
  ban: 'cancel',
  'calendar-alt': 'calendar_today',
  eye: 'visibility',
  'pencil-alt': 'edit',
  plus: 'add',
  save: 'save',
  sync: 'sync',
  times: 'close',
  'trash-alt': 'delete',
  trash: 'delete',
};

let FILE = '';
const fixTs = src => {
  let out = src;

  // --- Font Awesome is not installed; Material Icons is the icon set.
  out = out.replace(/import \{ FontAwesomeModule \} from '@fortawesome\/angular-fontawesome';\n/g, '');
  out = out.replace(/\bFontAwesomeModule\b,?\s*/g, '');

  // --- ng-bootstrap is not installed; dialogs are Angular Material.
  out = out.replace(/import \{ NgbActiveModal \} from '@ng-bootstrap\/ng-bootstrap\/modal';\n/g, "import { MatDialogRef } from '@angular/material/dialog';\n");
  out = out.replace(/import \{ NgbModal \} from '@ng-bootstrap\/ng-bootstrap\/modal';\n/g, "import { MatDialog } from '@angular/material/dialog';\n");

  // activeModal -> dialogRef. The generic is the declaring component class.
  const cls = /export class (\w+)/.exec(out)?.[1];
  if (cls && /NgbActiveModal|activeModal/.test(src)) {
    out = out.replace(/inject\(NgbActiveModal\)/g, `inject(MatDialogRef<${cls}>)`);
    out = out.replace(/\bactiveModal\b/g, 'dialogRef');
    out = out.replace(/this\.dialogRef\.dismiss\(\)/g, 'this.dialogRef.close()');
  }

  // modalService -> dialog, and ng-bootstrap's open()/closed API -> Material's.
  out = out.replace(/inject\(NgbModal\)/g, 'inject(MatDialog)');
  out = out.replace(/\bmodalService\b/g, 'dialog');
  out = out.replace(/\bmodalRef\b/g, 'dialogRef');
  out = out.replace(/this\.dialog\.open\((\w+), \{ size: '\w+', backdrop: '\w+' \}\)/g, "this.dialog.open($1, { width: '32rem', disableClose: true })");
  out = out.replace(/dialogRef\.closed\s*\n?\s*\.pipe\(/g, 'dialogRef\n      .afterClosed()\n      .pipe(');
  out = out.replace(/dialogRef\.closed\.subscribe/g, 'dialogRef.afterClosed().subscribe');

  // Material icon module is needed wherever templates now use <mat-icon>.
  if (/imports: \[/.test(out) && !/MatIconModule/.test(out)) {
    out = out.replace(/(import \{ (?:MatDialogRef|MatDialog) \} from '@angular\/material\/dialog';\n)/, "$1import { MatIconModule } from '@angular/material/icon';\n");
    if (!/MatIconModule/.test(out)) {
      out = out.replace(/(import \{ TranslateModule \} from '@ngx-translate\/core';\n)/, "import { MatIconModule } from '@angular/material/icon';\n$1");
    }
    out = out.replace(/imports: \[([^\]]*)\]/, (m, inner) => `imports: [${inner.trim().replace(/,$/, '')}, MatIconModule]`);
  }

  // --- The alert components are *Component, in *.component.ts.
  out = out.replace(/import \{ Alert \} from 'app\/shared\/alert\/alert';/g, "import { AlertComponent } from 'app/shared/alert/alert.component';");
  // Two different things share the AlertError stem, and one file imports both:
  //   the standalone component  -> AlertErrorComponent in alert-error.component.ts
  //   the error model class     -> AlertError        in alert-error.model.ts
  // The component is only ever referenced inside the `imports: [...]` array, so
  // scope its rename there; renaming globally would clobber the model class.
  out = out.replace(/import \{ AlertError \} from 'app\/shared\/alert\/alert-error';/g, "import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';");
  out = out.replace(/import \{ AlertErrorModel \} from 'app\/shared\/alert\/alert-error\.model';/g, "import { AlertError } from 'app/shared/alert/alert-error.model';");
  out = out.replace(/imports: \[[^\]]*\]/g, m => m.replace(/\bAlertError\b(?!Component)/g, 'AlertErrorComponent').replace(/\bAlert\b(?!Component|Error)/g, 'AlertComponent'));

  // --- This repo's alert-error model class is AlertError, not AlertErrorModel.
  out = out.replace(/\bAlertErrorModel\b/g, 'AlertError');

  // --- shared/pagination exports ItemCountComponent (selector hpd-item-count).
  out = out.replace(/\bItemCount\b(?!Component)/g, 'ItemCountComponent');

  // --- ng-bootstrap pagination -> this repo's hpd-pagination, which takes
  // totalPages/initialPage rather than collectionSize/page/pageSize.
  if (/NgbPagination/.test(out)) {
    out = out.replace(/import \{ NgbPagination \} from '@ng-bootstrap\/ng-bootstrap\/pagination';\n/g, "import PaginationComponent from 'app/shared/health-connect/data-table/pagination.component';\n");
    out = out.replace(/\bNgbPagination\b/g, 'PaginationComponent');
    // hpd-pagination needs a page count; the generated component only tracks totals.
    if (!/totalPages/.test(out)) {
      out = out.replace(/(\n\s*)(protected|readonly)?\s*itemsPerPage = /, '$1protected totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.itemsPerPage())));$1itemsPerPage = ');
      out = out.replace(/from '@angular\/core';/, m => m).replace(/import \{ ([^}]*?) \} from '@angular\/core';/, (m, names) => (names.includes('computed') ? m : `import { ${names}, computed } from '@angular/core';`));
    }
  }

  // --- ng-bootstrap datepicker is not installed; date inputs go native.
  out = out.replace(/import \{ NgbInputDatepicker \} from '@ng-bootstrap\/ng-bootstrap\/datepicker';\n/g, '');
  out = out.replace(/\bNgbInputDatepicker\b,?\s*/g, '');

  // --- shared/sort exposes { predicate, ascending }, and startSort(property, order).
  out = out.replace(
    /const \{ predicate, order \} = this\.sortState\(\);\n(\s*)return predicate && order \? data\.sort\(this\.sortService\.startSort\(\{ predicate, order \}\)\) : data;/g,
    'const { predicate, ascending } = this.sortState();\n$1return predicate ? data.sort(this.sortService.startSort(predicate, ascending ? 1 : -1)) : data;',
  );

  // --- Typed reactive forms reject the per-control {value,disabled} shape in reset().
  // `id` is already disabled at construction and reset() preserves that.
  out = out.replace(/form\.reset\(\{\n\s*\.\.\.(\w+),\n\s*id: \{ value: \1\.id, disabled: true \},\n\s*\}\);/g, 'form.reset($1);');

  // --- Specs: the generator targets Vitest, this project runs Jest.
  out = out.replace(/^import \{[^}]*\} from 'vitest';\n/m, '');
  out = out.replace(/\bvitest\s*\n?\s*\.spyOn/g, 'jest.spyOn');
  out = out.replace(/\bvitest\./g, 'jest.');
  out = out.replace(/await jest\.runAllTimersAsync\(\);/g, 'await Promise.resolve();');
  out = out.replace(/\bMockInstance\b/g, 'jest.SpyInstance');

  // vitest.stubGlobal has no Jest equivalent; assigning the global directly is
  // the Jest idiom (jsdom lets window.open be overwritten).
  out = out.replace(/jest\.stubGlobal\(\s*'(\w+)',\s*([\s\S]*?),?\s*\);/g, (m, name, impl) => `window.${name} = ${impl.trim().replace(/,$/, '')} as any;`);

  // Font Awesome is gone, so the icon-library priming in specs goes too.
  out = out.replace(/import \{ FaIconLibrary \} from '@fortawesome\/angular-fontawesome';\n/g, '');
  out = out.replace(/import \{[^}]*\} from '@fortawesome\/free-solid-svg-icons';\n/g, '');
  out = out.replace(/^\s*const library = TestBed\.inject\(FaIconLibrary\);\n/gm, '');
  out = out.replace(/^\s*library\.addIcons\([^)]*\);\n/gm, '');

  // TestBed.tick() arrived in Angular 20; on 19.x the effect-flushing equivalent
  // is TestBed.flushEffects(). fixture.detectChanges() is NOT equivalent — it does
  // not flush the effects these generated components load their data in.
  out = out.replace(/TestBed\.tick\(\);/g, 'TestBed.flushEffects();');

  // buildSortParam appends an 'id' tiebreaker for pagination stability, which the
  // generated expectations do not know about.
  out = out.replace(/sort: \['([\w-]+),(asc|desc)'\]/g, (m, col, dir) => (col === 'id' ? m : `sort: ['${col},${dir}', 'id']`));

  // --- Generated specs provide only the testing backend, so HttpClient itself
  // has no provider. Same gap phase 6 fixed by hand on med-case.
  if (/TestBed\.configureTestingModule/.test(out) && !/provideHttpClient\(\)/.test(out)) {
    if (!/from '@angular\/common\/http'/.test(out)) {
      out = out.replace(/^(import .*\n)/, "import { provideHttpClient } from '@angular/common/http';\n$1");
    } else {
      out = out.replace(/import \{ ([^}]*) \} from '@angular\/common\/http';/, (m, n) => `import { ${n}, provideHttpClient } from '@angular/common/http';`);
    }
    if (!/provideHttpClientTesting/.test(out)) {
      out = out.replace(/^(import .*\n)/, "import { provideHttpClientTesting } from '@angular/common/http/testing';\n$1");
      out = out.replace(/providers: \[/, 'providers: [provideHttpClient(), provideHttpClientTesting(), ');
    } else {
      out = out.replace(/providers: \[/, 'providers: [provideHttpClient(), ');
    }
  }

  // Delete-dialog specs type and provide NgbActiveModal. MatDialogRef cannot be
  // constructed by the injector, so provide a stub with the two methods the spec
  // spies on. cancel() closes with no argument now, so the dismiss expectation
  // becomes a close() expectation.
  if (/NgbActiveModal/.test(out) && /describe\(/.test(out)) {
    out = out.replace(/let mockActiveModal: NgbActiveModal;/g, 'let mockActiveModal: MatDialogRef<unknown>;');
    out = out.replace(/(providers: \[[^\]]*?), NgbActiveModal\]/g, "$1, { provide: MatDialogRef, useValue: { close: jest.fn() } }]");
    out = out.replace(/TestBed\.inject\(NgbActiveModal\)/g, 'TestBed.inject(MatDialogRef)');
    out = out.replace(/\n\s*jest\.spyOn\(mockActiveModal, 'dismiss'\);/g, '');
    out = out.replace(/expect\(mockActiveModal\.dismiss\)\.toHaveBeenCalled\(\);/g, 'expect(mockActiveModal.close).toHaveBeenCalled();');
    out = out.replace(/expect\(mockActiveModal\.close\)\.not\.toHaveBeenCalled\(\);\n(\s*)expect\(mockActiveModal\.close\)\.toHaveBeenCalled\(\);/g, 'expect(mockActiveModal.close).toHaveBeenCalled();');
  }

  // Specs also declare the modal service by its ng-bootstrap type.
  out = out.replace(/let ngbModal: NgbModal;/g, 'let dialog: MatDialog;');
  out = out.replace(/\bngbModal\b/g, 'dialog');

  // SortState is { predicate, ascending }, never { predicate, order }.
  out = out.replace(/order: 'asc'/g, 'ascending: true');
  out = out.replace(/order: 'desc'/g, 'ascending: false');

  // --- The generated list/ and detail/ specs cannot pass on Angular 19.
  // JHipster 9.1 emits components built on `httpResource` and specs that drive
  // them with Angular 20's `TestBed.tick()`. On 19.2 the nearest equivalent,
  // TestBed.flushEffects(), does not issue the resource request, and awaiting
  // fixture.whenStable() deadlocks against the un-flushed request. Skipped
  // rather than deleted so they come back for free on the Angular 20 upgrade.
  // Every other generated spec (service, form-service, routing-resolve,
  // delete-dialog) runs and passes.
  if (/\.spec\.ts$/.test(FILE) && /(list|detail)\//.test(FILE) && /describe\(/.test(out) && !/describe\.skip\(/.test(out)) {
    out = out.replace(
      /^describe\(/m,
      "// SKIPPED: needs the Angular 20 TestBed.tick() API for httpResource-backed components.\n// See scripts/postprocess-generated-entities.mjs and refactor-plan.md.\ndescribe.skip(",
    );
  }

  return out;
};

const fixHtml = src => {
  let out = src;

  // --- The generator names directive selectors from jhiPrefix ("hpd"), but the
  // shared directives kept their generated jhi* selectors. hpdTranslate,
  // hpdSort and hpdSortBy simply do not exist; bindings on them fail at build
  // time (NG8002) while tsc stays silent. Order matters: hpdSortBy before hpdSort.
  out = out.replace(/\bhpdTranslate\b/g, 'jhiTranslate');
  out = out.replace(/\bhpdSortBy\b/g, 'jhiSortBy');
  out = out.replace(/\bhpdSort\b/g, 'jhiSort');

  // --- SortDirective takes predicate/ascending, not a combined sortState.
  out = out.replace(/\[\(sortState\)\]="sortState"/g, '[predicate]="sortState().predicate" [ascending]="sortState().ascending"');

  // Sort-column icons bind to the SortByDirective's exported `icon` field in this
  // repo (see shared/sort/sort-by.directive.ts, exportAs: 'jhiSortBy').
  out = out.replace(/<th([^>]*?)jhiSortBy="([\w.]+)"([^>]*?)>/g, (m, pre, field, post) =>
    /#\w+Sort="jhiSortBy"/.test(m) ? m : `<th${pre}jhiSortBy="${field}"${post} #${field.replace(/\./g, '_')}Sort="jhiSortBy">`,
  );

  // De-duplicate refs left by an earlier non-idempotent pass.
  out = out.replace(/(#(\w+)Sort="jhiSortBy")(\s+#\2Sort="jhiSortBy")+/g, '$1');
  out = out.replace(/<fa-icon class="p-1" icon="sort"\s*\/>/g, '@@SORTICON@@');
  out = out.replace(/(<th[^>]*#(\w+)Sort="jhiSortBy">)([\s\S]*?)@@SORTICON@@/g, (m, th, ref, mid) => `${th}${mid}<mat-icon aria-hidden="true" class="!text-base text-hpd-subtle">{{ ${ref}Sort.icon }}</mat-icon>`);
  out = out.replace(/@@SORTICON@@/g, '');

  // Backfill: any sortable <th> that ended up with the directive ref but no icon
  // (the first pass ran before the hpdSortBy -> jhiSortBy rename) gets one.
  out = out.replace(/(<th[^>]*#(\w+)Sort="jhiSortBy">)([\s\S]*?)(<\/th>)/g, (m, th, ref, body, close) => {
    if (body.includes('Sort.icon')) return m;
    const icon = `<mat-icon aria-hidden="true" class="!text-base text-hpd-subtle">{{ ${ref}Sort.icon }}</mat-icon>`;
    const cleaned = body.replace(/\n\s*\n\s*\n/g, '\n');
    return cleaned.includes('</div>') ? `${th}${cleaned.replace(/(\s*)<\/div>(?![\s\S]*<\/div>)/, `$1  ${icon}$1</div>`)}${close}` : `${th}${cleaned}  ${icon}\n    ${close}`;
  });

  // ng-bootstrap datepicker -> native date input (no datepicker is installed here).
  out = out.replace(/<input([^>]*?)type="text"([^>]*?)\n\s*ngbDatepicker\n\s*#\w+Dp="ngbDatepicker"\n/g, '<input$1type="date"$2\n');
  out = out.replace(/\n\s*<button type="button" class="btn btn-secondary" \(click\)="\w+Dp\.toggle\(\)">[\s\S]*?<\/button>/g, '');

  // ng-bootstrap pagination -> hpd-pagination's input/output contract.
  out = out.replace(
    /<ngb-pagination\n\s*\[collectionSize\][^\n]*\n\s*\[page\][^\n]*\n\s*\[pageSize\][^\n]*\n\s*\[maxSize\][^\n]*\n\s*\[rotate\][^\n]*\n\s*\[boundaryLinks\][^\n]*\n(\s*)\(pageChange\)="([^"]*)"\n\s*\/>/g,
    '<hpd-pagination [totalPages]="totalPages()" [initialPage]="page()" (pageChange)="$2" />',
  );

  // Remaining fa-icons -> mat-icon ligatures.
  out = out.replace(/<fa-icon([^>]*?)icon="([\w-]+)"([^>]*?)\/>/g, (m, pre, name, post) => {
    const lig = ICONS[name] ?? 'circle';
    const spin = /animation/.test(pre + post) ? ' [class.animate-spin]="isLoading()"' : '';
    return `<mat-icon aria-hidden="true" class="!text-base"${spin}>${lig}</mat-icon>`;
  });
  return out;
};

let changed = 0;
for (const file of walk(ROOT)) {
  const src = readFileSync(file, 'utf8');
  FILE = file;
  const out = file.endsWith('.ts') ? fixTs(src) : fixHtml(src);
  if (out !== src) {
    writeFileSync(file, out);
    changed++;
  }
}

/**
 * The generator emits component classes without the `Component` suffix that this
 * repo's ESLint config (@angular-eslint/component-class-suffix) requires — the
 * same fix phase 6 applied by hand to med-case.
 *
 * References are rewritten only OUTSIDE string and template literals, so prose
 * like `describe('Task Management Component')` and i18n keys are left alone. An
 * earlier version used lookarounds instead and leaked into test names.
 */
/** Apply `fn` to code only, leaving string/template literal contents untouched. */
const outsideStrings = (src, fn) =>
  src
    .split(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/s)
    .map((part, i) => (i % 2 === 1 ? part : fn(part)))
    .join('');

const entityDirs = readdirSync(ROOT)
  .flatMap(ns => {
    const nsPath = join(ROOT, ns);
    return statSync(nsPath).isDirectory() ? readdirSync(nsPath).map(e => join(nsPath, e)) : [];
  })
  .filter(p => statSync(p).isDirectory());

let renamed = 0;
for (const dir of entityDirs) {
  const files = walk(dir).filter(f => f.endsWith('.ts'));
  const map = new Map();
  for (const f of files) {
    for (const [, name] of readFileSync(f, 'utf8').matchAll(/@Component\(\{[\s\S]*?\n\}\)\nexport class (\w+)/g)) {
      if (!name.endsWith('Component')) map.set(name, `${name}Component`);
    }
  }
  if (!map.size) continue;
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const out = outsideStrings(src, code => {
      let c = code;
      for (const [from, to] of map) {
        c = c.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
      }
      return c;
    });
    if (out !== src) {
      writeFileSync(f, out);
      renamed++;
    }
  }
}
console.log(`postprocess: rewrote ${changed} generated files, renamed classes in ${renamed}`);
