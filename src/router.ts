import Toucan from "toucan-js";
import { ServiceError } from "./common";
import { newsletterHandler } from "./services/newsletter";
import { whoamiHandler } from "./services/whoami";

export async function routeRequest(sentry: Toucan, event: FetchEvent) {
  let requestUrl = new URL(event.request.url);

  if (requestUrl.host.startsWith("whoami")) {
    // Legacy "rewrite" for old whoami address
    requestUrl = new URL(
      `${requestUrl.protocol}//services.home-assistant.io/whoami${requestUrl.pathname}`
    );
  }

  const service = requestUrl.pathname.split("/")[1];
  sentry.setTag("service", service);
  sentry.setExtra("requestId", event.request.headers.get("cf-request-id"));
  sentry.setExtra("requestUrl", {
    protocol: requestUrl.protocol,
    pathname: requestUrl.pathname,
    url: requestUrl,
  });

  switch (service) {
    case "whoami":
      return handleRequestWrapper(
        requestUrl,
        event.request,
        sentry,
        whoamiHandler
      );

    case "newsletter":
      return handleRequestWrapper(
        requestUrl,
        event.request,
        sentry,
        newsletterHandler
      );

    default:
      return new Response(null, { status: 404 });
  }
}

export async function handleRequestWrapper(
  requestUrl: URL,
  request: Request,
  sentry: Toucan,
  serviceHandler: (
    requestUrl: URL,
    request: Request,
    sentry: Toucan
  ) => Promise<Response>
): Promise<Response> {
  try {
    return await serviceHandler(requestUrl, request, sentry);
  } catch (err) {
    if (!(err instanceof ServiceError)) {
      err = new ServiceError(err.message);
    }
    sentry.addBreadcrumb({ message: err.message });
    sentry.captureException(err);
    return new Response(err.errorType, {
      status: err.code,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}
