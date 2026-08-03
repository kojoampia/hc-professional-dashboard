import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import AppComponent from './app/app.component';

import { DEBUG_INFO_ENABLED } from './app/app.constants';
import { initRum } from './app/core/telemetry/rum';

// disable debug data on prod profile to improve performance
if (!DEBUG_INFO_ENABLED) {
  enableProdMode();
}

// Before bootstrapApplication, not after: the document-load instrumentation reads the browser's
// navigation timings, and registering it once Angular is already running means the initial page
// load — the slowest and most interesting one — is never recorded. A no-op in development builds.
initRum();

bootstrapApplication(AppComponent, appConfig)
  // eslint-disable-next-line no-console
  .then(() => console.log('Application started'))
  .catch(err => console.error(err));
