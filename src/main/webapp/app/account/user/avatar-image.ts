/**
 * Turning a chosen file into the two values `POST /api/personal-document/avatar` takes —
 * `backlog.md` row 232's client half.
 *
 * <h2>Why the browser re-encodes at all, rather than posting the file</h2>
 *
 * <p>Three reasons, and the first two are the server's own, recorded on
 * `OwnPersonalDocumentResource`:
 *
 * <ul>
 *   <li><b>The ceilings.</b> 2 MB on the decoded avatar, **16 megapixels on the decoded raster** —
 *       the rung a header can lie about, where *"691 bytes can reach it"* — and nginx at roughly
 *       6 MB of raw body. A modern phone's 48 Mpx original is refused outright and a 3–8 MB
 *       photograph is refused by the 2 MB rung. Downscaling first means the applicant does not meet
 *       a 400 for choosing the obvious file.</li>
 *   <li><b>⛔ EXIF orientation.</b> The server strips metadata on purpose — *"a clinician's home
 *       address arriving inside their avatar is the discovery this decision pre-empts"* — and the
 *       orientation flag goes with the GPS coordinates. A portrait phone photograph whose pixels are
 *       landscape plus `Orientation=6` would therefore arrive, be stripped, and be **stored
 *       sideways**. So the rotation has to be *baked into the pixels* before upload, which is what
 *       this does and what nothing server-side can do once the flag is gone.</li>
 *   <li><b>Re-encoding is not size-preserving.</b> `api/` measured a PNG re-encode amplifying 5.1×,
 *       and it re-checks its own output against the 2 MB ceiling, so an upload that passed on arrival
 *       can still be refused. Sending something already small and already JPEG keeps that margin
 *       wide.</li>
 * </ul>
 *
 * <h2>⚠ Always JPEG, and the white fill that goes with it</h2>
 *
 * <p>`AVATAR_TYPES` server-side is `{image/png, image/jpeg}` and either would be accepted, but this
 * encodes **JPEG unconditionally** rather than preserving the chosen format. The reason is the
 * amplification above: a photograph re-encoded as PNG at 1024 px can exceed 2 MB and be refused,
 * where JPEG at quality {@link JPEG_QUALITY} lands in the low hundreds of kilobytes for the same
 * image. An avatar is a photograph rendered into a circle tens of pixels across, so the trade costs
 * nothing visible.
 *
 * <p>⚠ **JPEG has no alpha, so the canvas is filled white first.** Without it a transparent PNG's
 * background composites to **black**, which is a surprising outcome for someone who uploaded a
 * cut-out portrait. White matches the surfaces an avatar renders on.
 */

/** The longest edge of the uploaded image, matching `api/`'s `AVATAR_RENDER_EDGE`. */
export const MAX_AVATAR_EDGE = 1024;

/**
 * ⚠ **Deliberately equal to the server's own downscale target, not smaller.** `api/` downscales to
 * 1024 as well, so an image already at or below it passes through that step unchanged; sending 512
 * would merely throw away pixels the server was willing to keep. Sending *more* is what this
 * constant exists to prevent.
 */

/** Quality for the JPEG encode. 0.85 is the usual "no visible artefacts at this size" setting. */
const JPEG_QUALITY = 0.85;

/** The one content type this produces. A subset of the server's `AVATAR_TYPES`. */
export const AVATAR_CONTENT_TYPE = 'image/jpeg';

/**
 * What the file picker offers. ⚠ **Narrower than the credential picker's**: no PDF, because a PDF is
 * a credential scan and is not an avatar, and the server's `AVATAR_TYPES` refuses one.
 */
export const AVATAR_ACCEPT = 'image/jpeg,image/png';

export interface PreparedAvatar {
  /** Base64, without the `data:` prefix a data URL carries — what the server's `byte[] data` binds. */
  data: string;
  dataContentType: string;
  /** The stored dimensions, so a caller can say what it did. */
  width: number;
  height: number;
}

