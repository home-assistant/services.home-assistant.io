import { sentryClient } from "./common";
import { routeRequest } from "./router";

declare global {
  const SENTRY_DSN: string;
  const WORKER_ENV: string;
  const MAILERLITE_API_KEY: string;
}

addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(routeRequest(sentryClient(event), event));
});
