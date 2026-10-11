import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { signal } from '@angular/core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { OnboardingProgressDto, OnboardingSteps } from 'app/health-connect/api/onboarding-api.service';
import { OnboardingProgressService } from 'app/onboarding/onboarding-progress.service';
import { OnboardingStreamState } from 'app/onboarding/onboarding-progress-stream.service';

import CompletionMeterComponent from './completion-meter.component';

/**
 * `profile.md`'s four coarse steps, as rendered — `backlog.md` row 230, unit B.
 *
 * <p>⭐ **Each step is flipped on its own, and that is the whole design of this file.** An aggregate
 * *"renders the four steps"* assertion is satisfied by an implementation that reads one boolean and
 * hardcodes three, which is exactly the mistake a four-element template is prone to. So there is one
 * case per step, each asserting that **that** step moved **and the other three did not**.
 */
describe('Completion Meter Component', () => {
  let comp: CompletionMeterComponent;
  let fixture: ComponentFixture<CompletionMeterComponent>;
  let progress: ReturnType<typeof signal<OnboardingProgressDto | null>>;
  let streamState: ReturnType<typeof signal<OnboardingStreamState>>;

  const steps = (overrides: Partial<OnboardingSteps> = {}): OnboardingSteps => ({
    account: false,
    profile: false,
    documents: false,
    consent: false,
    ...overrides,
  });

  const meter = (overrides: Partial<OnboardingProgressDto> = {}): OnboardingProgressDto => ({
    percent: 44,
    complete: false,
    status: 'APPLICATION_STARTED',
    requirements: [{ key: 'license', done: false }],
    steps: steps(),
    ...overrides,
  });

  /** The rendered steps as `{ key: done }`, which is what makes a one-step assertion readable. */
  const doneByKey = (): Record<string, boolean> =>
    comp.steps().reduce<Record<string, boolean>>((acc, step) => ({ ...acc, [step.key]: step.done }), {});

  beforeEach(async () => {
    progress = signal<OnboardingProgressDto | null>(null);
    streamState = signal<OnboardingStreamState>('idle');

    await TestBed.configureTestingModule({
      imports: [CompletionMeterComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: OnboardingProgressService,
          useValue: { progress: progress.asReadonly(), streamState: streamState.asReadonly() },
        },
      ],
    })
      .overrideTemplate(CompletionMeterComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(CompletionMeterComponent);
    comp = fixture.componentInstance;
  });

  it('should render the four steps in profile.md order', () => {
    progress.set(meter());

    expect(comp.steps().map(step => step.key)).toEqual(['account', 'profile', 'documents', 'consent']);
  });

  /**
   * ⚠ Step 4 is `consent` on the wire and the `application` tab in the UI, and the other three names
   * match their tabs. That mapping is the one thing a reader is likely to think is a mistake, so it is
   * asserted rather than left to be rediscovered.
   */
  it('should point each step at the tab it is completed on', () => {
    progress.set(meter());

    expect(comp.steps().map(step => step.tab)).toEqual(['account', 'clinical', 'documents', 'application']);
  });

  it('should mark step 1 done, and only step 1, when the account step is complete', () => {
    progress.set(meter({ steps: steps({ account: true }) }));

    expect(doneByKey()).toEqual({ account: true, profile: false, documents: false, consent: false });
  });

  it('should mark step 2 done, and only step 2, when the profile step is complete', () => {
    progress.set(meter({ steps: steps({ profile: true }) }));

    expect(doneByKey()).toEqual({ account: false, profile: true, documents: false, consent: false });
  });

  it('should mark step 3 done, and only step 3, when the documents step is complete', () => {
    progress.set(meter({ steps: steps({ documents: true }) }));

    expect(doneByKey()).toEqual({ account: false, profile: false, documents: true, consent: false });
  });

  it('should mark step 4 done, and only step 4, when the consent step is complete', () => {
    progress.set(meter({ steps: steps({ consent: true }) }));

    expect(doneByKey()).toEqual({ account: false, profile: false, documents: false, consent: true });
  });

  /**
   * ⚠ **`steps.account` reads `false` for every seeded clinician on quality and that is correct** —
   * three independent reasons (`backlog.md` rows 232, 233, 234). This asserts the reading is rendered
   * faithfully rather than compensated for: nothing gates on it, and a client that "helpfully" inferred
   * a tick would be inventing a verdict the server declined to give.
   */
  it('should render the real shape measured on quality, with step 1 absent', () => {
    progress.set(meter({ percent: 89, steps: steps({ documents: true, consent: true }) }));

    expect(doneByKey()).toEqual({ account: false, profile: false, documents: true, consent: true });
  });

  /**
   * ⛔ A meter whose `steps` object is missing must not throw. `mobile/` and any older client read the
   * same endpoint, and a response shaped by a service that predates unit A is a real possibility during
   * a rolling deploy — the window in which exactly one of the two containers has been replaced.
   */
  it('should treat an absent steps object as four incomplete steps', () => {
    progress.set({ percent: 10, complete: false, status: null, requirements: [] } as unknown as OnboardingProgressDto);

    expect(doneByKey()).toEqual({ account: false, profile: false, documents: false, consent: false });
  });

  it('should render nothing until the meter has loaded', () => {
    expect(comp.progressService.progress()).toBeNull();
    expect(comp.steps().every(step => !step.done)).toBe(true);
  });

  /** The ordinal is what shows in place of a tick, so an unfinished step still reads as "step 3". */
  it('should number the steps from one', () => {
    progress.set(meter());

    expect(comp.steps().map(step => step.ordinal)).toEqual([1, 2, 3, 4]);
  });
});

