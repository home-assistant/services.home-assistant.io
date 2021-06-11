import Toucan from "toucan-js";
import { handleRequestWrapper } from "./handler";

declare global {
  const SENTRY_DSN: string;
  const WORKER_ENV: string;
}

const sentryClient = (event: FetchEvent | ScheduledEvent) => {
  const client = new Toucan({
    dsn: SENTRY_DSN,
    allowedHeaders: ["user-agent"],
    event,
    environment: WORKER_ENV,
  });
  return client;
};

addEventListener("fetch", (event: FetchEvent) => {
  if (event.request.method === "GET") {
    event.respondWith(handleRequestWrapper(event.request, sentryClient(event)));
  } else {
    event.respondWith(new Response(null, { status: 405 }));
  }
});
