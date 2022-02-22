import { sentryClient } from "./common";
import { routeRequest } from "./router";

declare global {
  const SENTRY_DSN: string;
  const WORKER_ENV: string;
}

addEventListener("fetch", (event: FetchEvent) => {
  const sentry = sentryClient(event);
  event.respondWith(routeRequest(sentry, event));
});