/**
 * How the bytes are decoded — injectable so the canvas path can be exercised without a browser.
 *
 * <p>⚠ **jsdom has neither `createImageBitmap` nor a real `HTMLImageElement` decoder**, so a spec
 * cannot reach {@link prepareAvatar}'s arithmetic through the default path at all. Rather than
 * leaving the downscale untested — the branch that decides whether an applicant meets a 400 — the
 * decode is a parameter with a production default. The spec passes a stub reporting the dimensions
 * of a large image; everything after the decode is the code that ships.
 */
export type DecodeImage = (file: Blob) => Promise<ImageBitmap | HTMLImageElement>;

/**
 * The production decode.
 *
 * <p>⭐ **`imageOrientation: 'from-image'` is the whole point of preferring `createImageBitmap`.** It
 * applies the EXIF orientation during decode, so the bitmap's pixels are already the right way up and
 * `drawImage` bakes that in. The `HTMLImageElement` fallback is for browsers without the option
 * (Safari before 16.4); ⚠ **it relies on the element honouring EXIF itself**, which current browsers
 * do by default (`image-orientation: from-image`) and older ones did not — so on a browser old enough
 * to take this branch a sideways avatar is possible. Recorded rather than worked around: the
 * alternative is parsing EXIF by hand in the browser for a field whose worst failure is a rotated
 * photograph the clinician can replace.
 */
export const decodeImage: DecodeImage = async (file: Blob) => {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' });
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      // Not a sentence: it never reaches a screen. The caller turns a rejection into a translated
      // toast, and untranslated-literals.spec.ts rightly cannot tell a thrown message from a caption.
      image.onerror = () => reject(new DOMException('', 'InvalidStateError'));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
};

/** The intrinsic size of either decode result. `ImageBitmap` and `HTMLImageElement` differ in name. */
function sizeOf(source: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  const width = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const height = 'naturalHeight' in source ? source.naturalHeight : source.height;
  return { width, height };
}

/**
 * The target dimensions: the longest edge capped at {@link MAX_AVATAR_EDGE}, aspect ratio kept.
 *
 * <p>⚠ **Never scaled up.** An image already smaller is re-encoded at its own size — enlarging it
 * would add bytes and no information. `Math.round` with a floor of 1 so a one-pixel-tall panorama
 * cannot produce a zero-height canvas, which `drawImage` throws on.
 */
export function avatarTargetSize(width: number, height: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= MAX_AVATAR_EDGE || longest === 0) {
    return { width, height };
  }
  const scale = MAX_AVATAR_EDGE / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Decodes, downscales, bakes the orientation, re-encodes as JPEG and returns base64.
 *
 * <p>Rejects when the bytes cannot be decoded as an image or the canvas is unavailable. ⚠ **A
 * rejection here is not the server's refusal**: this is "your browser could not read that file",
 * which the caller reports as its own message rather than as an upload failure.
 */
export async function prepareAvatar(file: Blob, decode: DecodeImage = decodeImage): Promise<PreparedAvatar> {
  const source = await decode(file);
  const { width, height } = sizeOf(source);
  const target = avatarTargetSize(width, height);

  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;
  const context = canvas.getContext('2d');
  if (!context) {
    // See the note on decodeImage's onerror: deliberately not a sentence.
    throw new DOMException('', 'NotSupportedError');
  }
  // Before the draw: JPEG has no alpha, so a transparent source would composite to black.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, target.width, target.height);
  context.drawImage(source as CanvasImageSource, 0, 0, target.width, target.height);
  if ('close' in source) {
    // An ImageBitmap holds decoded pixels until it is closed; a 16 Mpx one is 64 MB.
    source.close();
  }

  const dataUrl = canvas.toDataURL(AVATAR_CONTENT_TYPE, JPEG_QUALITY);
  return {
    // `data:<mime>;base64,<payload>` — everything after the comma is the payload, and the comma
    // cannot appear in base64 itself. Same slice `onboarding-api.service.ts`'s base64Of does.
    data: dataUrl.slice(dataUrl.indexOf(',') + 1),
    dataContentType: AVATAR_CONTENT_TYPE,
    width: target.width,
    height: target.height,
  };
}
