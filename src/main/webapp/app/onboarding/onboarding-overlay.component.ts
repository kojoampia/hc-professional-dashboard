import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

/**
 * The onboarding wizard's overlay shell — `profile.md:162`, `backlog.md` row 247.
 *
 * <h2>⛔ It has no Close button, no Print button and no Escape handler, and that is the whole reason
 * it exists</h2>
 *
 * <p>The four panes were hosted by {@code RouteDrivenOverlayHostComponent}, the shell the patient
 * record and the case detail use, and it brings a Close and a Print control with it because those
 * are the right affordances **for a record somebody is reading**. `profile.md:162` rules both out
 * for the wizard in as many words: *"The dialog panel cannot be closed or printed."* The owner named
 * this file as the replacement rather than asking for a flag on that one, and the reasoning survives
 * the decision: a host that renders chrome conditionally is a host where the condition can be got
 * wrong, and the two surfaces disagree about more than two buttons.
 *
 * <p>⚠ **A removed control is not a closed door, and row 250 is what shuts it.** Browser Back still
 * leaves a pane, the four routes still resolve on a deep link, and nothing here prevents an
 * applicant typing `/dashboard` — row 248's note says as much: *"row 250 is what makes Close
 * meaningless rather than merely hidden; this row only removes the control surface."* ⛔ So do not
 * read the absence of a close button as the gate, and do not delete whatever row 250 builds on the
 * strength of it. What this component removes is the portal's own offer to abandon onboarding.
 *
 * <h2>What it keeps, and why each one is deliberate</h2>
 *
 * <p>The dialog semantics stay whole: `role="dialog"`, `aria-modal`, a label wired to the heading,
 * the focus trap, and focus restored to whatever opened the overlay on destroy. ⚠ **Removing the
 * chrome must not remove the accessibility** — a modal that traps focus is the reason a screen
 * reader treats the page behind it as inert, and the trap is what makes "cannot be closed" bearable
 * rather than merely enforced: a keyboard user who tabs past the last input lands back on the first
 * one instead of in an unreachable page underneath.
 *
 * <p>⭐ **Initial focus is the dialog itself**, where the shared host focuses its close button. There
 * is no close button here, and focusing the first form input instead would skip the heading that
 * says which of the four steps this is — so the container takes focus and the label is announced.
 *
 * <p>⚠ **`hpd-no-print` is absent because there is nothing to hide from a print.** The shared host
 * marks its action row so a printed record carries no buttons; this one renders no actions, and
 * `profile.md` does not ask for the pane to print well — it asks for it not to offer printing.
 * Nothing stops a browser's own Ctrl-P, and nothing is supposed to: the specification governs the
 * portal's controls, not the user agent's.
 */
@Component({
  standalone: true,
  selector: 'hpd-onboarding-overlay',
  imports: [RouterOutlet, TranslateModule],
  template: `
    <section
      #dialog
      class="hpd-route-overlay fixed inset-0 z-[1040] overflow-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hpd-onboarding-overlay-title"
      tabindex="-1"
      (keydown.tab)="trapFocus($event)"
    >
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true"></div>
      <!--
        The shared host's geometry, kept deliberately: 80% of the viewport in both directions,
        centred by the 10vh margin, with a fixed height so the header stays put and the body below
        it scrolls. Step 2 is thirty-six inputs and is the longest pane in the wizard, so the
        scrolling body is load-bearing here rather than inherited decoration.
      -->
      <div
        class="hpd-surface relative mx-auto my-[10vh] flex h-[80vh] w-[80vw] flex-col overflow-hidden rounded-hpd-lg bg-white shadow-hpd-lg"
      >
        <header class="flex flex-wrap items-center justify-between gap-2 bg-hpd-primary px-5 py-4 text-white">
          <h1 id="hpd-onboarding-overlay-title" class="m-0 text-[15px] font-extrabold tracking-tight text-white">
            {{ titleKey | translate }}
          </h1>
        </header>
        <div class="flex-1 overflow-y-auto bg-white p-6">
          <router-outlet />
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class OnboardingOverlayComponent implements AfterViewInit, OnDestroy {
  @ViewChild('dialog') dialog?: ElementRef<HTMLElement>;

  /**
   * The pane's heading, bound from the route's `data` by the router's component input binding — the
   * same way the shared host receives it, so the four route entries keep one shape.
   */
  @Input() titleKey = '';

  private activeElement: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.dialog?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.activeElement?.focus();
  }

  /** Tab and Shift-Tab wrap within the dialog. Lifted verbatim from the shared host. */
  trapFocus(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const focusable = Array.from(
      this.dialog?.nativeElement.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );
    if (!focusable.length) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (keyboardEvent.shiftKey && document.activeElement === first) {
      keyboardEvent.preventDefault();
      last.focus();
    } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
      keyboardEvent.preventDefault();
      first.focus();
    }
  }
}
