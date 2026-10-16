import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { SKIP_ERROR_ALERT } from 'app/core/interceptor/error-handler.interceptor';
import { AvatarDocumentDto, OnboardingDocumentDto, OnboardingDocumentType } from 'app/health-connect/api/onboarding-api.service';

/**
 * The caller's own personal documents — step 3's endpoint (`profile.md:214-242`,
 * `api/personal-document`), the applicant's half of the surface, split out of
 * `OnboardingApiService` by T6.
 *
 * <h2>The applicant's verbs and nothing else</h2>
 *
 * <p>House rule: *"do not reinstate the full JHipster CRUD surface for an endpoint that needs two
 * methods."* The reviewer's half — `verify`, `reject`, and the loud {@code documentContent} the
 * review detail page reads — stays on
 * {@link app/health-connect/api/onboarding-api.service!OnboardingApiService}, the admin surface's
 * client. {@link content} here and `documentContent` there call one endpoint on purpose: the
 * applicant's read is silent (a preview with a placeholder), the reviewer's is loud (the bytes are
 * the task), and the split is the same one `ProfileService` records for `api/profile`.
 *
 * <p>The wire types stay in `onboarding-api.service.ts` rather than moving here, for the reason
 * `entities/application/model.ts` gives about its own alias: both halves of the surface speak them,
 * and a parallel interface per consumer would be a second wire type for one endpoint.
 */
