#!/usr/bin/env node
// Checks that run against the BUILT output, not the source.
//
//   node scripts/check-build-output.mjs [dist-dir]
//
// Every one of these guards a failure that compiles, tests green, and is invisible to `tsc` — which
// is the only kind worth spending a CI step on. Run after `npm run webapp:prod`.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

// TypeScript's parser, used below to read the EMITTED chunks as the JavaScript they are. A direct
// devDependency — the same compiler the build runs — not a transitive one that an npm dedupe could
// move from under this script.
import ts from 'typescript';

const dist = process.argv[2] ?? 'target/classes/static';
let failed = false;

const fail = msg => {
  console.error(`  ✗ ${msg}`);
  failed = true;
};
const pass = msg => console.log(`  ✓ ${msg}`);

if (!existsSync(dist)) {
  console.error(`no build output at ${dist} — run \`npm run webapp:prod\` first`);
  process.exit(1);
}

// ---------------------------------------------------------------- Tailwind actually ran
//
// Tailwind v4 is hand-wired into webpack/webpack.custom.js. Removing or breaking that hook does not
// fail the build: it emits a stylesheet with the handwritten CSS and none of the generated
// utilities, so every layout class in every template silently does nothing. professional-web.md
// records this going unnoticed for six phases, which is why it is checked in the artefact rather
// than trusted to an exit code.
//
// The four below are chosen to span the sources: a stock Tailwind utility, two BridgeCare tokens
// from the theme layer, and a grid class — if the pipeline half-runs, they do not all survive.
const styles = readdirSync(dist).filter(f => /^styles\..*\.css$/.test(f));
let stylesCss = null;
if (styles.length !== 1) {
  fail(`expected exactly one styles.*.css in ${dist}, found ${styles.length}`);
} else {
  stylesCss = readFileSync(join(dist, styles[0]), 'utf8');
  const missing = ['mx-auto', 'rounded-hpd', 'text-hpd-muted', 'grid-cols-3'].filter(u => !stylesCss.includes(u));
  if (missing.length) {
    fail(`Tailwind produced no utilities for: ${missing.join(', ')} — the webpack.custom.js hook is inert, see professional-web.md`);
  } else {
    pass(`Tailwind utilities present in ${styles[0]} (${Math.round(stylesCss.length / 1024)} kB)`);
  }
}

