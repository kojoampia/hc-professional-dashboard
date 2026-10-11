import { ChangeDetectionStrategy, Component, Input, OnChanges, OnDestroy, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpContext } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { SKIP_ERROR_ALERT } from 'app/core/interceptor/error-handler.interceptor';

/**
 * A clinician's avatar, fetched **authenticated** and rendered from an object URL — with the initials
 * as the fallback.
 *
 * <h2>⛔ Why a component rather than an `<img src>`</h2>
 *
 * <p>`User.imageUrl` holds the path to `GET /api/personal-document/{id}/content` (`backlog.md` row
 * 232), and that endpoint is behind **`assertOwnerOrReviewer`** — the owner, or a reviewer. A gate
 * like that cannot be expressed by a static resource path, which is the reason the bytes live in
 * `api/` at all. The consequence for the browser is immediate: **a bare `<img src>` carries no
 * `Authorization` header**, so it gets a 401 and renders broken.
 *
 * <p>⚠ **The sidebar did exactly that**, at `sidebar.component.html:160,167`, and it was correct
 * while `imageUrl` was written by nothing anywhere in the estate — row 232's own measurement.
 * The moment step 1 can write one, a stored `imageUrl` would render as a broken image on every page
 * of the portal. So the sidebar renders through this component too, in the same change that makes the
 * field writable.
 *
 * <h2>The object URL is revoked, and that is not housekeeping</h2>
 *
 * <p>Every `createObjectURL` pins its blob in memory until `revokeObjectURL`. The sidebar is mounted
 * for the whole session and this component re-fetches whenever {@link imageUrl} changes — on sign-in,
 * and again after each avatar replacement — so a leak here accumulates for as long as the portal is
 * open.
 *
 * <p>⚠ **Revoked when the replacement ARRIVES, and on destroy — not when a new fetch starts.** That
 * ordering is deliberate twice over: the circle keeps showing the current photograph while the next
 * one loads instead of flashing to initials and back, and a request that is superseded or fails
 * cannot leave the component showing nothing. See {@link fetches} for the third hazard — an
 * out-of-order response — which is why there is one pipeline rather than a subscribe per change.
 *
 * <h2>Failure falls back rather than reporting</h2>
 *
 * <p>⚠ **A 404 is a reachable, ordinary state**: the avatar upload and the `PUT /api/account` that
 * records its path are two requests, and a replacement **changes the document id**, so a failure
 * between them leaves `imageUrl` naming a document that no longer exists. The honest rendering of
 * that is the initials — the same thing an account with no avatar gets — and not an error. ⛔ Showing
 * a broken-image glyph or an alert would turn a recoverable gap (upload again) into something that
 * reads as a fault.
 */
@Component({
  standalone: true,
  selector: 'hpd-account-avatar',
  imports: [TranslateModule],
  template: `
    @if (objectUrl()) {
      <img
        [src]="objectUrl()"
        [class]="imageClass"
        [attr.alt]="'healthConnect.profile.avatar.alt' | translate"
        data-cy="accountAvatarImage"
      />
    } @else {
      <!--
        The initials, aria-hidden because the name they abbreviate is rendered beside this component
        by every caller — announcing "AM" after "Ama Mensah" is noise, and this is what the sidebar
        already did. The image above is NOT hidden and carries a translated alt instead: a
        photograph is not self-describing the way two letters next to the same name are, so a reader
        who cannot see it should at least be told what the picture is.
      -->
      <span [class]="initialsClass" aria-hidden="true" data-cy="accountAvatarInitials">{{ initials }}</span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AccountAvatarComponent implements OnChanges, OnDestroy {
  /** The stored `User.imageUrl` — a content path, not a URL a browser may load unauthenticated. */
  @Input() imageUrl: string | null = null;

  /** Rendered when there is no avatar, or when fetching one failed. */
  @Input() initials = '';

  /** Tailwind classes for the two shapes, so each caller sizes its own circle. */
  @Input() imageClass = 'h-[34px] w-[34px] flex-none rounded-full object-cover';
  @Input() initialsClass =
    'grid h-[34px] w-[34px] flex-none place-items-center rounded-full bg-hpd-gold-bright text-xs font-extrabold text-hpd-primary-deep';

  private readonly http = inject(HttpClient);

  readonly objectUrl = signal<string | null>(null);
  private fetched: string | null = null;

  /** Each distinct `imageUrl` this component is asked for, in order. */
  private readonly requested = new Subject<string | null>();

  /**
   * One fetch pipeline, and **`switchMap` is doing real work here rather than being idiomatic.**
   *
   * <p>⚠ **Two defects it closes, both found in review and both only visible under a replacement.**
   * The subscribe-per-change version it replaces had no ordering: an avatar replaced twice in quick
   * succession could have the **first** response arrive last, so the circle rendered the photograph
   * the clinician had just overwritten — and the second blob's object URL was overwritten without
   * being revoked, which is a leak in the one component the sidebar keeps mounted for the whole
   * session. `switchMap` unsubscribes the previous request, which also **aborts** it, so only the
   * latest answer can arrive.
   *
   * <p>⚠ **`takeUntilDestroyed` for the other half of the same bug:** a response landing after the
   * component is gone used to call `createObjectURL` with nobody left to revoke it. `ngOnDestroy`
   * cannot help — the blob is created after it ran.
   *
   * <p>⛔ **`SKIP_ERROR_ALERT`, which is not optional on this request.** The class note calls a 404
   * here ordinary, and it is: the producing window — avatar upload succeeds, `PUT /api/account` fails
   * — is this very change's. Without the token `ErrorHandlerInterceptor` broadcasts
   * `professionalGatewayApp.httpError` and `alert-error` puts a red banner over the portal, and
   * because the **sidebar hosts this component on every page**, the ordinary outcome this component
   * is written to absorb would have become a session-wide error. The idiom is the one
   * `entities/profile/service.ts` uses for its own expected 404.
   *
   * <p>`catchError` inside the `switchMap` rather than an `error` arm outside it: an error reaching
   * the outer subscriber would terminate the pipeline, and the next avatar would never be fetched.
   */
  private readonly fetches = this.requested
    .pipe(
      switchMap(url =>
        url
          ? // Through HttpClient rather than fetch: the auth interceptor is what attaches the Bearer
            // token, and it is wired into HttpClient alone.
            this.http
              .get(url, { responseType: 'blob', context: new HttpContext().set(SKIP_ERROR_ALERT, true) })
              .pipe(catchError(() => of(null)))
          : of(null),
      ),
      takeUntilDestroyed(),
    )
    .subscribe(blob => this.adopt(blob));

  ngOnChanges(): void {
    if (this.imageUrl === this.fetched) {
      return;
    }
    this.fetched = this.imageUrl;
    // ⚠ NOT released here. The previous object URL is revoked when the replacement arrives — see
    // {@link adopt} — so the circle keeps showing the current photograph while the new one loads
    // rather than flashing to initials and back.
    this.requested.next(this.imageUrl);
  }

  ngOnDestroy(): void {
    this.release();
    this.fetches.unsubscribe();
  }

  /** Swap in the new blob, revoking whatever it replaces. Null means "render the initials". */
  private adopt(blob: Blob | null): void {
    this.release();
    if (blob) {
      this.objectUrl.set(URL.createObjectURL(blob));
    }
  }

  private release(): void {
    const url = this.objectUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.objectUrl.set(null);
    }
  }
}