/**
 * ⭐ **The markup, rendered, against the real English catalogue** — added after review.
 *
 * <p>⛔ **The nine cases above assert the `steps()` computed and nothing else**, because the suite
 * overrides the template to `''` per this repository's spec harness. That proves `STEPS.map` reads the
 * right key per step — which a `map` could hardly get wrong — while leaving a whole class of defect
 * invisible: a `@for` that rendered `steps()[0]` four times, a tile bound to the wrong `labelKey`, or
 * **`jhiTranslate` lost so the raw key renders mid-screen**. This estate has shipped that last one, and
 * ngx-translate does not fail on a missing key; it prints the key.
 *
 * <p>So this block renders for real. It loads `i18n/en/healthConnect.json` from disk rather than
 * stubbing translations, so a key that does not exist in the shipped catalogue renders as itself and
 * fails here.
 */
describe('Completion Meter Component — rendered', () => {
  let fixture: ComponentFixture<CompletionMeterComponent>;
  let progress: ReturnType<typeof signal<OnboardingProgressDto | null>>;
  let streamState: ReturnType<typeof signal<OnboardingStreamState>>;

  /** The shipped English catalogue, so the assertions below are about real labels. */
  const english = JSON.parse(readFileSync(resolve(__dirname, '../../../i18n/en/healthConnect.json'), 'utf8')) as Record<string, unknown>;

  const completion = (english as { healthConnect: { profile: { completion: Record<string, any> } } }).healthConnect.profile.completion;

  const steps = (overrides: Partial<OnboardingSteps> = {}): OnboardingSteps => ({
    account: false,
    profile: false,
    documents: false,
    consent: false,
    ...overrides,
  });

  const meter = (overrides: Partial<OnboardingProgressDto> = {}): OnboardingProgressDto => ({
    percent: 50,
    complete: false,
    status: 'APPLICATION_STARTED',
    requirements: [{ key: 'nextOfKin', done: false }],
    steps: steps(),
    ...overrides,
  });

  const tile = (key: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-cy="step-${key}"]`);

  beforeEach(async () => {
    progress = signal<OnboardingProgressDto | null>(null);
    streamState = signal<OnboardingStreamState>('idle');

    await TestBed.configureTestingModule({
      imports: [CompletionMeterComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: OnboardingProgressService,
          useValue: { progress: progress.asReadonly(), streamState: streamState.asReadonly() },
        },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', english);
    translate.use('en');

    fixture = TestBed.createComponent(CompletionMeterComponent);
  });

  /**
   * ⭐ **Four tiles, four distinct translated labels** — the case that catches a `@for` rendering one
   * step four times, and a tile bound to its neighbour's label.
   */
  it('should render four step tiles carrying the four translated step labels', () => {
    progress.set(meter());
    fixture.detectChanges();

    const tiles = fixture.nativeElement.querySelectorAll('[data-cy="completionSteps"] li');
    expect(tiles).toHaveLength(4);

    const rendered = Array.from(tiles as NodeListOf<HTMLElement>).map(node => node.textContent?.replace(/\s+/g, ' ').trim());
    for (const key of ['account', 'profile', 'documents', 'consent'] as const) {
      expect(rendered.filter(text => text?.includes(completion.steps[key] as string))).toHaveLength(1);
    }
  });

  /**
   * ⛔ **No raw translation key reaches the screen.** ngx-translate renders a missing key *as itself*
   * with nothing thrown and nothing logged, so a lost `jhiTranslate` or a typo'd key looks perfect in
   * the English build and shows `healthConnect.profile.completion.steps.account` on every locale.
   */
  it('should render no raw translation keys', () => {
    progress.set(meter({ percent: 89, steps: steps({ documents: true, consent: true }) }));
    streamState.set('stalled');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('healthConnect.');
  });

  /** The tick state reaches the DOM per tile, not merely the computed. */
  it('should mark exactly the completed tiles done in the markup', () => {
    progress.set(meter({ steps: steps({ documents: true }) }));
    fixture.detectChanges();

    expect(tile('documents')!.getAttribute('data-done')).toBe('true');
    for (const key of ['account', 'profile', 'consent']) {
      expect(tile(key)!.getAttribute('data-done')).toBe('false');
    }
    expect(tile('documents')!.textContent).toContain('✓');
    // An unfinished tile shows its ordinal in place of a tick, so it still reads as "step 2".
    expect(tile('profile')!.textContent).toContain('2');
  });

  /** The reconnecting note is the only thing that distinguishes a stalled push on screen. */
  it('should show the reconnecting note only while stalled', () => {
    progress.set(meter());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-cy="streamStalled"]')).toBeNull();

    streamState.set('stalled');
    fixture.detectChanges();

    const note = fixture.nativeElement.querySelector('[data-cy="streamStalled"]');
    expect(note).not.toBeNull();
    expect(note.textContent.trim()).toBe(completion.liveReconnecting);
  });

  /** Nothing renders at all before the first authoritative read resolves. */
  it('should render no section until the meter has loaded', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-cy="completionSteps"]')).toBeNull();
  });
});
