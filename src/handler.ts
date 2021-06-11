import Toucan from "toucan-js";

const REQUIRED_KEYS = ["country", "timezone"];

export async function handleRequestWrapper(
  request: Request,
  sentry: Toucan
): Promise<Response> {
  try {
    return await handleRequest(request, sentry);
  } catch (e) {
    sentry.captureException(e);
    return new Response(e, { status: 500 });
  }
}

export async function handleRequest(request: Request, sentry: Toucan) {
  const requestUrl = new URL(request.url);

  if (!requestUrl.pathname.startsWith("/v1")) {
    // Redirect non /v1 paths to the repository
    return Response.redirect(
      "https://github.com/home-assistant/whoami.home-assistant.io",
      301
    );
  }

  sentry.setUser({ id: request.headers.get("cf-request-id") });
  sentry.setExtra("requestUrl", {
    protocol: requestUrl.protocol,
    pathname: requestUrl.pathname,
    url: requestUrl,
  });

  const date = new Date();

  const httpResponse: Map<string, any> = new Map(
    Object.entries({
      timezone: request.cf.timezone,
      iso_time: date.toISOString(),
      timestamp: Math.round(date.getTime() / 1000),
    })
  );

  const httpsResponse: Map<string, any> = new Map(
    Object.entries({
      ip: request.headers.get("CF-Connecting-IP"),
      city: request.cf.city,
      continent: request.cf.continent,
      country: request.cf.country,
      latitude: request.cf.latitude,
      longitude: request.cf.longitude,
      postal_code: request.cf.postalCode,
      region_code: request.cf.regionCode,
      region: request.cf.region,
      ...Object.fromEntries(httpResponse),
    })
  );

  sentry.setExtras(Object.fromEntries(httpsResponse));

  const requestedKey = requestUrl.pathname.startsWith("/v1/")
    ? requestUrl.pathname.substr(4)
    : undefined;

  if (requestedKey !== undefined) {
    if (httpsResponse.has(requestedKey)) {
      if (requestUrl.protocol === "http:" && !httpResponse.has(requestedKey)) {
        throw new Error("Requested key not allowed for http");
      }
      return new Response(httpsResponse.get(requestedKey), {
        headers: { "content-type": "text/html;charset=UTF-8" },
      });
    }
    throw new Error(`The requested key "${requestedKey}" is not valid`);
  }

  httpsResponse.forEach((value, key) => {
    if (REQUIRED_KEYS.includes(key) && value === undefined) {
      throw new Error(`Value for required key "${key}" is undefined`);
    }
  });

  return new Response(
    JSON.stringify(
      Object.fromEntries(
        requestUrl.protocol === "http:" ? httpResponse : httpsResponse
      ),
      null,
      2
    ),
    {
      headers: {
        "content-type": "application/json;charset=UTF-8",
      },
    }
  );
}
