#!/usr/bin/env bash
# Regenerates the entity layer from the JDL and applies every repair this repo needs.
#
#   ./scripts/regenerate-entities.sh
#
# Generated JHipster code has never compiled against this repo as-emitted (see
# professional-web.md § 4 and refactor-plan.md). This script is the whole
# workflow; running the generator without it leaves the build broken.
#
# Verify afterwards with ALL of these — `tsc` alone is not sufficient, because
# unrouted entity files are unreachable from main.ts and are never type-checked:
#
#   npx tsc -p tsconfig.app.json --noEmit
#   npm run lint
#   npx ng build --configuration development   # the only gate that checks templates
#   npx ng test
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> 1/4 clearing the generated entity trees"
rm -rf src/main/webapp/app/entities/patientService \
       src/main/webapp/app/entities/professionalService \
       src/main/webapp/app/entities/enumerations

echo "==> 2/4 applying the JDL"
jhipster jdl professional-service.jdl patient-service.jdl --skip-install --force

echo "==> 3/4 repairing generated code"
node scripts/postprocess-generated-entities.mjs
node scripts/apply-enum-i18n.mjs

echo "==> 4/4 dropping the generated user-management route"
# The generator adds a route for ./admin/user-management, a module this repo
# deleted long ago; leaving it in fails the build on a missing lazy import.
node --input-type=module -e "
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/main/webapp/app/entities/entity.routes.ts';
const before = readFileSync(p, 'utf8');
const after = before.replace(
  /  \{\n    path: 'user-management',\n[\s\S]*?\n  \},\n/,
  '',
);
if (after !== before) writeFileSync(p, after);
console.log('   routes registered:', (after.match(/path: '/g) ?? []).length);
"

echo
echo "Done. Now run the four verification commands listed at the top of this script."
