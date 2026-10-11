import { AVATAR_ACCEPT, AVATAR_CONTENT_TYPE, DecodeImage, MAX_AVATAR_EDGE, avatarTargetSize, prepareAvatar } from './avatar-image';

/**
 * ⚠ **jsdom has neither `createImageBitmap` nor a real image decoder**, which is why `prepareAvatar`
 * takes its decode as a parameter. This stub reports the dimensions of an image that was never
 * decoded, and everything after the decode — the arithmetic, the canvas, the encode — is the code
 * that ships. A spec that skipped the canvas path would leave the branch deciding whether an
 * applicant meets a 400 untested.
 */
const decodeAs =
  (width: number, height: number): DecodeImage =>
  () =>
    Promise.resolve({ width, height } as unknown as ImageBitmap);

/** jsdom's canvas has no 2d context, so the one call `prepareAvatar` makes on it is stubbed. */
interface StubContext {
  fillStyle: string;
  fillRect: jest.Mock;
  drawImage: jest.Mock;
}

const stubCanvas = (): { context: StubContext; toDataURL: jest.Mock; canvas: HTMLCanvasElement } => {
  const context: StubContext = { fillStyle: '', fillRect: jest.fn(), drawImage: jest.fn() };
  const toDataURL = jest.fn().mockReturnValue('data:image/jpeg;base64,QUJD');
  const canvas = { width: 0, height: 0, getContext: () => context, toDataURL } as unknown as HTMLCanvasElement;
  jest.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLElement);
  return { context, toDataURL, canvas };
};

describe('avatarTargetSize', () => {
  it('should cap the longest edge at the stored render edge, keeping the aspect ratio', () => {
    expect(avatarTargetSize(4032, 3024)).toEqual({ width: MAX_AVATAR_EDGE, height: 768 });
    expect(avatarTargetSize(3024, 4032)).toEqual({ width: 768, height: MAX_AVATAR_EDGE });
  });

  /** Never scaled up: enlarging adds bytes and no information, and the server keeps what it gets. */
  it('should leave an image already within the limit alone', () => {
    expect(avatarTargetSize(640, 480)).toEqual({ width: 640, height: 480 });
    expect(avatarTargetSize(MAX_AVATAR_EDGE, MAX_AVATAR_EDGE)).toEqual({ width: MAX_AVATAR_EDGE, height: MAX_AVATAR_EDGE });
  });

  /** `drawImage` throws on a zero dimension, which a 1-pixel-tall panorama would otherwise produce. */
  it('should never round a dimension down to zero', () => {
    const target = avatarTargetSize(20000, 1);

    expect(target.width).toBe(MAX_AVATAR_EDGE);
    expect(target.height).toBe(1);
  });

  it('should not divide by zero for an empty image', () => {
    expect(avatarTargetSize(0, 0)).toEqual({ width: 0, height: 0 });
  });
});

describe('prepareAvatar', () => {
  afterEach(() => jest.restoreAllMocks());

  /**
   * ⭐ **The downscale path, exercised against a phone-sized original.** 4032×3024 is a mainstream
   * 12-megapixel frame — the exact image `api/MAX_PIXELS`'s note says a 12 Mpx bound would have
   * wrongly refused — and it must leave the browser at 1024 on its longest edge.
   */
  it('should downscale a large photograph to the render edge before encoding', async () => {
    const { canvas, toDataURL } = stubCanvas();

    const prepared = await prepareAvatar(new Blob(), decodeAs(4032, 3024));

    expect(canvas.width).toBe(MAX_AVATAR_EDGE);
    expect(canvas.height).toBe(768);
    expect(prepared.width).toBe(MAX_AVATAR_EDGE);
    expect(prepared.height).toBe(768);
    expect(toDataURL).toHaveBeenCalledWith(AVATAR_CONTENT_TYPE, expect.any(Number));
  });

  /** The base64 payload only — the server's `byte[] data` binds that, not a data URL. */
  it('should return the base64 payload without the data-URL prefix', async () => {
    stubCanvas();

    const prepared = await prepareAvatar(new Blob(), decodeAs(100, 100));

    expect(prepared.data).toBe('QUJD');
    expect(prepared.data).not.toContain('base64,');
    expect(prepared.dataContentType).toBe(AVATAR_CONTENT_TYPE);
  });

  /**
   * ⛔ JPEG has no alpha, so a transparent PNG would composite to **black** without this. White
   * matches the surfaces an avatar renders on, and the fill must happen before the draw.
   */
  it('should fill the canvas white before drawing, so a transparent source does not go black', async () => {
    const { context } = stubCanvas();

    await prepareAvatar(new Blob(), decodeAs(200, 200));

    expect(context.fillStyle).toBe('#ffffff');
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 200, 200);
    expect(context.fillRect.mock.invocationCallOrder[0]).toBeLessThan(context.drawImage.mock.invocationCallOrder[0]);
  });

  /** An `ImageBitmap` holds decoded pixels until closed — a 16 Mpx one is 64 MB of them. */
  it('should close the decoded bitmap when the decode produced one', async () => {
    stubCanvas();
    const close = jest.fn();
    const decode: DecodeImage = () => Promise.resolve({ width: 50, height: 50, close } as unknown as ImageBitmap);

    await prepareAvatar(new Blob(), decode);

    expect(close).toHaveBeenCalled();
  });

  /** Rejects rather than resolving with nothing — the caller says so in its own words. */
  it('should reject when the bytes cannot be decoded', async () => {
    const decode: DecodeImage = () => Promise.reject(new DOMException('', 'InvalidStateError'));

    await expect(prepareAvatar(new Blob(), decode)).rejects.toBeInstanceOf(DOMException);
  });
});

describe('AVATAR_ACCEPT', () => {
  /**
   * ⚠ Narrower than the credential picker's, which also takes PDF: a PDF is a credential scan and is
   * not an avatar, and `api/`'s `AVATAR_TYPES` refuses one. WebP is deliberately absent — it would
   * need new magic bytes server-side and no client in the estate produces one.
   */
  it('should offer only the two image types the server accepts for an avatar', () => {
    expect(AVATAR_ACCEPT.split(',')).toEqual(['image/jpeg', 'image/png']);
    expect(AVATAR_ACCEPT).not.toContain('pdf');
  });
});