@Injectable({ providedIn: 'root' })
export class PersonalDocumentService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  /** `profile.md` § Other Elements: *"`api/onboarding/document` should migrate to `api/personal-document`"*. */
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/personal-document', 'professionalservice');

  /** The caller's own documents, archived rows included — `isLiveDocument` is what tells them apart. */
  query(): Observable<OnboardingDocumentDto[]> {
    return this.http.get<OnboardingDocumentDto[]>(this.resourceUrl);
  }

  /**
   * Uploads a credential.
   *
   * <p>`supersedesDocumentId` names one of the caller's own live documents that this one replaces,
   * and it is the only thing that archives a row (backlog.md item 20). The server does not infer the
   * replacement, because it cannot: a renewed certificate and a second, different certificate are the
   * same request. Sending nothing simply adds a document.
   *
   * <p>⚠ **A JSON body with `data` base64-encoded, which is `profile.md`'s specified
   * `PersonalDocument` shape** (step 3, T2). Two things follow and neither is cosmetic. The file has
   * to be read in the browser before the request can be built, so this returns a promise-backed
   * observable rather than firing immediately — a 5 MB scan takes a moment to read and the caller
   * must not treat "the observable exists" as "the upload started". And base64 is 4/3 of the file,
   * so a 5 MB document — the server's own ceiling — becomes roughly 6.7 MB of request, against
   * nginx's 8 MB cap: anything past ~6 MB of document is refused by nginx with a bare 413 rather
   * than by the service with a message.
   */
  create(
    file: File,
    type: OnboardingDocumentType,
    options: { otherLabel?: string; expiryDate?: string; supersedesDocumentId?: string } = {},
  ): Observable<OnboardingDocumentDto> {
    return from(base64Of(file)).pipe(
      switchMap(data =>
        this.http.post<OnboardingDocumentDto>(this.resourceUrl, {
          name: file.name,
          type,
          data,
          dataContentType: file.type,
          otherLabel: options.otherLabel ?? null,
          expiryDate: options.expiryDate ?? null,
          supersedesDocumentId: options.supersedesDocumentId ?? null,
        }),
      ),
    );
  }

  /**
   * The document's bytes, as a blob a caller turns into an object URL — never a bare `<img src>`,
   * because this path is behind `assertOwnerOrReviewer` and needs the `Authorization` header.
   *
   * <p>`silent` opts the request out of the global error banner, for a caller that has a visible
   * fallback of its own: the read view's preview column renders its placeholder on a failed read,
   * and a page fetching one blob per document row would otherwise stack one banner per failure.
   */
  content(id: string, options: { silent?: boolean } = {}): Observable<Blob> {
    return this.http.get(`${this.resourceUrl}/${encodeURIComponent(id)}/content`, {
      responseType: 'blob',
      context: new HttpContext().set(SKIP_ERROR_ALERT, options.silent === true),
    });
  }

  /**
   * Replaces the caller's profile photograph — `POST /api/personal-document/avatar` (`backlog.md`
   * row 232), step 1's fourth field.
   *
   * <h2>Two components on the wire, and `type` is not one of them</h2>
   *
   * <p>The handler stores `PersonalDocumentType.AVATAR` and nothing else, so a `type` on the
   * wire would be a field the server must ignore — the deny-list shape `api/`'s own `AvatarUpload`
   * javadoc argues against. `name` is likewise absent and derived from the content type. The generic
   * {@link create} **refuses** `AVATAR` and names this path, which is why the two are separate
   * methods rather than one with a conditional.
   *
   * <p>⚠ **The data is already processed when it arrives here.** `prepareAvatar` in
   * `app/account/user/avatar-image.ts` downscales, bakes the EXIF orientation and re-encodes before
   * this is called — so this method takes base64 and a content type rather than a `File`, unlike
   * {@link create}, which reads the file itself. A credential scan must reach the server
   * byte-for-byte; an avatar must not.
   *
   * <p>⚠ **The caller must write `imageUrl` next**, and immediately: this returns a document id, and
   * `User.imageUrl` on the gateway is where the path to it lives. {@link avatarContentPath} builds
   * the value; render it defensively — a failure between the two writes leaves `imageUrl` naming a
   * document that no longer exists.
   */
  createAvatar(data: string, dataContentType: string): Observable<AvatarDocumentDto> {
    return this.http.post<AvatarDocumentDto>(`${this.resourceUrl}/avatar`, { data, dataContentType });
  }

  /**
   * The value to write to `User.imageUrl` for an avatar document id.
   *
   * <p>⛔ **The path, not the id, and `api/` is explicit about which:** *"the client builds
   * `<base>/api/personal-document/{id}/content` itself and writes it to `User.imageUrl` … No URL
   * field is invented here; a second spelling of a path the client already has to know is a second
   * thing to keep in step."* Built from the same {@link resourceUrl} every other call here uses, so
   * there is one spelling.
   *
   * <p>⚠ **It is not usable as a bare `<img src>`.** `GET …/{id}/content` is behind
   * `assertOwnerOrReviewer` and needs the `Authorization` header, so a plain `src` gets a 401 and a
   * broken image. `AccountAvatarComponent` fetches it as an authenticated blob; that is the only
   * correct renderer in this repository.
   *
   * <p>⚠ `@Size(max = 256)` on the gateway field. This value is around 75 characters with the
   * microservice prefix, so there is room — but a longer endpoint prefix would eat it.
   */
  avatarContentPath(documentId: string): string {
    return `${this.resourceUrl}/${encodeURIComponent(documentId)}/content`;
  }
}

/**
 * The file's bytes as base64, without the `data:` prefix a data URL carries.
 *
 * <p>`FileReader.readAsDataURL` rather than `file.arrayBuffer()` plus `btoa`: the latter needs a
 * binary string built one character at a time, which blows the call stack on a multi-megabyte file
 * when written the obvious way (`String.fromCharCode(...bytes)`). The reader does the encoding
 * natively and in one pass.
 */
function base64Of(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    // `reader.error` is a DOMException and is what a caller wants; the fallback is only for the
    // case the File API allows but does not describe, and it is deliberately NOT a sentence — this
    // never reaches a screen, and `untranslated-literals.spec.ts` rightly cannot tell a thrown
    // message from a caption. `NotReadableError` is the File API's own name for this failure.
    reader.onerror = () => reject(reader.error ?? new DOMException('', 'NotReadableError'));
    reader.onload = () => {
      const result = reader.result as string;
      // `data:<mime>;base64,<payload>` — everything after the comma is the payload, and the comma
      // cannot appear in base64 itself.
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
}