// ---------------------------------------------------------------- the policy the edge enforces
//
// The quality stack's nginx sends `script-src 'self'` and production sends no CSP at all, so
// anything the policy forbids works in production and breaks only where a policy exists — which is
// how the app came to render completely unstyled on the quality stack while every automated check
// reported 200 and the right <title>. curl neither executes scripts nor enforces CSP.
//
// Angular's inlineCritical is the specific offender: it emits
//   <link rel="stylesheet" media="print" onload="this.media='all'">
// and when that handler is blocked the sheet stays media=print and never applies.
//
// Comments are stripped first. index.html carries a commented-out Google Analytics block, and a
// naive grep for <script> reports it as a live third-party script that is not there.
const html = readFileSync(join(dist, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const violations = [
  ['inline <script> blocks', /<script(?![^>]*\ssrc=)[^>]*>/g],
  ['inline event handlers (onload=, onclick=, …)', /\son[a-z]+="[^"]*"/g],
  ['scripts from another origin', /<script[^>]*\ssrc="https?:\/\//g],
  ['stylesheets or fonts from another origin', /<link[^>]*href="https?:\/\//g],
];
let cspClean = true;
for (const [label, pattern] of violations) {
  const hits = html.match(pattern) ?? [];
  if (hits.length) {
    cspClean = false;
    fail(`index.html has ${hits.length} ${label}: ${[...new Set(hits)].slice(0, 3).join(' ')}`);
  }
}
if (cspClean) {
  pass("index.html carries nothing `default-src 'self'` would block");
}

// ---------------------------------------------------------------- nothing unservable under content/
//
// `content/` is copied wholesale into the bundle by the asset entry in angular.json, and the Sass
// sources the application compiles from live inside it. Until docs/backlog.md item 145 that entry's
// `ignore` read `["fonts/**"]` — which is not `scss/**` — so all five stylesheets were copied, and
// professional.abofonsa.com served them: measured 2026-09-17, five anonymous 200s totalling 28,802
// bytes, including the Material M3 palette derivation and the reasoning written in its comments.
//
// EVERY ASSERTION HERE IS AGAINST THE OUTPUT, NEVER AGAINST THE `ignore` GLOB, AND THAT IS THE
// WHOLE POINT. The glob was the right SHAPE — hc-admin and hc-patient use the same one — and three
// readers looked at this instance of it, one of them while writing a table about which repos were
// fixed, and all three concluded it was the fix. A check written against the config would have
// agreed with all three. (Mechanism 3 below does open angular.json, but only to learn what the
// build compiles; it never reads `ignore`, so a wrong one cannot make it pass. See its comment.)
//
// IT LISTS THE DIRECTORY rather than looking for the five `.scss` it knows about. hc-admin's
// equivalent expected eight files and found nine: the ninth was a Vitest spec living beside the
// stylesheets it reads, published as TypeScript, invisible to any rule phrased about Sass. A guard
// that enumerates what it expects finds only what somebody already thought of.
//
// THREE MECHANISMS ON THREE DIFFERENT AXES. Read them together:
//
//   1. an ALLOWLIST OF EXTENSIONS, below. Fails closed: an extension nobody listed reddens CI.
//   2. a DENYLIST OF FILENAMES, below that. Fails open: a name nobody listed passes.
//   3. a CROSS-CHECK AGAINST THE COMPILATION INPUTS, derived rather than listed. Enumerates
//      nothing, so it has no closed/open direction to get wrong.
//
// The allowlist is the primary and the denylist does not weaken it, because THEY ARE NOT THE SAME
// AXIS. Saying `.scss` is unservable is a claim about a format; saying `*.spec.*` is source is a
// claim about a name, and the second catches files whose extension is perfectly servable. Adding a
// second extension denylist WOULD be the failure this file argues against — adding a name denylist
// beside an extension allowlist composes with it.
//
// BE PRECISE ABOUT WHAT THE ALLOWLIST BUYS: it fails closed PER EXTENSION, NOT PER FILE. It cannot
// catch a build input wearing a servable extension, and one is standing in this very repository —
// `content/css/tailwind.css` is a Tailwind v4 entry point (`@import 'tailwindcss/theme'`, which
// resolves to nothing over HTTP), compiled into the bundle through angular.json's `styles` exactly
// as the five `.scss` are, and it was ALSO copied out verbatim and certified green by an earlier
// version of this check. It is now ignored by path in angular.json; `content/css/loading.css`
// beside it is genuinely runtime and index.html links it.
//
// Mechanisms 2 and 3 both exist because of that miss, and mechanism 3 is the one that covers it:
// a name denylist would only have caught it by someone writing `tailwind.css` into a list, which is
// the enumeration this whole check refuses to do.
//
// THE ALLOWLIST HOLDS ONLY WHAT IS ACTUALLY UNDER content/ TODAY, and that is the rule for editing
// it: no speculative entries. Every unused entry is silent-pass surface for a class of file nobody
// is thinking about — a `.json` nobody listed is a config file, a `.txt` is notes. Font extensions
// were here and are deliberately gone: the font check below argues that copying `content/fonts/`
// would ship a second unhashed unreferenced set, so pre-authorising `woff2` here contradicted it
// and made the `fonts/**` ignore unguarded. Adding an entry back costs four characters and a loud
// red build, which is exactly the price the allowlist argument budgets for.
const SERVABLE_EXTENSIONS = new Set(['css', 'ico', 'js', 'png', 'svg']);

// Mechanism 2. Matched against the FILENAME, so it sees what the extension lens cannot.
//
// hc-admin's ninth file transposed here is worse than it was there: jest.conf.js matches
// `src/main/webapp/app/**/*.spec.ts` only, so a `boot.spec.js` beside `content/js/boot.js` would be
// published AND never run — two silences, where hc-admin's at least executed. `.map` is here
// because a source map is the source, and the production build only happens not to emit one.
const UNSERVABLE_NAMES = [/\.spec\./, /\.test\./, /\.map$/];

// Mechanism 3. A FILE THE BUILD COMPILES MUST NOT ALSO BE SHIPPED AS SOURCE — that is the whole
// invariant this check exists for, and it can be stated without knowing a single extension or name.
//
// It DERIVES the list from angular.json's own `styles` — today five entries: four `.scss` and
// tailwind.css. Being derived, it needs no maintenance and covers entry points nobody has added
// yet, because the generator of the list is the build configuration rather than a reader.
//
// IT COVERS FIVE OF THE SIX FILES THIS ITEM WAS ABOUT, NOT ALL SIX, and the gap is the argument for
// keeping all three mechanisms. `_theme-colors.scss` is a Sass PARTIAL, pulled in by
// material-theme.scss with `@use`, so it is compiled without ever appearing in `styles` and
// mechanism 3 cannot see it. Mechanism 1 catches it on its extension. Run the negative control and
// the two lists differ by exactly that file — which is what composition looks like when it works.
//
// READING angular.json HERE IS NOT THE THING THE BACKLOG ROW WARNS AGAINST, and the difference is
// the direction. The failure was reading the config to CONCLUDE the output was fine — three readers
// looked at a plausible `ignore` and stopped. This never reads `ignore` at all: it reads the config
// only to learn what gets compiled, then asserts against the OUTPUT that none of it was also
// copied. A wrong `ignore` cannot make it pass, which is exactly what a config check could not say.
const projectStyles = (() => {
  const configPath = new URL('../angular.json', import.meta.url);
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const projects = Object.values(config.projects ?? {});
  return projects.flatMap(project => project?.architect?.build?.options?.styles ?? []);
})();
const CONTENT_INPUT = 'src/main/webapp/content/';
const compiledFromContent = projectStyles
  .filter(entry => typeof entry === 'string' && entry.startsWith(CONTENT_INPUT))
  .map(entry => entry.slice(CONTENT_INPUT.length));

const contentDir = join(dist, 'content');
if (!existsSync(contentDir)) {
  // A check that reports nothing forbidden over a directory that is not there has not checked
  // anything. Going green by finding nothing is the recurring defect in this estate.
  fail(`no ${contentDir} in the build output — the content asset entry in angular.json did not run, so this check proved nothing`);
} else {
  const entries = readdirSync(contentDir, { recursive: true, withFileTypes: true });
  const names = [];
  for (const entry of entries) {
    if (entry.isFile()) {
      names.push(relative(contentDir, join(entry.parentPath, entry.name)));
    }
  }
  const wrongExtension = [];
  const wrongName = [];
  for (const name of names) {
    const ext = extname(name).slice(1).toLowerCase();
    const base = name.slice(name.lastIndexOf('/') + 1);
    if (!SERVABLE_EXTENSIONS.has(ext)) {
      wrongExtension.push(name);
    } else if (UNSERVABLE_NAMES.some(pattern => pattern.test(base))) {
      wrongName.push(name);
    }
  }
  if (names.length === 0) {
    fail(`${contentDir} exists but is empty — the asset copy produced nothing, so this check proved nothing`);
  } else {
    if (wrongExtension.length) {
      fail(
        `${contentDir} holds ${wrongExtension.length} file(s) whose extension a browser is never meant to fetch: ` +
          `${wrongExtension.sort().join(', ')} — widen the \`ignore\` on the content asset entry in angular.json, or add the ` +
          `extension to SERVABLE_EXTENSIONS here if it really is an asset that is actually under content/`,
      );
    }
    if (wrongName.length) {
      fail(
        `${contentDir} holds ${wrongName.length} file(s) whose NAME says source rather than asset, whatever the extension says: ` +
          `${wrongName.sort().join(', ')} — widen the \`ignore\` on the content asset entry in angular.json`,
      );
    }
    // Mechanism 3, and its own vacuity guard first: if angular.json's shape ever changes under
    // this, the derivation silently yields [] and the check passes over everything. Going green by
    // finding nothing is the failure mode this estate keeps rediscovering, so refuse it here too.
    let compiledClean = true;
    if (compiledFromContent.length === 0) {
      compiledClean = false;
      fail(
        "derived no compilation inputs from angular.json's `styles` under " +
          `${CONTENT_INPUT} — the config shape changed, so mechanism 3 is checking nothing. Fix this derivation; do not let it pass by finding nothing`,
      );
    } else {
      const alsoCopied = compiledFromContent.filter(entry => names.includes(entry));
      if (alsoCopied.length) {
        compiledClean = false;
        fail(
          `${contentDir} holds ${alsoCopied.length} file(s) the build COMPILES and therefore must not also publish as source: ` +
            `${alsoCopied
              .sort()
              .join(', ')} — each is an entry in angular.json's \`styles\`; widen the \`ignore\` on the content asset entry`,
        );
      }
    }
    if (!wrongExtension.length && !wrongName.length && compiledClean) {
      pass(
        `${names.length} files under content/, none of them an unservable extension, a source filename, ` +
          `or one of the ${compiledFromContent.length} stylesheets the build compiles`,
      );
    }
  }
}

// ---------------------------------------------------------------- the fonts still resolve
//
// The `fonts/**` half of that `ignore` is NOT redundant and must stay. The three .woff2 under
// content/fonts/ do reach the output — through the stylesheet pipeline rather than the copy:
// fonts.scss is in angular.json's `styles`, so its url('../fonts/*.woff2') are resolved at build
// time and emitted at the output ROOT with content hashes, which is what styles.*.css references.
// Copying content/fonts/ as well would ship a second, unhashed, unreferenced set of the same bytes.
//
// So the three entries mean three different things: `scss/**` and `css/tailwind.css` stop something
// being published, `fonts/**` stops something being duplicated. THE IGNORE ITSELF IS GUARDED BY THE
// CHECK ABOVE, not here — font extensions are absent from SERVABLE_EXTENSIONS, so dropping
// `fonts/**` reddens naming the three .woff2 that appear under content/.
//
// What this second check asserts is the other half, and the one no ignore can give: every font the
// stylesheet names is actually in the artefact. The app self-hosts Inter and Material Icons and
// sends no request off-origin, so a url() resolving to nothing is a silent fallback to a system
// font on every page, which no build error and no 200 would report.
if (stylesCss === null) {
  // Unreachable while green: stylesCss is null only when the styles-count check above already
  // called fail(). Said out loud so a reader of a red run is not left wondering why it is missing.
  console.error('  · fonts not checked — no single styles.*.css to read them from');
} else {
  const fontUrls = [...new Set(stylesCss.match(/url\(([^)]*\.woff2?)\)/g) ?? [])];
  if (fontUrls.length === 0) {
    fail(
      `${styles[0]} references no self-hosted font at all — fonts.scss is in angular.json's \`styles\`, so this means the pipeline lost it`,
    );
  } else {
    const dangling = [];
    for (const raw of fontUrls) {
      const href = raw.slice(4, -1).replace(/^['"]|['"]$/g, '');
      if (!existsSync(join(dist, href))) {
        dangling.push(href);
      }
    }
    if (dangling.length) {
      fail(`${styles[0]} names ${dangling.length} font file(s) the build did not emit: ${dangling.join(', ')}`);
    } else {
      pass(`${fontUrls.length} self-hosted fonts referenced by ${styles[0]}, all present in ${dist}`);
    }
  }
}

// ---------------------------------------------------------------- a read state is only set by a read
//
// docs/backlog.md item 171. Item 168 took `setReadState` off the production surface, and its guards
// are honest about what they check — but both are NAME-based: they prove nothing named
// `setReadState` exists, not that the read-state signals are written only by the reads.
// `directoryRead` and `caseQueueRead` are `private readonly`, which stops the outside and stops
// reassignment, and stops NO sibling method in the same class — exactly where a new writer would be
// added. A writer that is not a read is a signal asserting something the network never said, and it
// compiles, tests green, and is invisible to tsc: this file's charter.
//
// So: every write (`.set(` or `.update(`) on those signals in the SHIPPED bundle must sit inside
// `loadAll`, the one method that performs the reads — its subscribe callbacks are lexically inside
// it, which is the point. Asserted with a real parser, not a regex: the emitted chunks are valid
// JavaScript and the production build does not mangle property or method names (measured 2026-09-24:
// `directoryRead`, `caseQueueRead` and `loadAll` all survive minification byte-for-byte), so "which
// method encloses this call" is decidable exactly. If a future toolchain DOES mangle them, the
// carrier scan below finds nothing and this check goes red, not green — blinded must not look clean.
//
// BOTH AXES ARE DERIVED, per the item's Done-when:
//   - the SIGNAL NAMES come from `RepositoryRead`'s own union of string literals
//     (`'directory' | 'caseQueue'` → `directoryRead`, `caseQueueRead` — the naming rule the class
//     itself uses), so a third read added to the type is guarded here without an edit, and a
//     derivation that yields nothing fails rather than checking nothing. Reading that source file
//     here is mechanism 3's move, not the config-trusting defect this file argues against: the
//     source is read only to learn WHAT to guard, and where the writes actually sit is asserted
//     against the output. A wrong source cannot make the artefact check pass.
//   - the WRITE SITES come from parsing the bundle, so a harmless refactor inside `loadAll` changes
//     nothing here, while a hand-list of allowed line numbers — the guard this item exists to
//     refuse — would have to be re-counted on every edit and would rot the first time nobody did.
//
// WHAT THIS DOES NOT COVER, said out loud so nobody reads it as more than it is:
//
//   - an ALIASED or DYNAMIC write — `const s = repo['directory' + 'Read']; s.set(…)` — never
//     spells `.directoryRead.set` and is invisible to any lexical check, artefact-level or
//     source-level alike. The residual guards are `private` (outside the class it takes a cast
//     written on purpose) and review. A LITERAL bracket spelling is NOT in this bucket: measured
//     2026-09-24 (backlog item 173), the production minifier normalises
//     `this['directoryRead'].set(…)` into dot notation — the planted probe shipped as
//     `this.directoryRead.set(…)` and this check went red naming its method — so only a key the
//     minifier cannot fold at build time escapes.
//   - a DEEP MUTATION — `repo.directoryState().status = 'ready'` — writes no signal at all, so
//     there is no `.set(…)` here to match: the state would change under every holder of the object
//     with this check green (backlog item 173). The guards for that live where the objects do:
//     `AsyncViewState`'s fields are `readonly`, which refuses the write at compile time in every
//     state, and every state object is frozen at construction by the one `asyncState` builder in
//     `health-connect.models.ts` (backlog item 180 — it used to be only the three shared
//     IDLE/LOADING/READY constants, leaving a stored `error`/`forbidden` state with `readonly` as
//     its only guard). So a cast that gets past the compiler throws at runtime in every state; a
//     state built WITHOUT the builder cannot arise short of hand-writing the object literal, which
//     is a review-visible shape with no remaining production instance.
//
// Likewise a sibling class declaring its OWN signals under these names is indistinct
// from the repository's to a name check; the class-identity assertion below (the `loadAll` holding
// the writes must live in the class that INITIALISES the signals) is what keeps a same-named
// `loadAll` elsewhere from satisfying this by coincidence.
{
  const WRITERS = new Set(['set', 'update']); // WritableSignal's two write methods
  const OWNING_METHOD = 'loadAll';

  // Axis one: which signals are read states. Derived from `RepositoryRead` — the union item 168's
  // own spec derives its axes from — never hand-listed here.
  const readsSource = new URL('../src/main/webapp/app/health-connect/health-connect.repository.ts', import.meta.url);
  const signalNames = (() => {
    let text;
    try {
      text = readFileSync(readsSource, 'utf8');
    } catch {
      return null;
    }
    const sf = ts.createSourceFile('health-connect.repository.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    let members = null;
    sf.forEachChild(node => {
      if (ts.isTypeAliasDeclaration(node) && node.name.text === 'RepositoryRead') {
        const parts = ts.isUnionTypeNode(node.type) ? node.type.types : [node.type];
        if (parts.every(p => ts.isLiteralTypeNode(p) && ts.isStringLiteral(p.literal))) {
          members = parts.map(p => `${p.literal.text}Read`);
        }
      }
    });
    return members;
  })();

  if (!signalNames || signalNames.length === 0) {
    // Same refusal as mechanism 3's: a derivation that found nothing has checked nothing.
    fail(
      `could not derive the read-state signal names from \`RepositoryRead\` in ${relative('.', readsSource.pathname)} — ` +
        'the type moved or stopped being a union of string literals, so this check is guarding nothing. ' +
        'Fix the derivation; do not let it pass by finding nothing',
    );
  } else {
    // Axis two: where the writes are. Read from the artefact — every emitted chunk that so much as
    // mentions a signal name is parsed. Zero carriers means the names did not survive the build
    // (mangling, a rename, a dropped module), and a check that can no longer see its subject fails.
    const carriers = readdirSync(dist)
      .filter(f => f.endsWith('.js'))
      .map(f => ({ name: f, code: readFileSync(join(dist, f), 'utf8') }))
      .filter(({ code }) => signalNames.some(n => code.includes(n)));

    if (carriers.length === 0) {
      fail(
        `no emitted .js in ${dist} mentions ${signalNames.join(' or ')} — the build no longer carries the ` +
          'read-state signals under the names the source declares, so this check has been blinded and cannot pass',
      );
    } else {
      // The nearest enclosing function that HAS a name. Arrow functions and anonymous function
      // expressions are callbacks — lexically part of whatever named thing holds them — so the walk
      // continues through them; a write that reaches the top without meeting a named function is a
      // violation, not a pass.
      const namedOwnerOf = node => {
        for (let p = node.parent; p; p = p.parent) {
          if ((ts.isMethodDeclaration(p) || ts.isGetAccessorDeclaration(p) || ts.isSetAccessorDeclaration(p)) && ts.isIdentifier(p.name)) {
            return p;
          }
          if (ts.isConstructorDeclaration(p)) {
            return p;
          }
          if ((ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p)) && p.name) {
            return p;
          }
        }
        return null;
      };
      const ownerName = owner => (ts.isConstructorDeclaration(owner) ? 'constructor' : owner.name.text);
      const classOf = node => {
        for (let p = node.parent; p; p = p.parent) {
          if (ts.isClassDeclaration(p) || ts.isClassExpression(p)) {
            return p;
          }
        }
        return null;
      };
      // Does this class create the signal? Either shape the toolchain may emit: a class field with
      // an initialiser, or the downlevelled `this.X = …` assignment in the constructor.
      const classInitialises = (cls, signal) => {
        let found = false;
        const visit = n => {
          if (found) {
            return;
          }
          if (ts.isPropertyDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === signal && n.initializer) {
            found = true;
          } else if (
            ts.isBinaryExpression(n) &&
            n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            ts.isPropertyAccessExpression(n.left) &&
            n.left.name.text === signal &&
            n.left.expression.kind === ts.SyntaxKind.ThisKeyword
          ) {
            found = true;
          } else {
            ts.forEachChild(n, visit);
          }
        };
        visit(cls);
        return found;
      };

      const sitesPerSignal = new Map(signalNames.map(n => [n, 0]));
      const violations = [];
      let totalSites = 0;

      for (const { name, code } of carriers) {
        const sf = ts.createSourceFile(name, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
        const sites = [];
        const visit = node => {
          if (
            ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression) &&
            WRITERS.has(node.expression.name.text) &&
            ts.isPropertyAccessExpression(node.expression.expression) &&
            signalNames.includes(node.expression.expression.name.text)
          ) {
            sites.push({ signal: node.expression.expression.name.text, node });
          }
          ts.forEachChild(node, visit);
        };
        visit(sf);

        if (sites.length === 0) {
          continue; // a carrier that only READS the signals; the vacuity guard below still applies globally
        }
        totalSites += sites.length;

        const owners = new Set();
        for (const site of sites) {
          sitesPerSignal.set(site.signal, sitesPerSignal.get(site.signal) + 1);
          const owner = namedOwnerOf(site.node);
          if (owner === null) {
            violations.push(`${name}: a write to ${site.signal} outside any named function at all`);
          } else {
            owners.add(owner);
          }
        }
        // ONE owner node, not "every owner is so named": two methods both called `loadAll` — one of
        // them somewhere else, reaching in by cast — must redden, and a name test alone would not.
        if (owners.size > 1) {
          violations.push(
            `${name}: writes to the read-state signals in ${owners.size} different functions ` +
              `(${[...owners].map(ownerName).join(', ')}) — a read state may only be set by the read itself`,
          );
        } else if (owners.size === 1) {
          const [owner] = owners;
          if (ownerName(owner) !== OWNING_METHOD) {
            violations.push(`${name}: the read-state signals are written in \`${ownerName(owner)}\`, not \`${OWNING_METHOD}\``);
          } else {
            const cls = classOf(owner);
            if (cls === null) {
              violations.push(`${name}: the \`${OWNING_METHOD}\` holding the writes is not a class method`);
            } else {
              for (const signal of signalNames) {
                if (!classInitialises(cls, signal)) {
                  violations.push(
                    `${name}: the \`${OWNING_METHOD}\` holding the writes lives in a class that never initialises ` +
                      `\`${signal}\` — it is not the repository's own read, whatever it is called`,
                  );
                }
              }
            }
          }
        }
      }

      // The vacuity guard: a signal with no write site anywhere is not a clean bill, it is a read
      // that never announces its state — or a rename this check did not follow. Both are red.
      for (const [signal, count] of sitesPerSignal) {
        if (count === 0) {
          violations.push(
            `no write to \`${signal}\` anywhere in the bundle — either the read no longer announces its state, ` +
              'or the signal was renamed and this check is now watching a name that nothing uses',
          );
        }
      }

      if (violations.length) {
        for (const v of violations) {
          fail(v);
        }
      } else {
        pass(
          `${totalSites} writes to ${signalNames.join(' and ')} in ${carriers.map(c => c.name).join(', ')}, ` +
            `every one inside \`${OWNING_METHOD}\` of the class that owns the signals`,
        );
      }
    }
  }
}

process.exit(failed ? 1 : 0);
