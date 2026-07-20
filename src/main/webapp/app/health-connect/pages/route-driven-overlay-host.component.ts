import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'hpd-route-driven-overlay-host',
  imports: [RouterOutlet, TranslateModule],
  template: `
    <section class="hpd-route-overlay" role="dialog" aria-modal="true" [attr.aria-label]="titleKey | translate">
      <div class="hpd-surface p-4">
        <button #closeButton class="hpd-focusable btn btn-outline-secondary" type="button" (click)="close()">
          {{ 'healthConnect.actions.close' | translate }}
        </button>
        <router-outlet />
      </div>
    </section>
  `,
  styles: `
    .hpd-route-overlay {
      position: fixed;
      z-index: 1040;
      inset: 0;
      display: grid;
      place-items: start center;
      overflow: auto;
      padding: 2rem 1rem;
      background: rgb(11 15 26 / 60%);
    }
    .hpd-route-overlay > div {
      width: min(100%, var(--hpd-content-max-width));
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RouteDrivenOverlayHostComponent implements AfterViewInit {
  @ViewChild('closeButton') closeButton?: ElementRef<HTMLButtonElement>;
  @Input({ required: true }) titleKey!: string;
  @Input({ required: true }) closeUrl!: string;

  constructor(private readonly router: Router) {}

  ngAfterViewInit(): void {
    this.closeButton?.nativeElement.focus();
  }

  close(): void {
    void this.router.navigateByUrl(this.closeUrl);
  }
}
