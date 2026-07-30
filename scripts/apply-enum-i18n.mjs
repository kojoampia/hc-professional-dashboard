#!/usr/bin/env node
/**
 * Gives the generated enum i18n files human-readable labels.
 *
 * JHipster emits enum translation files whose values echo the constant, so the
 * UI would render "GHANACARD" and "URGENT". It does this in every locale, so
 * there is nothing to copy from. Re-run after any generation:
 *
 *   node scripts/apply-enum-i18n.mjs
 *
 * Idempotent. Only keys listed here are touched; anything the generator adds
 * later is left alone until it is added below.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const I18N = 'src/main/webapp/i18n';
const LOCALES = ['en', 'es', 'fr', 'de'];

const LABELS = {
  'patientService-caseStatus.json': [
    'CaseStatus',
    {
      URGENT: { en: 'Urgent', es: 'Urgente', fr: 'Urgent', de: 'Dringend' },
      OPEN: { en: 'Open', es: 'Abierto', fr: 'Ouvert', de: 'Offen' },
      CLOSED: { en: 'Closed', es: 'Cerrado', fr: 'Fermé', de: 'Geschlossen' },
    },
  ],
  'patientService-patientSex.json': [
    'PatientSex',
    {
      FEMALE: { en: 'Female', es: 'Femenino', fr: 'Féminin', de: 'Weiblich' },
      MALE: { en: 'Male', es: 'Masculino', fr: 'Masculin', de: 'Männlich' },
      UNSPECIFIED: { en: 'Unspecified', es: 'No especificado', fr: 'Non spécifié', de: 'Nicht angegeben' },
    },
  ],
  'professionalService-dutyShiftStatus.json': [
    'DutyShiftStatus',
    {
      UPCOMING: { en: 'Upcoming', es: 'Próximo', fr: 'À venir', de: 'Bevorstehend' },
      ACTIVE: { en: 'Active', es: 'Activo', fr: 'Actif', de: 'Aktiv' },
      COMPLETED: { en: 'Completed', es: 'Completado', fr: 'Terminé', de: 'Abgeschlossen' },
    },
  ],
  'professionalService-documentType.json': [
    'DocumentType',
    {
      PASSPORT: { en: 'Passport', es: 'Pasaporte', fr: 'Passeport', de: 'Reisepass' },
      CERTIFICATE: { en: 'Certificate', es: 'Certificado', fr: 'Certificat', de: 'Zertifikat' },
      LICENSE: { en: 'Licence', es: 'Licencia', fr: 'Licence', de: 'Lizenz' },
      GHANACARD: { en: 'Ghana Card', es: 'Tarjeta de Ghana', fr: 'Carte du Ghana', de: 'Ghana-Karte' },
      PASSPHOTO: { en: 'Passport photo', es: 'Foto de pasaporte', fr: 'Photo d’identité', de: 'Passfoto' },
      DRIVERLICENSE: { en: 'Driving licence', es: 'Permiso de conducir', fr: 'Permis de conduire', de: 'Führerschein' },
      VOTERCARD: { en: 'Voter card', es: 'Tarjeta de votante', fr: 'Carte d’électeur', de: 'Wählerausweis' },
      NHIS: { en: 'NHIS card', es: 'Tarjeta NHIS', fr: 'Carte NHIS', de: 'NHIS-Karte' },
      OTHER: { en: 'Other', es: 'Otro', fr: 'Autre', de: 'Andere' },
    },
  ],
};

let touched = 0;
for (const [file, [enumName, values]] of Object.entries(LABELS)) {
  for (const locale of LOCALES) {
    const path = join(I18N, locale, file);
    if (!existsSync(path)) continue;
    const doc = JSON.parse(readFileSync(path, 'utf8'));
    const block = doc.professionalDashboardApp?.[enumName];
    if (!block) continue;
    let changed = false;
    for (const [key, perLocale] of Object.entries(values)) {
      if (key in block && block[key] !== perLocale[locale]) {
        block[key] = perLocale[locale];
        changed = true;
      }
    }
    if (changed) {
      writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);
      touched++;
    }
  }
}
console.log(`enum-i18n: labelled ${touched} files`);
