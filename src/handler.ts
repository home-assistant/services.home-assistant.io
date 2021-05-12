export async function handleRequest(request: Request) {
  const requestUrl = new URL(request.url);
  const date = new Date();

  const httpResponse: Map<string, any> = new Map(
    Object.entries({
      continent: request.cf.continent,
      country: request.cf.country,
      timezone: request.cf.timezone,
      iso_time: date.toISOString(),
      timestamp: date.getTime(),
    })
  );

  const httpsResponse: Map<string, any> = new Map(
    Object.entries({
      ip: request.headers.get("CF-Connecting-IP"),
      city: request.cf.city,
      latitude: request.cf.latitude,
      longitude: request.cf.longitude,
      postal_code: request.cf.postalCode,
      region_code: request.cf.regionCode,
      region: request.cf.region,
      ...httpResponse,
    })
  );

  const requestedKey = requestUrl.pathname.replace("/v1/", "");

  if (!["/v1", "/"].includes(requestedKey)) {
    if (httpsResponse.has(requestedKey)) {
      if (requestUrl.protocol === "http:" && !httpResponse.has(requestedKey)) {
        return new Response(null, { status: 405 });
      }
      return new Response(httpsResponse.get(requestedKey), {
        headers: { "content-type": "text/html;charset=UTF-8" },
      });
    }
    return new Response(`The requested key "${requestedKey} is not valid"`, {
      headers: { "content-type": "text/html;charset=UTF-8" },
      status: 400,
    });
  }

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
