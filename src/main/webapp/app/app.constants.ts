// These constants are injected via webpack DefinePlugin variables.
// You can add more variables in webpack.common.js or in profile specific webpack.<dev|prod>.js files.
// If you change the values in the webpack config files, you need to re run webpack to update the application

declare const __DEBUG_INFO_ENABLED__: boolean;
declare const __VERSION__: string;
declare const __RUM_ENDPOINT__: string;

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
