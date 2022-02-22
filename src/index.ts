import Toucan from "toucan-js";
import { handleRequestWrapper } from "./common";
import { whoamiHandler } from "./whoami";

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
  const sentry = sentryClient(event);
  let requestUrl = new URL(event.request.url);

  if (requestUrl.host.startsWith("whoami")) {
    // Legacy "rewrite" for old whoami address
    requestUrl = new URL(
      `${requestUrl.protocol}//services.home-assistant.io/whoami${requestUrl.pathname}`
    );
  }

  const service = requestUrl.pathname.split("/")[1];
  sentry.setTag("service", service);

  switch (service) {
    case "whoami":
      event.respondWith(
        handleRequestWrapper(requestUrl, event.request, sentry, whoamiHandler)
      );
      break;

    default:
      event.respondWith(new Response(null, { status: 405 }));
  }
});
