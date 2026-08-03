/**
 * Browser real-user monitoring for the professional dashboard.
 *
 * Emits OTLP spans over HTTP to the same origin the page was served from, where nginx forwards
 * them to this host's OpenTelemetry collector. Traces only: no metrics and no logs, because the
 * collector's browser pipeline exports to Tempo alone and its ingestion path only exposes
 * /v1/traces. See the monitoring repo's production/services/configs/otel-collector.yml.
 *
 * WHAT THIS PRODUCES
 *   - one span per initial page load (document load, including resource timings)
 *   - one span per client-side route change
 *   - one span per fetch/XHR call, carrying `traceparent` so it JOINS the gateway's server span —
 *     which is the whole point: "this page was slow" becomes "this page was slow because this
 *     endpoint was", in one trace.
 *   - one span per uncaught error or unhandled rejection, carrying the exception
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *   - no web-vitals metrics. Every such metric carries browser and route attributes, and Mimir on
 *     this host already has an ActiveSeriesGrowing alert for a reason.
 *   - no user identifiers of any kind. This is a clinical application and Tempo here has no
 *     per-user access control: anyone who can reach Grafana can read every span. The collector
 *     additionally strips query strings server-side, so a mistake here is caught there too.
 */
import { context, trace, SpanStatusCode, Span } from '@opentelemetry/api';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { RUM_ENDPOINT, VERSION } from 'app/app.constants';

export const RUM_SERVICE_NAME = 'hc-professional-web';
const TRACER_NAME = 'hc-professional-web';

let tracerProvider: WebTracerProvider | undefined;

/**
 * Sets up the browser SDK. Call once, before Angular bootstraps, so that the document-load
 * instrumentation still sees the navigation timings it needs.
 *
 * A no-op when RUM_ENDPOINT is empty, which is how development builds are kept silent — see
 * webpack/webpack.custom.js. Never throws: telemetry failing to start must not stop the
 * application from starting.
 */
export function initRum(): void {
  if (!RUM_ENDPOINT || tracerProvider) {
    return;
  }

  try {
    const exporter = new OTLPTraceExporter({
      // Same origin as the page, so the browser sends no CORS preflight and nginx needs no
      // Access-Control-Allow-Origin. A absolute URL here would turn every export into a
      // preflight + POST pair.
      url: RUM_ENDPOINT,
    });

    tracerProvider = new WebTracerProvider({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: RUM_SERVICE_NAME,
        [ATTR_SERVICE_VERSION]: VERSION,
      }),
      spanProcessors: [
        new BatchSpanProcessor(exporter, {
          // Deliberately lazy. The nginx rate limit in front of the collector is 2 r/s per source
          // address, so a chatty tab would spend its own budget and start getting 503s; batching
          // every 5s keeps a normal session far inside that and costs nothing but freshness.
          scheduledDelayMillis: 5000,
          maxExportBatchSize: 64,
          maxQueueSize: 256,
        }),
      ],
    });

    tracerProvider.register({
      // zone.js is what carries context across Angular's async boundaries. Without this the
      // default context manager loses the active span across an await or an rxjs subscription,
      // and fetch spans end up parentless — the traces still arrive, but the page-load span no
      // longer links to the API calls it caused, which is most of the value.
      contextManager: new ZoneContextManager(),
    });

    registerInstrumentations({
      tracerProvider,
      instrumentations: [
        new DocumentLoadInstrumentation(),
        new FetchInstrumentation({
          // MUST ignore the exporter's own endpoint. Without this the POST that ships spans is
          // itself traced, which produces a span, which triggers another export, which produces
          // another span — a feedback loop that only stops when the rate limiter starts refusing.
          ignoreUrls: [RUM_ENDPOINT],
          // Same-origin requests get `traceparent` by default, which covers /api and /services on
          // this vhost. Anything cross-origin is left alone on purpose: sending trace headers to a
          // third party leaks internal ids and trips their CORS.
          clearTimingResources: true,
        }),
        new XMLHttpRequestInstrumentation({
          ignoreUrls: [RUM_ENDPOINT],
          clearTimingResources: true,
        }),
      ],
    });

    installErrorHandlers();
  } catch {
    // Swallowed on purpose, and not logged: a failure here is invisible to the user and must stay
    // that way. If RUM is silently absent, Tempo's service list is what tells you — the same check
    // used for the server-side agents.
    tracerProvider = undefined;
  }
}

/** Records an exception as its own short span. */
export function recordRumException(error: unknown, kind: string): void {
  if (!tracerProvider) {
    return;
  }
  const tracer = trace.getTracer(TRACER_NAME);
  const span: Span = tracer.startSpan(kind);
  span.setStatus({ code: SpanStatusCode.ERROR });
  span.recordException(error instanceof Error ? error : new Error(String(error)));
  span.end();
}

/**
 * Uncaught errors and unhandled promise rejections. These are the failures nobody reports: the
 * page half-renders, the user retries or leaves, and the server logs show a clean 200.
 */
function installErrorHandlers(): void {
  window.addEventListener('error', event => {
    recordRumException(event.error ?? event.message, 'browser.uncaught_error');
  });

  window.addEventListener('unhandledrejection', event => {
    recordRumException(event.reason, 'browser.unhandled_rejection');
  });
}

/**
 * Starts a span for a client-side route change. Returned span must be ended by the caller.
 *
 * The span is named for the route TEMPLATE rather than the resolved URL, so that
 * /professionals/:id groups into one operation instead of one per professional — the same reason
 * server-side HTTP spans use http.route. It also keeps identifiers out of the span name, which the
 * collector cannot strip the way it strips query strings.
 */
export function startRouteSpan(routeTemplate: string): Span | undefined {
  if (!tracerProvider) {
    return undefined;
  }
  return trace.getTracer(TRACER_NAME).startSpan(`route ${routeTemplate}`, {}, context.active());
}
