// These constants are injected via webpack DefinePlugin variables.
// You can add more variables in webpack.common.js or in profile specific webpack.<dev|prod>.js files.
// If you change the values in the webpack config files, you need to re run webpack to update the application

declare const __DEBUG_INFO_ENABLED__: boolean;
declare const __VERSION__: string;
declare const __RUM_ENDPOINT__: string;
declare const __RIBBON_ENV__: string;

export const VERSION = __VERSION__;
export const DEBUG_INFO_ENABLED = __DEBUG_INFO_ENABLED__;

/**
 * Where browser telemetry is posted, or '' to disable it entirely (development builds).
 *
 * A relative path on purpose: it resolves against the origin serving the page, which is what keeps
 * the export same-origin and free of CORS preflights.
 *
 * Note this is NOT derived from DEBUG_INFO_ENABLED. That constant is hardcoded `true` in
 * webpack/environment.js, so it is true in production builds as well and is useless as a
 * production switch — which is exactly the sort of thing that looks like it works.
 */
export const RUM_ENDPOINT = __RUM_ENDPOINT__;

/**
 * The environment ribbon to draw, or '' for none.
 *
 * Build-time, because the browser has no business asking the server which profiles are active. This
 * replaced a `GET /management/info` the SPA made on every page load: a management endpoint, which
 * the production nginx returns 404 for precisely so it is not reachable from a browser — so the
 * call returned nothing usable there and the SPA threw reading `activeProfiles` of null.
 *
 * Same reasoning as {@link RUM_ENDPOINT}, and deliberately not derived from `DEBUG_INFO_ENABLED`
 * for the same reason: that constant is hardcoded true and is true in production builds too.
 */
export const RIBBON_ENV = __RIBBON_ENV__;
