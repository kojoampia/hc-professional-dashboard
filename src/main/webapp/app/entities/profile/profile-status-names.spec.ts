import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { LANGUAGES } from 'app/config/language.constants';

import { PROFILE_STATUS_VALUES } from './model';

/**
 * That every `ProfileStatus` value has a label in every catalogue, and that no catalogue labels one
 * the server can no longer send — T9's instance of the `shift-names.spec.ts` idiom, and the gate the
 * long comment on `ProfileStatus` in `./model.ts` deferred until something rendered the field.
 *
 * <p>The read view's header renders `profile.status` through
 * `healthConnect.profile.detail.profileStatus.*` (`profile.md:118-121`), and nothing else relates the
 * 23-value Java enum to the four catalogues: ngx-translate prints a missing key mid-screen and throws
 * nothing, and a retired value leaves a label that reads perfectly and translates a status nothing
 * will ever send again.
 *
 * <p><b>The expectation is derived, never listed.</b> Values come from {@link PROFILE_STATUS_VALUES},
 * locales from `LANGUAGES` — so adding a value to the mirror fails this spec in all four locales until
 * the catalogues carry it, with nobody editing this file. The link still made by hand is
 * `PROFILE_STATUS_VALUES` against `api/domain/enumeration/ProfileStatus.java`, which `web/` cannot
 * read; the constant's own comment names it.
 */
const I18N_ROOT = resolve(__dirname, '../../../i18n');

/** The locales this app ships, minus the generator needle in the constant. */
const LOCALES = LANGUAGES.filter(language => !language.startsWith('jhipster-needle'));

const labelsFor = (locale: string): Record<string, string> => {
  const catalogue = JSON.parse(readFileSync(join(I18N_ROOT, locale, 'healthConnect.json'), 'utf8')) as {
    healthConnect: { profile: { detail: { profileStatus: Record<string, string> } } };
  };
  return catalogue.healthConnect.profile.detail.profileStatus;
};

describe('profile status names', () => {
  it.each(LOCALES)('should give every profile status a non-empty label in %s', locale => {
    const labels = labelsFor(locale);
    for (const status of PROFILE_STATUS_VALUES) {
      expect(labels[status]).toBeTruthy();
    }
  });

  it.each(LOCALES)('should label nothing in %s that the model does not carry', locale => {
    const known = new Set<string>(PROFILE_STATUS_VALUES);
    const strays = Object.keys(labelsFor(locale)).filter(status => !known.has(status));
    expect(strays).toEqual([]);
  });
});
