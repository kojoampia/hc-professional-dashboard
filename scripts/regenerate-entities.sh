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

echo "==> 1/5 clearing the generated entity trees"
rm -rf src/main/webapp/app/entities/patientService \
       src/main/webapp/app/entities/professionalService \
       src/main/webapp/app/entities/enumerations

echo "==> 2/5 applying the JDL"
jhipster jdl professional-service.jdl patient-service.jdl --skip-install --force

echo "==> 3/5 repairing generated code"
node scripts/postprocess-generated-entities.mjs
node scripts/restyle-generated-entities.mjs
node scripts/apply-enum-i18n.mjs

echo "==> 4/5 dropping the generated user-management route"
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


echo "==> 5/5 moving the generated duty-roster CRUD aside"
# `/duty-roster` belongs to the hand-built clinician page (see professional-web.md
# "Duty roster: routing and the dashboard bootstrap"). The generator emits `duty-roster`, which
# collides with it and — because the generated list calls the admin-only collection — 403s for
# every clinician. Renaming the route is not enough: the generated templates link absolutely, so
# their `['/duty-roster', ...]` links have to move with it or the CRUD's own view/edit buttons
# land on the clinician page.
node --input-type=module -e "
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const routes = 'src/main/webapp/app/entities/entity.routes.ts';
const before = readFileSync(routes, 'utf8');
const after = before.replace(\"path: 'duty-roster',\", \"path: 'entities/duty-roster',\");
if (after !== before) writeFileSync(routes, after);
console.log('   duty-roster route:', after.includes(\"'entities/duty-roster'\") ? 'moved' : 'ALREADY MOVED OR MISSING');

const walk = dir => readdirSync(dir).flatMap(name => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? walk(full) : [full];
});
let links = 0;
for (const file of walk('src/main/webapp/app/entities').filter(f => f.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes(\"'/duty-roster'\")) continue;
  links += html.split(\"'/duty-roster'\").length - 1;
  writeFileSync(file, html.replaceAll(\"'/duty-roster'\", \"'/entities/duty-roster'\"));
}
console.log('   absolute links rewritten:', links);
"

echo
echo "Done. Now run the four verification commands listed at the top of this script."
