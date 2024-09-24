import { Toucan } from "toucan-js";
import { ServiceError, WorkerEvent } from "../common";
import { countryCurrency } from "../data/currency";

const REQUIRED_KEYS = ["country", "timezone"];
const countryTimeZoneFallback: Map<string, string> = new Map([
  ["CN", "Asia/Shanghai"],
]);

export enum WhoamiErrorType {
  UNEXPECTED = "unexpected",
  MISSING_KEY_VALUE = "missing_key_value",
  NOT_VALID = "not_valid",
  NOT_ALLOWED = "not_allowed",
}

export async function whoamiHandler(
  requestUrl: URL,
  event: WorkerEvent,
  sentry: Toucan
): Promise<Response> {
  const { request } = event;
  if (request.method !== "GET") {
    return new Response(null, { status: 405 });
  }

  if (!requestUrl.pathname.startsWith("/whoami/v1")) {
    // Redirect non /v1 paths to the repository
    return Response.redirect(
      "https://github.com/home-assistant/services.home-assistant.io",
      301
    );
  }

  if (!request.cf) {
    return new Response(null, { status: 400 });
  }

  const date = new Date();
  const httpResponse: Map<string, any> = new Map(
    Object.entries({
      timezone:
        request.cf.timezone ||
        (request.cf.country &&
          countryTimeZoneFallback.get(request.cf.country)) ||
        undefined,
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
      currency:
        (request.cf.country && countryCurrency[request.cf.country]) || null,
      latitude: request.cf.latitude,
      longitude: request.cf.longitude,
      postal_code: request.cf.postalCode,
      region_code: request.cf.regionCode,
      region: request.cf.region,
      ...Object.fromEntries(httpResponse),
    })
  );

  sentry.setExtras(Object.fromEntries(httpsResponse));

  const requestedKey = requestUrl.pathname.startsWith("/whoami/v1/")
    ? requestUrl.pathname.substr(11)
    : undefined;

  if (requestedKey !== undefined) {
    if (httpsResponse.has(requestedKey)) {
      if (requestUrl.protocol === "http:" && !httpResponse.has(requestedKey)) {
        throw new ServiceError(
          "Requested key not allowed for http",
          WhoamiErrorType.NOT_ALLOWED,
          405
        );
      }
      return new Response(httpsResponse.get(requestedKey), {
        headers: {
          "content-type": "text/html;charset=UTF-8",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    throw new ServiceError(
      `The requested key "${requestedKey}" is not valid`,
      WhoamiErrorType.NOT_VALID,
      405
    );
  }

  httpsResponse.forEach((value, key) => {
    if (REQUIRED_KEYS.includes(key) && value === undefined) {
      throw new ServiceError(
        `Value for required key "${key}" is undefined`,
        WhoamiErrorType.MISSING_KEY_VALUE
      );
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
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
