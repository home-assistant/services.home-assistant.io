import { Toucan } from "toucan-js";
import { ServiceError, WorkerEvent } from "./common";
import { assistHandler } from "./services/assist";
import { whoamiHandler } from "./services/whoami";

export async function routeRequest(sentry: Toucan, event: WorkerEvent) {
  let requestUrl = new URL(event.request.url);

  if (requestUrl.host.startsWith("whoami")) {
    // Legacy "rewrite" for old whoami address
    requestUrl = new URL(
      `${requestUrl.protocol}//services.home-assistant.io/whoami${requestUrl.pathname}`
    );
  }

  const service = requestUrl.pathname.split("/")[1];
  sentry.setTag("service", service);
  sentry.setExtra("requestUrl", {
    protocol: requestUrl.protocol,
    pathname: requestUrl.pathname,
    url: requestUrl,
  });

  switch (service) {
    case "whoami":
      return handleRequestWrapper(requestUrl, event, sentry, whoamiHandler);

    case "assist":
      return handleRequestWrapper(requestUrl, event, sentry, assistHandler);

    default:
      return new Response(null, { status: 404 });
  }
}

export async function handleRequestWrapper(
  requestUrl: URL,
  event: WorkerEvent,
  sentry: Toucan,
  serviceHandler: (
    requestUrl: URL,
    event: WorkerEvent,
    sentry: Toucan
  ) => Promise<Response>
): Promise<Response> {
  try {
    return await serviceHandler(requestUrl, event, sentry);
  } catch (err: any) {
    if (!(err instanceof ServiceError)) {
      err = new ServiceError(err.message);
    }
    sentry.addBreadcrumb({ message: err.message });
    const captureId = sentry.captureException(err);

    let returnBody: string;
    const headers: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
    };

    if ((event.request.headers.get("accept") || "").includes("json")) {
      returnBody = JSON.stringify({ error: err.errorType });
      headers["content-type"] = "application/json;charset=UTF-8";
    } else {
      returnBody = `Error: ${err.errorType}`;
    }

    console.error(`[${err.code}] ${returnBody} (${captureId})`);

    return new Response(returnBody, {
      status: err.code,
      headers,
    });
  }
}
