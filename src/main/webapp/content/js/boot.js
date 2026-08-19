// Boot shims that must run before the application bundles.
//
// THIS LIVES IN A FILE RATHER THAN IN index.html BECAUSE OF THE CONTENT-SECURITY-POLICY. It was an
// inline <script>, which any policy worth having blocks: `script-src 'self'` permits a file served
// from this origin and refuses an inline block, and adding 'unsafe-inline' to allow it would give
// up most of what the policy is for. Served from content/js/, so it is 'self'.
//
// Loaded as a classic (non-module) script from <head>, so it executes before the deferred module
// bundles Angular injects at the end of <body>. Both shims below depend on that ordering.

// sockjs-client expects a `global`, which does not exist in a browser. It is a real dependency here
// — the websocket path uses it — so this shim cannot simply be deleted along with the inline block.
var global = window;

// If the bundle has not booted within four seconds, reveal the static error panel in index.html.
// Without this a failed load leaves a blank page, which is indistinguishable from a slow one.
window.onload = function () {
  setTimeout(showError, 4000);
};

function showError() {
  var errorElm = document.getElementById('jhipster-error');
  if (errorElm && errorElm.style) {
    errorElm.style.display = 'block';
  }
}
